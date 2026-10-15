# AI Mock Interview Engine - Backend

## Purpose
Generates adaptive interview questions, evaluates answers, analyzes speech/audio, and produces a per-session report.

## Structure
- `routes/`: Express routers for `/api/mock-interview` endpoints.
- `controllers/`: HTTP request handlers (session lifecycle, answer submission, audio upload).
- `services/`:
  - `session.service.js` — in-memory session store and report builder.
  - `mock-ai.service.js` — question generation with AI fallback to static templates.
  - `answer-evaluation.service.js` — answer scoring (AI heuristic).
  - `speech-analysis.service.js` — transcript metrics (fillers, pace).
  - `audio-features.service.js` — basic audio features (duration; Python optional).
- `validators/`: `express-validator` rules for request bodies.
- `tests/`: Vitest + Supertest coverage.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/mock-interview/sessions` | Create a session and get the first question. |
| GET | `/api/mock-interview/sessions/:sessionId/question` | Get the current question. |
| POST | `/api/mock-interview/sessions/:sessionId/answer` | Submit answer; returns evaluation + next question. |
| POST | `/api/mock-interview/sessions/:sessionId/audio` | Upload audio; returns transcription + audio features. |
| POST | `/api/mock-interview/sessions/:sessionId/finish` | End session and return report. |
| GET | `/api/mock-interview/sessions/:sessionId/report` | Get current report without finishing. |

## Environment Variables
- `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` — question generation + evaluation.
- `WHISPER_BASE_URL`, `WHISPER_API_KEY`, `WHISPER_MODEL` — optional STT.

## Known Limitations
- Session state is stored in memory. Server restarts reset all sessions.
- Audio feature extraction is lightweight and does not require Python by default.
- No persistent database is configured in this module.
