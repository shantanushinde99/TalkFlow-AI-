"""Final report generation from the interview transcript."""
import logging

from livekit.agents import llm
from livekit.plugins import groq

from app.prompts import EVALUATION_PROMPT
from app.session import Session

logger = logging.getLogger("interviewer")

EVALUATION_MODEL = "openai/gpt-oss-120b"


def collect_transcript(history: llm.ChatContext, session: Session) -> str:
    """Copy user/assistant turns from the agent history into the session and return them as text."""
    session.conversation = [
        {"role": m.role, "content": m.text_content.strip()}
        for m in history.messages()
        if m.role in ("user", "assistant") and m.text_content and m.text_content.strip()
    ]
    return "\n".join(
        f"{'Candidate' if t['role'] == 'user' else 'Interviewer'}: {t['content']}" for t in session.conversation
    )


async def generate_report(session: Session, transcript: str) -> str:
    """Ask Groq for the Markdown evaluation report."""
    if not any(t["role"] == "user" for t in session.conversation):
        return (
            "# Interview Evaluation Report\n\n"
            "The session ended before you answered any questions, so there is nothing to evaluate yet. "
            "Start a new session and explain your thinking out loud."
        )

    ctx = llm.ChatContext()
    ctx.add_message(
        role="user",
        content=EVALUATION_PROMPT.format(topic=session.topic, transcript=transcript, metrics=session.metrics_summary()),
    )
    report = ""
    async with groq.LLM(model=EVALUATION_MODEL).chat(chat_ctx=ctx) as stream:
        async for chunk in stream:
            if chunk.delta and chunk.delta.content:
                report += chunk.delta.content
    return report
