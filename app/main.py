import os
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)  # Bulletproof load for IPC child processes

import json
import logging
import asyncio

from livekit.agents import AgentServer, cli, JobContext, AutoSubscribe
from livekit.agents.voice import Agent
from livekit.agents import AgentSession
from livekit.plugins import groq, openai, deepgram, elevenlabs, bey, silero

from .config import AVATAR_ID
from .session import Session
from .prompts import SYSTEM_PROMPT, EVALUATION_PROMPT

logger = logging.getLogger("interviewer")

server = AgentServer()

@server.rtc_session()
async def entrypoint(ctx: JobContext):
    """Main entrypoint for the LiveKit agent."""
    logger.info("Job received! Starting agent session...")

    session = Session()

    # Connect to room
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info("Connected to room: %s", ctx.room.name)

    # Extract topic from user participant metadata
    topic = "General"
    for p in ctx.room.remote_participants.values():
        if p.metadata:
            try:
                meta = json.loads(p.metadata)
                if "topic" in meta:
                    topic = meta["topic"]
            except Exception as e:
                logger.warning("Could not parse participant metadata: %s", e)

    logger.info("Interview Topic: %s", topic)

    # Setup the agent and agent session (Direct Mistral API for live conversation)
    agent_session = AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(),
        llm=openai.LLM(
            model="mistral-small-latest",
            base_url="https://api.mistral.ai/v1",
            api_key=os.environ.get("MISTRAL_API_KEY"),
        ),
        tts=deepgram.TTS(model="aura-2-delia-en"),
    )

    # Add topic context to system prompt
    custom_instructions = f"{SYSTEM_PROMPT}\n\nThe candidate has chosen to be interviewed on the following topic: {topic}. Please start the interview by mentioning this topic."
    agent = Agent(instructions=custom_instructions)

    # Start the agent session
    await agent_session.start(agent=agent, room=ctx.room)
    logger.info("Agent session started.")

    # Initialize and start Beyond Presence Avatar (with graceful fallback if quota/API fails)
    try:
        avatar = bey.AvatarSession(avatar_id=AVATAR_ID)
        await avatar.start(agent_session, room=ctx.room)
        logger.info("Avatar started successfully.")
    except Exception as e:
        logger.warning("Beyond Presence Avatar failed to start (Audio voice agent will continue): %s", e)

    # Wait for the frontend to send the "start" signal
    start_future = asyncio.Future()

    from livekit.agents import llm as agents_llm

    session_ended = False

    async def generate_and_send_report():
        logger.info("Generating report...")
        # Build transcript from conversation history
        transcript = ""
        messages = agent_session.history.messages() if hasattr(agent_session.history, "messages") and callable(agent_session.history.messages) else []
        for msg in messages:
            role = getattr(msg, "role", "unknown")
            if role != "system":
                text = getattr(msg, "text", "") or ""
                if not text and hasattr(msg, "content"):
                    content = msg.content
                    if isinstance(content, list):
                        text = " ".join([c.text for c in content if hasattr(c, "text") and c.text])
                    elif isinstance(content, str):
                        text = content
                if text and text.strip():
                    transcript += f"{role.capitalize()}: {text.strip()}\n"
        
        logger.info("Captured transcript length: %d chars", len(transcript))
        logger.debug("Transcript content:\n%s", transcript)

        report_ctx = agents_llm.ChatContext()
        report_ctx.add_message(
            role="user",
            content=EVALUATION_PROMPT.format(topic=topic, transcript=transcript)
        )
        
        try:
            llm_inst = groq.LLM(model="openai/gpt-oss-120b", api_key=os.environ.get("GROQ_API_KEY"))
            stream = llm_inst.chat(chat_ctx=report_ctx)
            
            report_text = ""
            async for chunk in stream:
                if chunk.delta and chunk.delta.content:
                    report_text += chunk.delta.content
            
            logger.info("Report generated successfully.")
            payload = json.dumps({"type": "report", "content": report_text}).encode("utf-8")
            await ctx.room.local_participant.publish_data(payload, reliable=True)
            
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            payload = json.dumps({"type": "report", "content": "Failed to generate AI report due to an error."}).encode("utf-8")
            await ctx.room.local_participant.publish_data(payload, reliable=True)

    async def end_session_flow(is_timeout=False):
        nonlocal session_ended
        if session_ended:
            return
        session_ended = True
        
        if is_timeout:
            logger.info("Session time is up.")
            agent_session.say(
                "Our 10 minutes are up. Thank you for the discussion! I am generating your evaluation report now.",
                allow_interruptions=False,
            )
            await asyncio.sleep(8)
        else:
            logger.info("Session ended early by user.")
            agent_session.say(
                "Thank you for the discussion! I am generating your evaluation report now.",
                allow_interruptions=False,
            )
            await asyncio.sleep(5)
            
        await generate_and_send_report()
        await asyncio.sleep(2)
        await ctx.room.disconnect()

    @ctx.room.on("data_received")
    def on_data_received(data_packet):
        try:
            msg = json.loads(data_packet.data.decode("utf-8"))
            if msg.get("type") == "start_interview":
                if not start_future.done():
                    start_future.set_result(True)
            elif msg.get("type") == "end_session":
                asyncio.create_task(end_session_flow(is_timeout=False))
        except Exception as e:
            pass

    logger.info("Waiting for user to click Begin Interview...")
    await start_future
    logger.info("Start signal received! Beginning interview.")

    # Say hello initially
    agent_session.say(
        f"Hi! Today we'll have a discussion on {topic}. "
        "I'll ask you questions to understand your knowledge and communication skills. "
        "There are no trick questions, so just explain your thinking as clearly as you can. "
        "Let's begin. Could you briefly explain what you know about this topic?",
        allow_interruptions=True,
    )

    # 10-minute session timeout starts NOW
    async def session_timeout():
        await asyncio.sleep(600)
        await end_session_flow(is_timeout=True)

    timeout_task = asyncio.create_task(session_timeout())


if __name__ == "__main__":
    cli.run_app(server)
