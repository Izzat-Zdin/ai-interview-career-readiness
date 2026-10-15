import { randomUUID } from 'crypto';
import { persistSession, loadSession } from './db.service.js';

// In-memory session store, hydrated from / persisted to SQLite so history
// survives restarts (progress dashboard).
const sessions = new Map();

const MAX_QUESTIONS = 5;

export function createSession({ role, type, language = 'en', persona = 'neutral' }) {
  const id = randomUUID();
  const session = {
    id,
    role,
    type,
    language,
    persona,
    currentIndex: 0,
    questions: [],
    answers: [],
    evaluations: [],
    attempts: {},
    createdAt: new Date().toISOString(),
    status: 'active',
  };
  sessions.set(id, session);
  persistSession(session);
  return session;
}

export function getSession(id) {
  let session = sessions.get(id);
  if (!session) {
    session = loadSession(id);
    if (session) {
      if (!session.attempts) session.attempts = {};
      sessions.set(id, session);
    }
  }
  return session;
}

export function saveSession(session) {
  if (!session) return;
  sessions.set(session.id, session);
  persistSession(session);
}

export function addQuestion(sessionId, questionText) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const question = { id: randomUUID(), text: questionText };
  session.questions.push(question);
  saveSession(session);
  return question;
}

export function saveAnswer(sessionId, answerText, audioMeta = null) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const answer = {
    id: randomUUID(),
    questionId: session.questions[session.currentIndex]?.id,
    text: answerText,
    audio: audioMeta,
  };
  session.answers.push(answer);
  return answer;
}

export function recordAttempt(sessionId, questionId, attempt) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (!session.attempts) session.attempts = {};
  if (!session.attempts[questionId]) session.attempts[questionId] = [];
  session.attempts[questionId].push(attempt);
  return attempt;
}

export function replaceAnswerForRetry(sessionId, questionId, answerText, audioMeta, evaluation) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const idx = session.questions.findIndex((q) => q.id === questionId);
  if (idx === -1) return null;
  if (session.answers[idx]) {
    session.answers[idx] = { ...session.answers[idx], text: answerText, audio: audioMeta };
  } else {
    session.answers[idx] = { id: randomUUID(), questionId, text: answerText, audio: audioMeta };
  }
  session.evaluations[idx] = evaluation;
  return session;
}

export function saveEvaluation(sessionId, evaluation) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.evaluations.push(evaluation);
  return evaluation;
}

export function advanceQuestion(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.currentIndex += 1;
  if (session.currentIndex >= MAX_QUESTIONS) {
    session.status = 'completed';
  }
  saveSession(session);
  return session;
}

export function completeSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.status = 'completed';
  saveSession(session);
  return session;
}

export function getSessionReport(session) {
  const validEvaluations = session.evaluations.filter((e) => Number.isFinite(e?.overallScore));
  const averageScore = validEvaluations.length
    ? Math.round(validEvaluations.reduce((sum, e) => sum + e.overallScore, 0) / validEvaluations.length)
    : 0;

  return {
    id: session.id,
    role: session.role,
    type: session.type,
    language: session.language || 'en',
    persona: session.persona || 'neutral',
    createdAt: session.createdAt,
    questionCount: session.questions.length,
    answeredCount: session.answers.length,
    averageScore,
    evaluations: session.evaluations,
    qa: session.questions.map((q, i) => ({
      questionId: q.id,
      question: q.text,
      answer: session.answers[i]?.text || '',
      audio: session.answers[i]?.audio || null,
      evaluation: session.evaluations[i] || null,
      attempts: (session.attempts || {})[q.id] || [],
    })),
    strengths: summarizeStrengths(session.evaluations),
    weaknesses: summarizeWeaknesses(session.evaluations),
    suggestions: topSuggestions(session.evaluations),
    summary: `You answered ${session.answers.length} of ${session.questions.length} questions with an average score of ${averageScore}/100.`,
  };
}

function summarizeStrengths(evaluations) {
  const all = evaluations.flatMap((e) => e.strengths || []);
  return uniqueTop(all, 3);
}

function summarizeWeaknesses(evaluations) {
  const all = evaluations.flatMap((e) => e.weaknesses || []);
  return uniqueTop(all, 3);
}

function topSuggestions(evaluations) {
  const all = evaluations.flatMap((e) => e.suggestions || []);
  return uniqueTop(all, 5);
}

function uniqueTop(list, limit) {
  const counts = {};
  for (const item of list) counts[item] = (counts[item] || 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text]) => text);
}
