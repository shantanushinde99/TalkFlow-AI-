# Product Context

## Why this project exists
This project provides an automated, adaptive technical interview experience that mimics a real human interviewer. Traditional chatbots or written quizzes fall short of evaluating true understanding, communication skills, and real-time reasoning.

## Problems it solves
- It allows users to practice technical interviews in a voice-first environment.
- It dynamically evaluates confidence, clarity, logical flow, and other communication metrics.
- It adapts the difficulty of questions on-the-fly based on the user's demonstrated knowledge.
- It provides a comprehensive evaluation report at the end without requiring human intervention.

## How it should work
- The user connects to a web frontend and sees a Beyond Presence avatar.
- A voice conversation begins where the user explains a topic (from supported Technical or Trading domains).
- The AI listens via Deepgram STT, analyzes via Groq LLM, and responds via ElevenLabs TTS lip-synced to the avatar.
- The session has a strict 10-minute timer. Upon completion, it automatically terminates the interview and presents a detailed evaluation report on the frontend.

## User Experience Goals
- **Low Latency**: The pipeline must be fully streaming to minimize latency and feel like a natural conversation.
- **Natural Interaction**: The AI should be friendly, professional, curious, and encouraging.
- **Adaptive**: The interviewer should challenge the user appropriately without overwhelming them or being too easy.
