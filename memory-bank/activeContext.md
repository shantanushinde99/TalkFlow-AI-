# Active Context

## Current Work Focus
Initializing the memory bank to establish the core documentation for the project based on the AI Listener MVP Spec.

## Recent Changes and Commits
- Project scaffolding exists: `app/`, `frontend/`, `.env`, and `start.bat` are present.
- Memory bank structure is currently being established.

## Next Steps
- Implement the backend application structure in `app/`.
- Setup LiveKit integration and agent logic.
- Setup the React frontend in `frontend/`.

## Active Decisions and Considerations
- Adhering to the strict "No Database" rule; all session state will be managed in Python memory.
- Using Python `async`/`await` for the backend to support the streaming requirements.

## Important Patterns and Preferences
- Use official documentation for LiveKit, Deepgram, ElevenLabs, and Beyond Presence.
- Fully streaming voice pipeline (Deepgram -> Groq -> ElevenLabs -> LiveKit).

## Learnings and Project Insights
- N/A (Initial setup phase)
