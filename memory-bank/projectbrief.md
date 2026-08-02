# Project Brief: AI Listener + Adaptive Technical Interviewer (MVP)

## Core Requirements & Goals
The goal is to build a real-time AI Listener and Adaptive Interviewer. It is NOT a chatbot; it's a voice-first, avatar-driven application that evaluates a user's spoken understanding of technical or trading topics and asks intelligent follow-up questions.

Key constraints and features for this MVP:
- **Duration**: Hard limit of 10-minute interview sessions.
- **State Management**: Completely stateless beyond the current session (no database, no user accounts, no persistent memory). All state is kept in RAM.
- **Workflow**: Listen → Understand → Evaluate → Ask One Question → Listen Again → Adapt.
- **Output**: At the end of the session, a final report is generated containing technical, communication, and confidence scores, along with strong/weak concepts and recommendations.
- **Interaction**: The AI does not answer first, never lectures, and only asks one question at a time. Difficulty adapts based on user answers.

## Scope
The MVP covers:
- Python backend using LiveKit Agents.
- Streaming STT (Deepgram) and TTS (ElevenLabs).
- Fast LLM inference (Groq).
- Avatar integration via Beyond Presence.
- A React frontend using LiveKit components.
