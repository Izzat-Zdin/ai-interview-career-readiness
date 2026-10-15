"""Local Whisper STT server — OpenAI-compatible /v1/audio/transcriptions endpoint.

Run:  python whisper_server.py
Port: 8000

The model is downloaded automatically on first run (faster-whisper / Hugging Face).
Change WHISPER_LOCAL_MODEL env var to switch size: tiny, base, small, medium, large-v3
"""

import os
import tempfile

import av
import uvicorn
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# --- Compatibility patch: faster-whisper 1.2.1 passes metadata_errors to av.open,
# --- which was removed in PyAV 19. Wrap av.open to drop the unknown kwarg.
_original_av_open = av.open


def _patched_av_open(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _original_av_open(*args, **kwargs)


av.open = _patched_av_open

from faster_whisper import WhisperModel

MODEL_SIZE = os.environ.get("WHISPER_LOCAL_MODEL", "base")
PORT = int(os.environ.get("WHISPER_LOCAL_PORT", "8000"))

print(f"[whisper-local] Loading model '{MODEL_SIZE}' (first run downloads it)...")
whisper_model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
print("[whisper-local] Model ready.")

app = FastAPI(title="Local Whisper STT")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/v1/models")
async def list_models():
    return {"object": "list", "data": [{"id": "whisper-1", "object": "model"}]}


@app.post("/v1/audio/transcriptions")
async def transcribe(
    file: UploadFile = File(...),
    model: str = Form(default="whisper-1"),
    language: str = Form(default=None),
):
    suffix = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        segments, info = whisper_model.transcribe(
            tmp_path,
            language=language,
            beam_size=5,
            # Keep filler words (um, uh, ah...) in the transcript — the app
            # analyses them for interview feedback.
            condition_on_previous_text=False,
            initial_prompt="Um, uh, ah, er, hmm, like, you know, transcript with hesitations and filler words verbatim.",
        )
        text = " ".join(seg.text.strip() for seg in segments).strip()
        print(f"[whisper-local] transcribed ({info.language}, {info.duration:.1f}s): {text[:80]}")
        return {"text": text}
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="warning")
