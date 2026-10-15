import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { QuestionCard } from '../components/QuestionCard';
import { RecordingControls } from '../components/RecordingControls';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { WebcamPanel } from '../components/WebcamPanel';
import { VideoUploadPanel } from '../components/VideoUploadPanel';
import { ProcessingPendingCard } from '../components/ProcessingPendingCard';
import { EvaluationLoadingCard } from '../components/EvaluationLoadingCard';
import { RetryComparison } from '../components/RetryComparison';
import { RecordingPlayback } from '../components/RecordingPlayback';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function InterviewLayout({
  session,
  question,
  progress,
  answerText,
  setAnswerText,
  evaluation,
  audioAnalysis,
  loading,
  speech,
  recorder,
  face,
  onStartRecording,
  onStopRecording,
  onPauseToggle,
  onReset,
  onSubmit,
  onFinish,
  onUploadResult,
  uploadStatus,
  onUploadStatusChange,
  submitStage,
  hasRecordedAudio,
  onRetry,
  retryCount = 0,
  maxRetryAttempts = 3,
  retryComparison,
  followUp,
  followUpLoading,
  onFollowUp,
  lastRecording,
}) {
  const uploadBusy = uploadStatus?.processing === true;
  return (
    <div className="space-y-6">
      <QuestionCard question={question} progress={progress} type={session.type} />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <WebcamPanel face={face} recording={recorder.recording} />

          <div className="space-y-2">
            <label htmlFor="answer" className="text-sm font-medium">
              Your Answer
            </label>
            <Textarea
              id="answer"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your answer or use the microphone to record your voice..."
              rows={5}
              disabled={loading}
            />
            {recorder.recording && speech.supported && (
              <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive"></span>
                    </span>
                    LIVE TRANSCRIPT
                  </span>
                  <select
                    value={speech.lang}
                    onChange={(e) => speech.setLanguage(e.target.value)}
                    className="rounded border bg-background px-2 py-1 text-xs"
                    aria-label="Speech recognition language"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-MY">English (Malaysia)</option>
                    <option value="ms-MY">Bahasa Melayu</option>
                  </select>
                </div>
                <p className="mt-1 min-h-[1.25rem] leading-relaxed">
                  {speech.transcript && <span>{speech.transcript} </span>}
                  <span className="text-muted-foreground">{speech.interim}</span>
                  {!speech.transcript && !speech.interim && (
                    <span className="text-muted-foreground italic">
                      {speech.listening
                        ? 'Listening… speak clearly into the mic.'
                        : 'Starting speech service…'}
                    </span>
                  )}
                </p>
                {!speech.listening && recorder.recording && (
                  <p className="mt-1 text-xs text-amber-600">
                    Speech service not responding in this browser — your audio is still being
                    recorded and will be transcribed by Whisper when you submit.
                  </p>
                )}
              </div>
            )}
            {speech.supported && !recorder.recording && (
              <p className="text-xs text-muted-foreground">
                Voice input available when you start recording.
              </p>
            )}
            {!speech.supported && (
              <p className="text-xs text-muted-foreground">
                Speech recognition is not supported in this browser. You can still record audio and type your answer.
              </p>
            )}
          </div>

          <RecordingControls
            recording={recorder.recording}
            isStarting={recorder.isStarting}
            paused={recorder.paused}
            durationSeconds={recorder.durationSeconds}
            level={recorder.level}
            onStart={onStartRecording}
            onStop={onStopRecording}
            onPauseToggle={onPauseToggle}
            onReset={onReset}
            disabled={loading}
          />

          <VideoUploadPanel
            sessionId={session.sessionId}
            onResult={onUploadResult}
            onStatusChange={onUploadStatusChange}
            disabled={loading || recorder.recording}
          />

          {recorder.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{recorder.error}</AlertDescription>
            </Alert>
          )}

          {speech.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{speech.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={onSubmit}
              disabled={(!answerText.trim() && !recorder.audioBlob) || loading || uploadBusy || recorder.recording || recorder.isStarting}
              className="gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Answer
            </Button>
            {evaluation && onRetry && (
              <Button
                variant="outline"
                onClick={onRetry}
                disabled={
                  loading ||
                  uploadBusy ||
                  recorder.recording ||
                  retryCount >= maxRetryAttempts ||
                  (!answerText.trim() && !recorder.audioBlob)
                }
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again ({retryCount}/{maxRetryAttempts})
              </Button>
            )}
            {evaluation && onFollowUp && (
              <Button
                variant="outline"
                onClick={onFollowUp}
                disabled={followUpLoading || followUp != null || loading}
                className="gap-2"
              >
                {followUpLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {followUp ? 'Follow-up received' : 'Ask Follow-up'}
              </Button>
            )}
            <Button variant="outline" onClick={onFinish} disabled={loading || uploadBusy}>
              End Interview
            </Button>
          </div>

          <RecordingPlayback
            audioBlob={lastRecording?.audioBlob}
            audioUrl={lastRecording?.audioUrl}
          />
        </CardContent>
      </Card>

      {uploadBusy && <ProcessingPendingCard status={uploadStatus} />}

      {!uploadBusy && loading && submitStage && (
        <EvaluationLoadingCard stage={submitStage} hasAudio={hasRecordedAudio} />
      )}

      {retryComparison && (
        <RetryComparison comparison={retryComparison} attemptNumber={retryCount + 1} />
      )}

      {followUp && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="space-y-2 pt-4 text-sm">
            <p className="font-medium text-purple-800">🔎 Follow-up from the interviewer</p>
            <p className="text-purple-900">{followUp}</p>
            <p className="text-xs text-purple-700">
              Practice answering this out loud, then use “Try Again” to re-record and fold it
              into your answer.
            </p>
          </CardContent>
        </Card>
      )}

      <FeedbackPanel evaluation={evaluation} audioAnalysis={audioAnalysis} />
    </div>
  );
}
