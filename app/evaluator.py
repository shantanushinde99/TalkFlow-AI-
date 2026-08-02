from livekit.plugins import groq
from .prompts import EVALUATION_PROMPT
from .session import Session

class Evaluator:
    def __init__(self):
        self.llm = groq.LLM(model="openai/gpt-oss-120b")

    async def generate_report(self, session: Session) -> str:
        transcript = ""
        for turn in session.conversation:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            transcript += f"{role}: {content}\n"
        
        prompt = EVALUATION_PROMPT.format(transcript=transcript)
        
        response = await self.llm.chat(
            messages=[{"role": "user", "content": prompt}]
        )
        # Handle LiveKit LLM response stream/text depending on LiveKit API
        # LLM.chat usually returns a ChatChunk stream or we can just gather it
        full_text = ""
        async for chunk in response:
            full_text += chunk.delta.content or ""
            
        return full_text
