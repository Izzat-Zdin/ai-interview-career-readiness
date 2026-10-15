import { v4 as uuidv4 } from 'uuid';
import {
  createSession,
  getSession,
  addQuestion,
  saveAnswer,
  saveEvaluation,
  saveSession,
  advanceQuestion,
  completeSession,
  getSessionReport,
  recordAttempt,
  replaceAnswerForRetry,
} from '../services/session.service.js';
import { listHistory } from '../services/db.service.js';
import { generateQuestion, generateFollowUp, getRoleLabel, getPersonaLabel } from '../services/mock-ai.service.js';
import { evaluateAnswer } from '../services/answer-evaluation.service.js';
import { analyzeTranscript } from '../services/speech-analysis.service.js';
import { analyzeAudioFeatures } from '../services/audio-features.service.js';
import { transcribeAudio } from '../../../config/ai.js';
import path from 'path';
import fs from 'fs/promises';

export async function startSession(req, res, next) {
  try {
    const { role, type, language, persona } = req.body;
    const session = createSession({ role, type, language, persona });
    const questionText = await generateQuestion({ type, role, previousQA: [], language: session.language, persona: session.persona });
    const question = addQuestion(session.id, questionText);
    res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        role,
        type,
        language: session.language,
        persona: session.persona,
        roleLabel: getRoleLabel(role),
        personaLabel: getPersonaLabel(session.persona),
        currentQuestion: question,
        progress: { current: 1, total: 5 },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentQuestion(req, res, next) {
  try {
    const session = getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    const question = session.questions[session.currentIndex];
    if (!question) return res.status(409).json({ success: false, message: 'No more questions' });
    res.json({
      success: true,
      data: {
        sessionId: session.id,
        currentQuestion: question,
        progress: { current: session.currentIndex + 1, total: 5 },
        status: session.status,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function submitAnswer(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { answer, transcript, durationSeconds, questionId, facialMetrics, silences } = req.body;
    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    if (session.status === 'completed') {
      return res.status(409).json({ success: false, message: 'Session already completed' });
    }

    const question = session.questions[session.currentIndex];
    if (!question) return res.status(409).json({ success: false, message: 'No active question' });
    if (questionId && questionId !== question.id) {
      return res.status(409).json({ success: false, message: 'Question mismatch — refresh the current question.' });
    }

    const finalAnswer = transcript?.trim() || answer?.trim() || '';
    const audioMeta = transcript ? analyzeTranscript(transcript, durationSeconds || 0) : null;
    if (audioMeta && Array.isArray(silences)) {
      audioMeta.silences = silences;
    }
    if (audioMeta && facialMetrics && typeof facialMetrics === 'object') {
      audioMeta.facialAnalysis = facialMetrics;
    }

    const evaluation = await evaluateAnswer({
      question: question.text,
      answer: finalAnswer,
      type: session.type,
      role: session.role,
      speechMetrics: audioMeta,
      facialMetrics: audioMeta?.facialAnalysis || null,
      language: session.language,
      persona: session.persona,
    });

    recordAttempt(sessionId, question.id, {
      answer: finalAnswer,
      evaluation,
      audio: audioMeta,
      at: new Date().toISOString(),
    });
    saveAnswer(sessionId, finalAnswer, audioMeta);
    saveEvaluation(sessionId, evaluation);

    // Advance and generate next question if not finished
    advanceQuestion(sessionId);

    let nextQuestion = null;
    if (session.status !== 'completed') {
      const previousQA = session.questions.slice(0, session.currentIndex).map((q, i) => ({
        question: q.text,
        answer: session.answers[i]?.text || '',
      }));
      const nextText = await generateQuestion({ type: session.type, role: session.role, previousQA, language: session.language, persona: session.persona });
      nextQuestion = addQuestion(sessionId, nextText);
    }
    saveSession(session);

    res.json({
      success: true,
      data: {
        sessionId,
        questionId: question.id,
        question: question.text,
        evaluation,
        audioAnalysis: audioMeta ? { ...audioMeta, transcript: finalAnswer } : null,
        nextQuestion,
        progress: { current: session.currentIndex + (session.status === 'completed' ? 0 : 1), total: 5 },
        status: session.status,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getReport(req, res, next) {
  try {
    const session = getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    const report = getSessionReport(session);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

export async function finishSession(req, res, next) {
  try {
    const session = getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    completeSession(session.id);
    const report = getSessionReport(session);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

export async function uploadAudio(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file provided' });
    }
    const { sessionId } = req.params;
    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const filePath = path.resolve(req.file.path);
    const mimeType = req.file.mimetype || 'audio/webm';

    const [transcriptionResult, audioFeatures] = await Promise.allSettled([
      transcribeAudio(filePath, mimeType),
      analyzeAudioFeatures(filePath),
    ]);

    const transcription = transcriptionResult.status === 'fulfilled' ? transcriptionResult.value : { transcription: '', measured: false, error: transcriptionResult.reason?.message };
    const features = audioFeatures.status === 'fulfilled' ? audioFeatures.value : { measured: false, error: audioFeatures.reason?.message };

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
        transcription: transcription.transcription || '',
        transcriptionMeta: { measured: transcription.measured, model: transcription.model, note: transcription.note, error: transcription.error },
        audioFeatures: features,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /sessions/:sessionId/analyze-upload
 * Accepts an uploaded video/audio file, transcribes it with Whisper,
 * runs speech analysis (fillers, pace) and full AI evaluation against the
 * session's current question. Facial analysis is done client-side.
 */
export async function analyzeUpload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }
    const { sessionId } = req.params;
    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const question = session.questions[session.currentIndex];
    if (!question) return res.status(409).json({ success: false, message: 'No active question' });

    const filePath = path.resolve(req.file.path);
    const mimeType = req.file.mimetype || 'video/mp4';

    let transcription = '';
    let transcriptionError = null;
    try {
      const result = await transcribeAudio(filePath, mimeType);
      transcription = (result.transcription || '').trim();
      if (!transcription) {
        transcriptionError = 'No speech detected in the file. Make sure the audio is clear and loud enough.';
      }
    } catch (err) {
      transcriptionError = err.message || 'Transcription failed';
    } finally {
      fs.unlink(filePath).catch(() => {});
    }

    if (transcriptionError && !transcription) {
      return res.status(422).json({ success: false, message: transcriptionError });
    }

    const durationSeconds = Number(req.body.durationSeconds) || 0;
    const audioMeta = analyzeTranscript(transcription, durationSeconds);

    let facialMetrics = null;
    if (req.body.facialMetrics) {
      try {
        facialMetrics = JSON.parse(req.body.facialMetrics);
      } catch {
        // ignore malformed facial metrics
      }
    }

    const evaluation = await evaluateAnswer({
      question: question.text,
      answer: transcription,
      type: session.type,
      role: session.role,
      speechMetrics: audioMeta,
      facialMetrics,
      language: session.language,
      persona: session.persona,
    });

    if (facialMetrics) {
      audioMeta.facialAnalysis = facialMetrics;
    }
    recordAttempt(sessionId, question.id, {
      answer: transcription,
      evaluation,
      audio: { ...audioMeta, transcript: transcription },
      at: new Date().toISOString(),
    });
    saveAnswer(sessionId, transcription, audioMeta);
    saveEvaluation(sessionId, evaluation);
    advanceQuestion(sessionId);

    let nextQuestion = null;
    if (session.status !== 'completed') {
      const previousQA = session.questions.slice(0, session.currentIndex).map((q, i) => ({
        question: q.text,
        answer: session.answers[i]?.text || '',
      }));
      const nextText = await generateQuestion({ type: session.type, role: session.role, previousQA, language: session.language, persona: session.persona });
      nextQuestion = addQuestion(sessionId, nextText);
    }
    saveSession(session);

    res.json({
      success: true,
      data: {
        sessionId,
        questionId: question.id,
        transcription,
        evaluation,
        audioAnalysis: { ...audioMeta, transcript: transcription, facialAnalysis: facialMetrics },
        nextQuestion,
        progress: { current: session.currentIndex + (session.status === 'completed' ? 0 : 1), total: 5 },
        status: session.status,
      },
    });
  } catch (err) {
    next(err);
  }
}


/**
 * POST /sessions/:sessionId/follow-up
 * Generate a probing follow-up question based on the answer just given for
 * the specified question (does NOT advance the interview).
 */
export async function getFollowUp(req, res, next) {
  try {
    const session = getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const { questionId } = req.body;
    const idx = session.questions.findIndex((q) => q.id === questionId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Question not found' });

    const answer = session.answers[idx]?.text || '';
    if (!answer.trim()) {
      return res.status(409).json({ success: false, message: 'No answer recorded for that question yet.' });
    }

    const text = await generateFollowUp({
      type: session.type,
      role: session.role,
      question: session.questions[idx].text,
      answer,
      language: session.language,
      persona: session.persona,
    });

    res.json({
      success: true,
      data: { questionId, followUp: text },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /sessions/:sessionId/retry
 * Re-answer the SAME question (after seeing feedback). Does not advance the
 * interview. Returns the new evaluation plus a before/after comparison.
 */
export async function retryAnswer(req, res, next) {
  try {
    const session = getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const { questionId, answer, transcript, durationSeconds, facialMetrics, silences } = req.body;
    const idx = session.questions.findIndex((q) => q.id === questionId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Question not found' });
    if (session.status !== 'completed' && idx !== session.currentIndex - 1 && idx !== session.currentIndex) {
      return res.status(409).json({ success: false, message: 'Can only retry the current or most recent question.' });
    }

    const question = session.questions[idx];
    const finalAnswer = transcript?.trim() || answer?.trim() || '';
    if (!finalAnswer) {
      return res.status(400).json({ success: false, message: 'Answer is required.' });
    }

    const audioMeta = transcript ? analyzeTranscript(transcript, durationSeconds || 0) : null;
    if (audioMeta && Array.isArray(silences)) audioMeta.silences = silences;
    if (audioMeta && facialMetrics && typeof facialMetrics === 'object') {
      audioMeta.facialAnalysis = facialMetrics;
    }

    const previousAttempts = (session.attempts || {})[questionId] || [];
    const previous = previousAttempts.length ? previousAttempts[previousAttempts.length - 1] : null;

    const evaluation = await evaluateAnswer({
      question: question.text,
      answer: finalAnswer,
      type: session.type,
      role: session.role,
      speechMetrics: audioMeta,
      facialMetrics: audioMeta?.facialAnalysis || null,
      language: session.language,
      persona: session.persona,
    });

    const attempt = {
      answer: finalAnswer,
      evaluation,
      audio: audioMeta,
      at: new Date().toISOString(),
    };
    recordAttempt(session.id, questionId, attempt);
    replaceAnswerForRetry(session.id, questionId, finalAnswer, audioMeta, evaluation);
    saveSession(session);

    const metric = (att, getter) => (att ? getter(att) ?? null : null);
    const comparison = previous
      ? {
          score: { before: previous.evaluation?.overallScore ?? null, after: evaluation.overallScore },
          fillers: {
            before: metric(previous, (a) => a.audio?.fillerAnalysis?.ratePer100Words),
            after: audioMeta?.fillerAnalysis?.ratePer100Words ?? null,
          },
          speakingRate: {
            before: metric(previous, (a) => a.audio?.speakingRateWordsPerMinute),
            after: audioMeta?.speakingRateWordsPerMinute ?? null,
          },
          nervousness: {
            before: metric(previous, (a) => a.audio?.facialAnalysis?.nervousPercent),
            after: audioMeta?.facialAnalysis?.nervousPercent ?? null,
          },
        }
      : null;

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        questionId,
        question: question.text,
        evaluation,
        audioAnalysis: audioMeta ? { ...audioMeta, transcript: finalAnswer } : null,
        attemptNumber: previousAttempts.length + 1,
        comparison,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /history — cross-session progress history (for the dashboard).
 */
export async function getHistory(req, res, next) {
  try {
    res.json({ success: true, data: listHistory({ limit: 100 }) });
  } catch (err) {
    next(err);
  }
}
