import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Clock3, ScanFace, AudioLines, BrainCircuit, Hourglass } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const STEP_DEFS = [
  { key: 'facial', label: 'Analyzing facial expressions from video frames', icon: ScanFace },
  { key: 'uploading', label: 'Uploading & transcribing speech with Whisper', icon: AudioLines },
  { key: 'evaluating', label: 'AI evaluating your answer & writing feedback', icon: BrainCircuit },
];

function stepState(stepKey, currentStage, isAudioOnly) {
  const order = STEP_DEFS.map((s) => s.key);
  const currentIdx = order.indexOf(currentStage);
  const stepIdx = order.indexOf(stepKey);
  if (isAudioOnly && stepKey === 'facial') return 'skipped';
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

/**
 * Full-width "please wait" card shown while an uploaded video/audio is
 * being processed. Gives the user a clear pending indicator with the
 * current stage, an elapsed timer, and a checklist of the pipeline steps.
 */
export function ProcessingPendingCard({ status }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [status?.fileName]);

  if (!status?.processing) return null;

  const isAudioOnly = status.fileName && /\.(mp3|wav|ogg|m4a)$/i.test(status.fileName);
  const mm = String(Math.floor(elapsed / 60)).padStart(1, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <Card className="border-amber-300 bg-amber-50/60">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Hourglass className="h-5 w-5 animate-pulse text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">
                Processing your recording — please wait…
              </p>
              <p className="text-xs text-amber-700">
                {status.fileName ? `"${status.fileName}" is being analyzed. ` : ''}
                Don’t close or refresh this page.
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
            <Clock3 className="h-3.5 w-3.5" /> {mm}:{ss}
          </span>
        </div>

        <div className="space-y-2">
          {STEP_DEFS.map((step) => {
            const state = stepState(step.key, status.stage, isAudioOnly);
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center gap-2.5 text-sm">
                {state === 'done' || state === 'skipped' ? (
                  <CheckCircle2 className={`h-4 w-4 ${state === 'skipped' ? 'text-muted-foreground/50' : 'text-green-600'}`} />
                ) : state === 'active' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                )}
                <Icon className={`h-4 w-4 ${state === 'active' ? 'text-amber-700' : 'text-muted-foreground/60'}`} />
                <span
                  className={
                    state === 'active'
                      ? 'font-medium text-amber-900'
                      : state === 'done'
                        ? 'text-green-700 line-through-none'
                        : 'text-muted-foreground'
                  }
                >
                  {step.label}
                  {state === 'skipped' && ' (audio file — skipped)'}
                  {state === 'active' && status.stage === 'facial' && status.progress != null && (
                    <span className="ml-1 text-xs text-amber-700">{Math.round(status.progress * 100)}%</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {status.stage === 'facial' && status.progress != null && (
          <Progress value={Math.round(status.progress * 100)} className="h-1.5" />
        )}

        <p className="text-xs text-muted-foreground">
          Longer recordings take a while — Whisper transcribes every word, and the AI
          writes detailed feedback. Usually under a minute.
        </p>
      </CardContent>
    </Card>
  );
}
