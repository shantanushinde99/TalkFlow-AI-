# AI Listener + Adaptive Technical Interviewer (MVP)

## Project Goal

Build a **real-time AI Listener and Adaptive Interviewer** using
**Python**, **LiveKit Agents**, **Groq LLM**, **Deepgram Streaming
STT**, **ElevenLabs Streaming TTS**, and a **Beyond Presence Avatar**
integrated through the **LiveKit Avatar Plugin**.

The application is **NOT** a chatbot.

It is a **real-time AI interviewer** that listens to a user's spoken
explanation, evaluates their understanding, and continuously asks
intelligent follow-up questions based on their knowledge level.

The entire interaction is voice-first and avatar-driven.

The MVP is intentionally limited to **10-minute interview sessions**.

-   No authentication
-   No database
-   No user accounts
-   No persistent memory

Everything exists only for the current session.

------------------------------------------------------------------------

# Official Documentation

Follow these documentation sources exactly.

## LiveKit

-   https://docs.livekit.io/intro/overview/
-   https://docs.livekit.io/agents/
-   https://docs.livekit.io/agents/models/avatar/plugins/bey/

## Deepgram

-   https://developers.deepgram.com/home

## ElevenLabs

-   https://elevenlabs.io/docs/eleven-creative/overview

## Beyond Presence

-   https://docs.bey.dev/get-started

Do not invent APIs if they are not present in the documentation.

------------------------------------------------------------------------

# Technology Stack

-   **Language:** Python
-   **Realtime Transport:** LiveKit Agents
-   **Speech-to-Text:** Deepgram Streaming STT
-   **LLM:** Groq API (streaming)
-   **Text-to-Speech:** ElevenLabs Streaming TTS
-   **Avatar:** Beyond Presence
-   **Avatar ID:** `694c83e2-8895-4a98-bd16-56332ca3f449`

The Beyond Presence API key will be supplied later.

------------------------------------------------------------------------

# No Database

Do **NOT** use:

-   PostgreSQL
-   Redis
-   MongoDB
-   Qdrant
-   Pinecone
-   pgvector

Everything must remain in RAM for the duration of the session.

------------------------------------------------------------------------

# Session Duration

-   Hard limit: **10 minutes**
-   At timeout:
    -   Stop asking questions
    -   Generate the final evaluation
    -   Thank the user
    -   Disconnect

------------------------------------------------------------------------

# Initial Domains

## Technical

-   Artificial Intelligence
-   LLMs
-   Transformers
-   Prompt Engineering
-   DSA
-   Operating Systems
-   DBMS
-   Computer Networks
-   OOP
-   System Design

## Trading

-   Liquidity
-   Support and Resistance
-   Market Structure
-   Price Action
-   Candlestick Patterns
-   Risk Management
-   Supply and Demand
-   Order Blocks
-   BOS
-   CHOCH

------------------------------------------------------------------------

# Conversation Flow

Listen → Understand → Evaluate → Ask One Question → Listen Again → Adapt

The AI should behave like an experienced interviewer---not like a
chatbot.

Rules:

-   Never lecture.
-   Never answer first.
-   Ask exactly one follow-up question at a time.
-   Explain concepts only if the user explicitly asks.

------------------------------------------------------------------------

# Personality

-   Friendly
-   Professional
-   Curious
-   Encouraging
-   Natural conversational tone

Avoid repetitive praise such as "Great question" or "Excellent."

------------------------------------------------------------------------

# Adaptive Difficulty

-   Beginner → Simple conceptual questions
-   Intermediate → Why/how questions
-   Advanced → Scenario-based and deep conceptual challenges

------------------------------------------------------------------------

# Session State (In Memory)

``` python
session = {
    "topic": "",
    "subtopic": "",
    "difficulty": 1,
    "conversation": [],
    "asked_questions": [],
    "knowledge": {},
    "communication": {},
    "remaining_time": 600
}
```

Destroy this object when the interview ends.

------------------------------------------------------------------------

# Communication Evaluation

Track:

-   Confidence
-   Clarity
-   Logical flow
-   Vocabulary
-   Use of examples
-   Speaking pace
-   Long pauses
-   Filler words

Do not interrupt while the user is speaking.

------------------------------------------------------------------------

# Final Report

Generate:

-   Technical Score
-   Communication Score
-   Confidence Score
-   Strong Concepts
-   Weak Concepts
-   Personalized Recommendations

------------------------------------------------------------------------

# Voice Pipeline

User Audio

↓

LiveKit

↓

Deepgram Streaming STT

↓

Groq Streaming LLM

↓

ElevenLabs Streaming TTS

↓

Beyond Presence Avatar

↓

LiveKit Room

The pipeline should be fully streaming to minimize latency.

------------------------------------------------------------------------

# Avatar

Use Beyond Presence.

Avatar ID:

`694c83e2-8895-4a98-bd16-56332ca3f449`

Behavior:

-   Join the LiveKit room
-   Lip-sync with ElevenLabs audio
-   Idle while listening
-   Animate while speaking

------------------------------------------------------------------------

# LLM System Prompt

``` text
ROLE

You are an adaptive technical interviewer.

Your goal is to evaluate understanding, not teach.

Rules

- Never lecture.
- Never answer first.
- Ask ONE follow-up question.
- Increase difficulty after strong answers.
- Reduce difficulty after weak answers.
- Never repeat questions.
- Probe incomplete answers.
- Guide through questions instead of revealing answers.

At the end produce:

- Technical Score
- Communication Score
- Confidence Score
- Strong Concepts
- Weak Concepts
- Learning Recommendations
```

------------------------------------------------------------------------

# Suggested Project Structure

``` text
app/
    main.py
    agent.py
    session.py
    interviewer.py
    evaluator.py
    prompts.py
    avatar.py
    speech.py
    llm.py
    config.py
    utils.py

frontend/
    React

.env
README.md
```

------------------------------------------------------------------------

# Frontend

Display:

-   Avatar
-   Listening / Thinking / Speaking status
-   Current topic
-   Remaining time
-   Final evaluation report

Use LiveKit React Components.

------------------------------------------------------------------------

# Environment Variables

``` env
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
GROQ_API_KEY=
BEY_API_KEY=
```

------------------------------------------------------------------------

# Engineering Requirements

-   Async Python (`async` / `await`)
-   Streaming STT, LLM, and TTS
-   Modular architecture
-   Type hints
-   Docstrings
-   Environment variables for secrets
-   Graceful error handling
-   README with setup instructions

------------------------------------------------------------------------

# Expected Deliverable

A production-quality MVP including:

-   LiveKit Agent
-   Deepgram Streaming STT
-   Groq Streaming LLM
-   ElevenLabs Streaming TTS
-   Beyond Presence Avatar
-   Adaptive interviewer
-   In-memory session management
-   10-minute interview timer
-   Final evaluation report
-   React frontend

Focus on **low latency**, **clean architecture**, and **maintainable
code**.
