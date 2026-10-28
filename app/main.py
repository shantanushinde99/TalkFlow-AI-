import os
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)  # Bulletproof load for IPC child processes

import asyncio
import json
import logging

from livekit import rtc
from livekit.agents import AgentServer, AgentSession, AutoSubscribe, JobContext, JobProcess, cli
from livekit.agents.voice import Agent
from livekit.plugins import bey, deepgram, elevenlabs, groq, silero

from app.evaluator import collect_transcript, generate_report
from app.prompts import SYSTEM_PROMPT
from app.session import SESSION_SECONDS, Session

logger = logging.getLogger("interviewer")

AVATAR_ID = "694c83e2-8895-4a98-bd16-56332ca3f449"
CONVERSATION_MODEL = "llama-3.3-70b-versatile"


def prewarm(proc: JobProcess) -> None:
    """Load the VAD model once per worker process instead of once per interview."""
    proc.userdata["vad"] = silero.VAD.load()


server = AgentServer()
server.setup_fnc = prewarm


def build_tts():
    """ElevenLabs per the MVP spec; Deepgram Aura when no ElevenLabs key is configured."""
    key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_API_KEY")
    if key:
        return elevenlabs.TTS(api_key=key)
    logger.warning("ELEVENLABS_API_KEY not set, falling back to Deepgram TTS")
    return deepgram.TTS(model="aura-2-delia-en")


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    """One interview: wait for the candidate, interview for 10 minutes, publish the report."""
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    candidate = await ctx.wait_for_participant()

    try:
        topic = json.loads(candidate.metadata or "{}").get("topic") or "General"
    except json.JSONDecodeError:
        topic = "General"
    session = Session(topic=topic)
    logger.info("Interview topic: %s", topic)

    agent_session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(),
        llm=groq.LLM(model=CONVERSATION_MODEL),
        tts=build_tts(),
        # Give candidates room to pause mid-explanation without being cut off.
        turn_handling={"endpointing": {"min_delay": 0.8}},
    )

    @agent_session.on("user_input_transcribed")
    def on_transcript(ev):
        if ev.is_final:
            session.add_user_text(ev.transcript)

    @agent_session.on("user_state_changed")
    def on_user_state(ev):
        if ev.new_state == "speaking":
            session.user_speaking(ev.created_at)
        elif ev.old_state == "speaking":
            session.user_stopped(ev.created_at)

    @agent_session.on("agent_state_changed")
    def on_agent_state(ev):
        if ev.new_state == "listening" and ev.old_state == "speaking":
            session.agent_listening(ev.created_at)

    ending = False

    async def finish(closing_line: str):
        nonlocal ending
        if ending:
            return
        ending = True
        # Stop listening and answering; the interview is over.
        agent_session.input.set_audio_enabled(False)
        agent_session.interrupt()
        try:
            await agent_session.say(closing_line, allow_interruptions=False)
        except Exception as e:
            logger.warning("Closing line failed: %s", e)

        try:
            transcript = collect_transcript(agent_session.history, session)
            report = await generate_report(session, transcript)
        except Exception as e:
            logger.exception("Report generation failed: %s", e)
            report = "# Interview Evaluation Report\n\nSorry, the report could not be generated. Please try another session."

        await ctx.room.local_participant.publish_data(
            json.dumps({"type": "report", "content": report}).encode("utf-8"), reliable=True
        )
        await asyncio.sleep(2)  # let the report reach the client before leaving
        ctx.shutdown("interview finished")

    # Registered before the slow startup below (session + avatar) so the start signal can't be missed.
    started = asyncio.Event()

    @ctx.room.on("data_received")
    def on_data_received(packet: rtc.DataPacket):
        try:
            msg = json.loads(packet.data.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return
        if msg.get("type") == "start_interview":
            started.set()
        elif msg.get("type") == "end_session":
            asyncio.create_task(finish("Thanks for the discussion. Give me a moment while I prepare your evaluation report."))

    instructions = (
        f"{SYSTEM_PROMPT}\n\nThe candidate chose this interview topic: {topic}. "
        "Keep every question within this topic."
    )
    await agent_session.start(agent=Agent(instructions=instructions), room=ctx.room)

    try:
        await bey.AvatarSession(avatar_id=AVATAR_ID).start(agent_session, room=ctx.room)
        logger.info("Avatar started.")
    except Exception as e:
        logger.warning("Beyond Presence avatar failed to start, continuing audio-only: %s", e)

    logger.info("Waiting for the candidate to start...")
    await started.wait()

    agent_session.say(
        f"Hi! Today we'll talk about {topic}. I'll ask questions to understand how you think and how you explain things. "
        "There are no trick questions, so just reason out loud. To start, what do you already know about this topic?",
        allow_interruptions=True,
    )

    async def timeout():
        await asyncio.sleep(SESSION_SECONDS)
        await finish("Our ten minutes are up. Thank you for the discussion. I'm preparing your evaluation report now.")

    timer = asyncio.create_task(timeout())

    async def cancel_timer():
        timer.cancel()

    ctx.add_shutdown_callback(cancel_timer)


if __name__ == "__main__":
    cli.run_app(server)
