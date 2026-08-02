import logging
import asyncio
from livekit.agents import AutoSubscribe, JobContext
from livekit.agents.voice import Agent
from livekit.agents import AgentSession
from livekit.plugins import groq, openai, deepgram, elevenlabs, bey, silero

import os
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)  # Bulletproof load for IPC child processes
from .session import Session
from .prompts import SYSTEM_PROMPT
from .config import AVATAR_ID
from .evaluator import Evaluator

logger = logging.getLogger("interviewer")


async def entrypoint(ctx: JobContext):
    """Main entrypoint for the LiveKit agent."""
    # Setup initial session context
    session = Session()

    # Connect to room
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Initialize Beyond Presence Avatar
    avatar = bey.AvatarSession(
        avatar_id=AVATAR_ID
    )

    # Setup the agent and agent session
    agent_session = AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(),
        llm=openai.LLM(
            model="mistral-small-latest",
            base_url="https://api.mistral.ai/v1",
            api_key=os.environ.get("MISTRAL_API_KEY"),
        ),
        tts=deepgram.TTS(model="aura-2-helena-en"),
    )

    agent = Agent(instructions=SYSTEM_PROMPT)

    # Start the agent session and the avatar (with fallback)
    await agent_session.start(agent=agent, room=ctx.room)
    try:
        await avatar.start(agent_session, room=ctx.room)
    except Exception as e:
        logger.warning("Beyond Presence Avatar failed to start: %s", e)

    # Say hello initially
    agent_session.say(
        "Hello! I am your AI interviewer. What topic would you like to discuss today?",
        allow_interruptions=True,
    )

    # Simple timeout task
    async def session_timeout():
        await asyncio.sleep(session.remaining_time)
        logger.info("Session time is up.")
        agent_session.say(
            "Our 10 minutes are up. Let me generate your final evaluation report.",
            allow_interruptions=False,
        )

        # Gather context from conversation history
        try:
            history = agent_session.history
            for item in history:
                role = item.role if hasattr(item, "role") else "unknown"
                content = ""
                if hasattr(item, "content"):
                    for c in item.content:
                        if hasattr(c, "text"):
                            content += c.text
                if role in ("user", "assistant") and content:
                    session.conversation.append({"role": role, "content": content})
        except Exception as e:
            logger.warning(f"Could not gather history: {e}")

        evaluator = Evaluator()
        report = await evaluator.generate_report(session)
        logger.info(f"Final Report:\n{report}")

        await ctx.room.disconnect()

    asyncio.create_task(session_timeout())
