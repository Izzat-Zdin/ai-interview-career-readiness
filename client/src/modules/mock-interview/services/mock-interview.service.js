const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const isFormData = options.body instanceof FormData;
  const res = await fetch(url, {
    ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
    ...options,
    body: isFormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      let data = null;
      if (typeof res.json === 'function') {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }
      if (!data && typeof res.text === 'function') {
        const text = await res.text();
        data = text ? JSON.parse(text) : null;
      }
      if (data?.message) message = data.message;
      else if (data && typeof data === 'string') message = data;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  const data = await res.json().catch((err) => {
    throw new Error(`Invalid response: ${err.message}`);
  });
  return data;
}

export function startSession({ role, type, language = 'en', persona = 'neutral' }) {
  return request('/mock-interview/sessions', { method: 'POST', body: { role, type, language, persona } });
}

export function getQuestion(sessionId) {
  return request(`/mock-interview/sessions/${sessionId}/question`);
}

export function submitAnswer(sessionId, { answer, transcript, durationSeconds, questionId, facialMetrics, silences }) {
  return request(`/mock-interview/sessions/${sessionId}/answer`, {
    method: 'POST',
    body: { answer, transcript, durationSeconds, questionId, facialMetrics, silences },
  });
}

export function retryAnswer(sessionId, { questionId, answer, transcript, durationSeconds, facialMetrics, silences }) {
  return request(`/mock-interview/sessions/${sessionId}/retry`, {
    method: 'POST',
    body: { questionId, answer, transcript, durationSeconds, facialMetrics, silences },
  });
}

export function getFollowUp(sessionId, questionId) {
  return request(`/mock-interview/sessions/${sessionId}/follow-up`, {
    method: 'POST',
    body: { questionId },
  });
}

export function getHistory() {
  return request('/mock-interview/history');
}

export function finishSession(sessionId) {
  return request(`/mock-interview/sessions/${sessionId}/finish`, { method: 'POST' });
}

export function getReport(sessionId) {
  return request(`/mock-interview/sessions/${sessionId}/report`);
}

export function uploadAudio(sessionId, blob) {
  const formData = new FormData();
  formData.append('audio', blob, 'answer.webm');
  return request(`/mock-interview/sessions/${sessionId}/audio`, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Upload a video/audio file for full analysis: transcription, speech
 * analysis (fillers, pace) and AI evaluation against the current question.
 * Facial metrics (computed client-side) are attached as JSON.
 */
export function analyzeUpload(sessionId, file, { durationSeconds = 0, facialMetrics = null, silences = null } = {}) {
  const formData = new FormData();
  formData.append('file', file, file.name || 'upload.mp4');
  formData.append('durationSeconds', String(Math.round(durationSeconds)));
  if (facialMetrics) {
    formData.append('facialMetrics', JSON.stringify(facialMetrics));
  }
  if (silences) {
    formData.append('silences', JSON.stringify(silences));
  }
  return request(`/mock-interview/sessions/${sessionId}/analyze-upload`, {
    method: 'POST',
    body: formData,
  });
}
