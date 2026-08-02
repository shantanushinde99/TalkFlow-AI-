# System Patterns

## System Architecture
The application is structured into a Python backend and a React frontend, communicating in real-time via LiveKit.

### Components
1. **Frontend (React)**: Uses LiveKit React Components to display the Beyond Presence Avatar, current status (Listening/Thinking/Speaking), active topic, remaining time, and final evaluation report.
2. **Backend (Python)**: Orchestrates the LiveKit Agent and connects the various AI services.

## Key Technical Decisions
- **Transport**: LiveKit WebRTC handles real-time audio/video and data transport.
- **State**: In-memory Python dictionary per session (destroyed on end).
- **Streaming Pipeline**: To achieve low latency, the system relies entirely on streaming APIs for STT (Deepgram), LLM (Groq), and TTS (ElevenLabs).
- **Avatar Integration**: Handled via the LiveKit Avatar Plugin using Beyond Presence (Avatar ID: `694c83e2-8895-4a98-bd16-56332ca3f449`).

## Voice Pipeline Path
`User Audio` -> `LiveKit` -> `Deepgram Streaming STT` -> `Groq Streaming LLM` -> `ElevenLabs Streaming TTS` -> `Beyond Presence Avatar` -> `LiveKit Room`

## Component Relationships (Backend structure)
- `main.py`: Entry point for the application.
- `agent.py`: LiveKit agent lifecycle and event handling.
- `session.py`: In-memory state management.
- `interviewer.py`: Logic for adaptive questioning.
- `evaluator.py`: Logic for communication tracking and final report generation.
- `prompts.py`: LLM system prompts and templates.
- `avatar.py`: Beyond Presence integration.
- `speech.py`: Deepgram and ElevenLabs wrappers.
- `llm.py`: Groq interaction.
