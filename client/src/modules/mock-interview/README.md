# AI Mock Interview Engine - Frontend

## Purpose
Provides the UI for a role-based, adaptive AI mock interview. Users configure an interview, answer questions by text or voice, and review feedback and a final report.

## Structure
- `pages/`: `MockInterviewPage` container and `InterviewLayout` shell.
- `components/`: `SetupForm`, `QuestionCard`, `RecordingControls`, `FeedbackPanel`, `ResultsView`.
- `services/`: `mock-interview.service.js` (API client).
- `hooks/`: `useAudioRecorder`, `useSpeechRecognition`.
- `tests/`: Vitest component and service tests.

## Key Behaviors
- `SetupForm` requires both role and type before starting.
- Audio answers record via `MediaRecorder` and upload to `/api/mock-interview/sessions/:id/audio`.
- The browser's `webkitSpeechRecognition` is used as a lightweight fallback transcription.
- Final scores, strengths, weaknesses, and suggestions come from the backend report.

## Environment Variables
- `VITE_API_BASE_URL`: API prefix used by the service layer (default `/api`).

## Known Limitations
- Speech recognition requires a compatible browser (Chrome/Edge recommended).
- Voice uploads require microphone permission.
