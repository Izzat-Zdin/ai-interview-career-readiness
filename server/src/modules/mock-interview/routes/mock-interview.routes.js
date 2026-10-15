import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  startSession,
  getCurrentQuestion,
  submitAnswer,
  getReport,
  finishSession,
  uploadAudio,
  analyzeUpload,
  getFollowUp,
  retryAnswer,
  getHistory,
} from '../controllers/mock-interview.controller.js';
import {
  createSessionRules,
  answerRules,
  sessionIdRules,
  validate,
} from '../validators/mock-interview.validator.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname) || '.webm'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB — video files are larger
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a',
      'video/webm', 'video/mp4', 'video/quicktime', 'video/x-matroska', 'video/avi',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

const router = Router();

router.post('/sessions', createSessionRules, validate, startSession);
router.get('/sessions/:sessionId/question', sessionIdRules, validate, getCurrentQuestion);
router.post('/sessions/:sessionId/answer', answerRules, validate, submitAnswer);
router.post('/sessions/:sessionId/finish', sessionIdRules, validate, finishSession);
router.get('/sessions/:sessionId/report', sessionIdRules, validate, getReport);
router.post('/sessions/:sessionId/audio', sessionIdRules, validate, upload.single('audio'), uploadAudio);
router.post('/sessions/:sessionId/analyze-upload', sessionIdRules, validate, upload.single('file'), analyzeUpload);
router.post('/sessions/:sessionId/follow-up', sessionIdRules, validate, getFollowUp);
router.post('/sessions/:sessionId/retry', sessionIdRules, validate, retryAnswer);
router.get('/history', getHistory);

export default router;
