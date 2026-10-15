# AI Interview Preparation & Career Readiness System

A full-stack AI-powered mock interview engine. Users select a target role and interview type, answer a series of adaptive questions, and receive real-time feedback on their content, clarity, and speaking delivery.

## Stack
- **Frontend**: Vite + React 18 + Tailwind CSS + shadcn/ui primitives
- **Backend**: Node.js + Express (ES modules) + Multer + express-validator
- **AI**: Any OpenAI-compatible provider (chat completions + optional Whisper-compatible STT)
- **Tests**: Vitest (frontend uses jsdom + React Testing Library; backend uses Supertest)

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

2. Configure environment variables from the root `.env.example`:
   ```bash
   cp .env.example .env
   # Then edit .env with your provider details
   ```

3. Start both servers:
   ```bash
   # Terminal 1: backend
   cd server
   npm run dev

   # Terminal 2: frontend
   cd client
   npm run dev
   ```

4. Open the app at the URL printed by Vite (default http://localhost:5173).

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `AI_BASE_URL` | OpenAI-compatible chat endpoint | `https://api.openai.com/v1` |
| `AI_API_KEY` | API key for chat completions | `sk-...` |
| `AI_MODEL` | Chat model | `gpt-4o-mini` |
| `WHISPER_BASE_URL` | Optional separate STT endpoint | `https://api.openai.com/v1` |
| `WHISPER_API_KEY` | Optional separate STT API key | `sk-...` |
| `WHISPER_MODEL` | STT model | `whisper-1` |
| `PORT` | Backend port | `5000` |
| `VITE_API_BASE_URL` | Frontend build-time API URL | `/api` or `http://localhost:5000/api` |

## Known Limitations
- **Sessions are in-memory only.** Restarting the server clears all active sessions and reports.
- **Audio analysis** runs best-effort without requiring Python. It measures duration and, when a provider is configured, transcribes audio.
- **Video and native mobile app support** are out of scope for this module.

## Testing

```bash
# Backend
npm run test --prefix server

# Frontend
npm run test:run --prefix client
```
