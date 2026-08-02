import os
from dotenv import load_dotenv

load_dotenv()

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
BEY_API_KEY = os.getenv("BEY_API_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

# Beyond Presence Avatar ID
AVATAR_ID = "694c83e2-8895-4a98-bd16-56332ca3f449"
