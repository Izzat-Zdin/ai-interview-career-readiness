import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  getSession,
  addQuestion,
  saveAnswer,
  saveEvaluation,
  advanceQuestion,
  completeSession,
  getSessionReport,
} from '../services/session.service.js';

describe('session.service', () => {
  beforeEach(() => {
    // Sessions are stored in memory; tests share process state but each test creates a fresh session.
  });

  it('creates an active session with default progress', () => {
    const session = createSession({ role: 'software-engineer', type: 'hr' });
    expect(session).toHaveProperty('id');
    expect(session.role).toBe('software-engineer');
    expect(session.type).toBe('hr');
    expect(session.status).toBe('active');
    expect(session.currentIndex).toBe(0);
  });

  it('stores and retrieves a question', () => {
    const session = createSession({ role: 'software-engineer', type: 'hr' });
    const q = addQuestion(session.id, 'Tell me about yourself.');
    expect(q.text).toBe('Tell me about yourself.');
    expect(getSession(session.id).questions).toHaveLength(1);
  });

  it('saves answers linked to the current question', () => {
    const session = createSession({ role: 'software-engineer', type: 'hr' });
    addQuestion(session.id, 'Q1');
    const answer = saveAnswer(session.id, 'A1 answer');
    expect(answer.text).toBe('A1 answer');
    expect(answer.questionId).toBe(session.questions[0].id);
  });

  it('advances until completed and stops at MAX_QUESTIONS', () => {
    const session = createSession({ role: 'software-engineer', type: 'hr' });
    for (let i = 0; i < 5; i += 1) {
      addQuestion(session.id, `Q${i + 1}`);
      saveAnswer(session.id, `A${i + 1}`);
      saveEvaluation(session.id, {
        overallScore: 60 + i * 5,
        scores: { relevance: 6, clarity: 6, specificity: 6, technicalAccuracy: 6 },
        strengths: [],
        weaknesses: [],
        suggestions: [],
        summary: '',
      });
      advanceQuestion(session.id);
    }
    expect(session.status).toBe('completed');
    expect(session.currentIndex).toBe(5);
  });

  it('generates a report summarizing evaluations', () => {
    const session = createSession({ role: 'business-analyst', type: 'behavioral' });
    addQuestion(session.id, 'Q1');
    saveAnswer(session.id, 'A1');
    saveEvaluation(session.id, {
      overallScore: 70,
      strengths: ['Good structure'],
      weaknesses: ['Lacked specifics'],
      suggestions: ['Add examples'],
      summary: 'Solid.',
    });
    completeSession(session.id);
    const report = getSessionReport(session);
    expect(report.averageScore).toBe(70);
    expect(report.answeredCount).toBe(1);
    expect(report.strengths).toContain('Good structure');
    expect(report.qa).toHaveLength(1);
  });
});
