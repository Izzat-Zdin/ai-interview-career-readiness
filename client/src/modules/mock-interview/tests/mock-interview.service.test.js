import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  startSession,
  submitAnswer,
  finishSession,
  getReport,
  uploadAudio,
} from '../services/mock-interview.service.js';

describe('mock-interview.service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts a session', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { sessionId: 'abc-123', currentQuestion: { text: 'Q1' }, progress: { current: 1, total: 5 } },
      }),
    });

    const result = await startSession({ role: 'software-engineer', type: 'hr' });
    expect(result.data.sessionId).toBe('abc-123');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/mock-interview/sessions'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ role: 'software-engineer', type: 'hr' }) })
    );
  });

  it('throws on API error with message', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ success: false, message: 'Invalid role' }),
    });

    await expect(startSession({ role: 'wizard', type: 'magic' })).rejects.toThrow('Invalid role');
  });

  it('uploads audio as FormData without JSON content-type', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { transcription: 'hello' } }),
    });

    const blob = new Blob([], { type: 'audio/webm' });
    await uploadAudio('abc-123', blob);

    const [, options] = global.fetch.mock.calls[0];
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.headers).toBeUndefined();
  });
});
