import { useState, useCallback, useEffect, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { SetupForm } from '../components/SetupForm';
import { ResultsView } from '../components/ResultsView';
import { InterviewLayout } from './InterviewLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useFacialExpression } from '../hooks/useFacialExpression';
import {
  startSession,
  submitAnswer,
  retryAnswer,
  getFollowUp,
  finishSession,
  getReport,
  uploadAudio,
} from '../services/mock-interview.service';

const MAX_RETRY_ATTEMPTS = 3;

export default function MockInterviewPage() {
  const [phase, setPhase] = useState('setup');
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState(null);
  const [progress, setProgress] = useState({ current: 1, total: 5 });
  const [answerText, setAnswerText] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [audioAnalysis, setAudioAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ processing: false });
  const [submitStage, setSubmitStage] = useState(null); // 'transcribing' | 'evaluating' | null
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  // Feature 1: re-record the same question and compare attempts
  const [retryCount, setRetryCount] = useState(0);
  const [retryComparison, setRetryComparison] = useState(null);
  // Feature: ask the interviewer a follow-up question about this answer
  const [followUp, setFollowUp] = useState(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  // Feature 10: last recorded answer audio, for playback
  const [lastRecording, setLastRecording] = useState(null);

  const recorder = useAudioRecorder();
  const speech = useSpeechRecognition();
  const face = useFacialExpression();
  const faceSummaryRef = useRef(null);

  const recorderStopRef = useRef(recorder.stop);
  const speechStopRef = useRef(speech.stop);
  const recorderResetRef = useRef(recorder.reset);
  const speechResetRef = useRef(speech.reset);
  const speechFinalRef = useRef('');
  const speechInterimRef = useRef('');

  useEffect(() => {
    recorderStopRef.current = recorder.stop;
    speechStopRef.current = speech.stop;
    recorderResetRef.current = recorder.reset;
    speechResetRef.current = speech.reset;
  });

  useEffect(() => {
    speechFinalRef.current = speech.transcript;
    speechInterimRef.current = speech.interim;
  }, [speech.transcript, speech.interim]);

  useEffect(() => {
    return () => {
      recorderStopRef.current();
      speechStopRef.current();
    };
  }, []);

  const resetAll = useCallback(() => {
    recorderResetRef.current();
    speechResetRef.current();
    setAnswerText('');
    setEvaluation(null);
    setAudioAnalysis(null);
    setError(null);
    setRetryCount(0);
    setRetryComparison(null);
    setFollowUp(null);
    setLastRecording(null);
  }, []);

  const handleStart = async ({ role, type, language, persona }) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await startSession({ role, type, language, persona });
      setSession(data);
      setQuestion(data.currentQuestion);
      setProgress(data.progress);
      setPhase('interview');
      resetAll();
    } catch (err) {
      setError(err.message || 'Failed to start session.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRecording = async () => {
    setError(null);
    speechFinalRef.current = '';
    speechInterimRef.current = '';
    speechResetRef.current();
    try {
      await recorder.start();
      if (speech.supported) {
        speech.start();
      }
      if (face.cameraOn && face.modelsLoaded) {
        face.startDetection();
      }
    } catch (err) {
      setError(err.message || 'Could not start recording.');
    }
  };

  const handleStopRecording = () => {
    recorder.stop();
    speech.stop();
    // Capture facial expression summary for this answer window
    face.stopDetection();
    faceSummaryRef.current = face.getSummary();
    // Combine final transcript with any in-progress interim text that
    // speech.stop() may not have flushed through onresult yet.
    const combined = `${speechFinalRef.current} ${speechInterimRef.current}`.trim();
    if (combined) {
      setAnswerText((prev) => `${prev} ${combined}`.trim());
    }
    speechFinalRef.current = '';
    speechInterimRef.current = '';
  };

  const handleSubmitAnswer = async () => {
    if (!session?.sessionId) return;
    setLoading(true);
    setError(null);
    setSubmitStage(recorder.audioBlob ? 'transcribing' : 'evaluating');
    try {
      let finalAnswer = answerText.trim();

      // If there's a recorded audio blob, transcribe it via the backend
      // (local Whisper) and use the transcription as the answer when the
      // text box is empty.
      if (recorder.audioBlob) {
        setSubmitStage('transcribing');
        try {
          const { data: audioData } = await uploadAudio(session.sessionId, recorder.audioBlob);
          const whisperText = audioData?.transcription?.trim();
          if (whisperText) {
            finalAnswer = finalAnswer ? `${finalAnswer} ${whisperText}` : whisperText;
            setAnswerText(finalAnswer);
          }
          if (audioData?.audioFeatures) {
            // Merge audio features (pitch/pauses from python) with the
            // server's transcript-based analysis (filler words) once the
            // submit response arrives. Don't overwrite here — the answer
            // endpoint returns the real audioAnalysis.
            setAudioAnalysis((prev) => ({
              ...(prev || {}),
              audioFeatures: audioData.audioFeatures,
            }));
          }
        } catch (audioErr) {
          console.warn('Audio transcription failed, continuing with typed text:', audioErr);
        }
      }

      if (!finalAnswer) {
        setError('Please type an answer or record your voice first.');
        setLoading(false);
        setSubmitStage(null);
        return;
      }

      setSubmitStage('evaluating');
      const { data } = await submitAnswer(session.sessionId, {
        answer: finalAnswer,
        transcript: finalAnswer,
        durationSeconds: recorder.durationSeconds,
        questionId: question?.questionId || question?.id || null,
        facialMetrics: faceSummaryRef.current,
        silences: recorder.silences?.length ? recorder.silences : undefined,
      });
      // Keep the recording around so the user can listen back (Feature 10)
      if (recorder.audioBlob || recorder.audioUrl) {
        setLastRecording({ audioBlob: recorder.audioBlob, audioUrl: recorder.audioUrl });
      }

      setEvaluation(data.evaluation);
      setAudioAnalysis({
        ...data.audioAnalysis,
        silences: recorder.silences?.length ? recorder.silences : data.audioAnalysis?.silences,
        facialAnalysis: faceSummaryRef.current,
      });
      setProgress(data.progress);

      if (data.status === 'completed') {
        const { data: reportData } = await getReport(session.sessionId);
        setReport(reportData);
        setPhase('results');
      } else if (data.nextQuestion) {
        setQuestion(data.nextQuestion);
        setAnswerText('');
        recorder.reset();
        speech.reset();
        setRetryCount(0);
        setRetryComparison(null);
        setFollowUp(null);
        setLastRecording(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit answer.');
    } finally {
      setLoading(false);
      setSubmitStage(null);
    }
  };

  // Feature 1: re-record / re-type the same question; server stores every
  // attempt and returns a before/after comparison.
  const handleRetryAnswer = async () => {
    if (!session?.sessionId) return;
    if (retryCount >= MAX_RETRY_ATTEMPTS) return;
    setLoading(true);
    setError(null);
    setSubmitStage(recorder.audioBlob ? 'transcribing' : 'evaluating');
    try {
      let finalAnswer = answerText.trim();

      if (recorder.audioBlob) {
        setSubmitStage('transcribing');
        try {
          const { data: audioData } = await uploadAudio(session.sessionId, recorder.audioBlob);
          const whisperText = audioData?.transcription?.trim();
          if (whisperText) {
            finalAnswer = finalAnswer ? `${finalAnswer} ${whisperText}` : whisperText;
            setAnswerText(finalAnswer);
          }
        } catch (audioErr) {
          console.warn('Retry transcription failed, using typed text:', audioErr);
        }
      }

      if (!finalAnswer) {
        setError('Record or type a new answer before trying again.');
        return;
      }

      setSubmitStage('evaluating');
      const { data } = await retryAnswer(session.sessionId, {
        questionId: question?.questionId || question?.id || null,
        answer: finalAnswer,
        transcript: finalAnswer,
        durationSeconds: recorder.durationSeconds,
        facialMetrics: faceSummaryRef.current,
        silences: recorder.silences?.length ? recorder.silences : undefined,
      });

      if (recorder.audioBlob || recorder.audioUrl) {
        setLastRecording({ audioBlob: recorder.audioBlob, audioUrl: recorder.audioUrl });
      }

      setRetryCount((c) => c + 1);
      setRetryComparison(data.comparison || null);
      setEvaluation(data.evaluation);
      setAudioAnalysis((prev) => ({
        ...(data.audioAnalysis || prev || {}),
        facialAnalysis: faceSummaryRef.current,
      }));
      recorder.reset();
      speech.reset();
    } catch (err) {
      setError(err.message || 'Failed to retry answer.');
    } finally {
      setLoading(false);
      setSubmitStage(null);
    }
  };

  const handleFollowUp = async () => {
    if (!session?.sessionId) return;
    setFollowUpLoading(true);
    setError(null);
    try {
      const res = await getFollowUp(
        session.sessionId,
        question?.questionId || question?.id || null
      );
      const data = res?.data || res;
      setFollowUp(data?.followUp || data?.question || null);
    } catch (err) {
      setError(err.message || 'Failed to get follow-up question.');
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleUploadResult = async (data) => {
    // Result shape matches the normal submit flow — reuse the same state updates.
    setEvaluation(data.evaluation);
    setAudioAnalysis(data.audioAnalysis);
    setProgress(data.progress);
    setAnswerText(data.transcription || '');

    if (data.status === 'completed') {
      const { data: reportData } = await getReport(session.sessionId);
      setReport(reportData);
      setPhase('results');
    } else if (data.nextQuestion) {
      setQuestion(data.nextQuestion);
      setAnswerText('');
      recorder.reset();
      speech.reset();
    }
  };

  const handleFinish = async () => {
    if (!session?.sessionId) return;
    setLoading(true);
    setError(null);
    try {
      await finishSession(session.sessionId);
      const { data } = await getReport(session.sessionId);
      setReport(data);
      setPhase('results');
    } catch (err) {
      setError(err.message || 'Failed to finish session.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setPhase('setup');
    setSession(null);
    setQuestion(null);
    setReport(null);
    resetAll();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">AI Mock Interview Engine</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {phase === 'setup' && <SetupForm onStart={handleStart} loading={loading} />}

      {phase === 'interview' && session && question && (
        <InterviewLayout
          session={session}
          question={question}
          progress={progress}
          answerText={answerText}
          setAnswerText={setAnswerText}
          evaluation={evaluation}
          audioAnalysis={audioAnalysis}
          loading={loading}
          speech={speech}
          recorder={recorder}
          face={face}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onPauseToggle={recorder.togglePause}
          onReset={() => {
            recorder.reset();
            speech.reset();
            setAnswerText('');
          }}
          onSubmit={handleSubmitAnswer}
          onFinish={handleFinish}
          onUploadResult={handleUploadResult}
          uploadStatus={uploadStatus}
          onUploadStatusChange={setUploadStatus}
          submitStage={submitStage}
          hasRecordedAudio={Boolean(recorder.audioBlob)}
          onRetry={handleRetryAnswer}
          retryCount={retryCount}
          maxRetryAttempts={MAX_RETRY_ATTEMPTS}
          retryComparison={retryComparison}
          followUp={followUp}
          followUpLoading={followUpLoading}
          onFollowUp={handleFollowUp}
          lastRecording={lastRecording}
        />
      )}

      {phase === 'results' && report && (
        <ResultsView report={report} onRestart={handleRestart} />
      )}
    </div>
  );
}
