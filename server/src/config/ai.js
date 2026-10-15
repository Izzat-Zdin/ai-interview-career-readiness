/**
 * Provider-agnostic AI client.
 * Supports any OpenAI-compatible chat completions endpoint.
 */
export function getAIConfig() {
  return {
    baseURL: process.env.AI_BASE_URL?.replace(/\/$/, '') || 'https://api.openai.com/v1',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    enabled: !!(process.env.AI_BASE_URL && process.env.AI_API_KEY),
  };
}

export function getWhisperConfig() {
  return {
    baseURL: process.env.WHISPER_BASE_URL?.replace(/\/$/, '') || process.env.AI_BASE_URL?.replace(/\/$/, '') || 'https://api.openai.com/v1',
    apiKey: process.env.WHISPER_API_KEY || process.env.AI_API_KEY || '',
    model: process.env.WHISPER_MODEL || 'whisper-1',
    enabled: !!(process.env.AI_API_KEY || process.env.WHISPER_API_KEY),
  };
}

export async function chatCompletion(messages, { temperature = 0.7, response_format, max_tokens } = {}) {
  const { baseURL, apiKey, model } = getAIConfig();
  if (!apiKey) {
    throw new Error('AI provider is not configured. Set AI_BASE_URL and AI_API_KEY.');
  }

  const body = {
    model,
    messages,
    temperature,
    ...(response_format && { response_format }),
    ...(max_tokens && { max_tokens }),
  };

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`AI request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Transcribe an audio file using an OpenAI-compatible /audio/transcriptions endpoint.
 * Falls back gracefully if no transcription provider is configured.
 * Uses native FormData/Blob available in Node >=18.
 */
export async function transcribeAudio(audioFilePath, mimeType = 'audio/webm') {
  const { baseURL, apiKey, model, enabled } = getWhisperConfig();
  if (!enabled || !apiKey) {
    return { transcription: '', measured: false, note: 'No transcription provider configured.' };
  }

  const fs = await import('fs');
  const buffer = fs.readFileSync(audioFilePath);
  const blob = new Blob([buffer], { type: mimeType });

  const form = new FormData();
  form.append('file', blob, `audio.${mimeType.includes('mp4') ? 'm4a' : 'webm'}`);
  form.append('model', model);

  const res = await fetch(`${baseURL}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`Transcription failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    transcription: data.text || '',
    measured: true,
    model,
  };
}
