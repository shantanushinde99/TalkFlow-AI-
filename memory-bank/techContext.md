# Tech Context

## Technologies & Frameworks
- **Backend Language**: Python (Async/Await)
- **Frontend Framework**: React
- **Realtime Transport**: LiveKit (WebRTC)
- **Speech-to-Text (STT)**: Deepgram Streaming STT
- **Large Language Model (LLM)**: Groq API (Streaming)
- **Text-to-Speech (TTS)**: ElevenLabs Streaming TTS
- **Avatar Provider**: Beyond Presence

## Development Environment Setup
- Python virtual environment (`.venv`) is present.
- Environment variables required: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`, `GROQ_API_KEY`, `BEY_API_KEY`.

## Technical Constraints
- **NO Database**: Do not use PostgreSQL, Redis, MongoDB, etc.
- **Latency**: Must use streaming APIs to ensure a conversational feel.
- **Time Limit**: Hard 10-minute limit enforced on the session.

## Dependencies (Expected)
- `livekit-agents`
- `livekit-plugins-deepgram` (or direct Deepgram SDK)
- `livekit-plugins-elevenlabs` (or direct ElevenLabs SDK)
- `livekit-plugins-bey` (Beyond Presence)
- `openai` (for Groq compatibility if used, or Groq SDK)
- React LiveKit SDKs for frontend.
