import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../index.js';

describe('mock-interview routes', () => {
  let sessionId;

  it('starts a new session', async () => {
    const res = await request(app)
      .post('/api/mock-interview/sessions')
      .send({ role: 'software-engineer', type: 'hr' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBeDefined();
    sessionId = res.body.data.sessionId;
  });

  it('returns the current question', async () => {
    const res = await request(app).get(`/api/mock-interview/sessions/${sessionId}/question`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.currentQuestion.text).toBeTruthy();
  });

  it('submits an answer and advances', async () => {
    const res = await request(app)
      .post(`/api/mock-interview/sessions/${sessionId}/answer`)
      .send({ answer: 'I enjoy building products that solve real problems.', durationSeconds: 8 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.evaluation.overallScore).toBeGreaterThanOrEqual(0);
    expect(res.body.data.progress.current).toBe(2);
    expect(res.body.data.nextQuestion).toBeTruthy();
  });

  it('finishes the session and returns a report', async () => {
    const res = await request(app)
      .post(`/api/mock-interview/sessions/${sessionId}/finish`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.averageScore).toBeDefined();
  });

  it('rejects invalid session creation payloads', async () => {
    const res = await request(app)
      .post('/api/mock-interview/sessions')
      .send({ role: 'wizard', type: 'magic' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });
});
