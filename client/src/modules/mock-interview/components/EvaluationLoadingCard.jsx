import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Timer, AudioLines, ScanSearch, BrainCircuit, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

// Rough real-world timings (seconds) for each pipeline stage.
// Whisper 'base' on CPU + one GPT evaluation call.
const STAGE_ESTIMATES = {
  transcribing: 12,
  evaluating: 15,
};
const TOTAL_ESTIMATE = STAGE_ESTIMATES.transcribing + STAGE_ESTIMATES.evaluating;

const STAGE_DEFS = [
  { key: 'transcribing', label: 'Transcribing your voice with Whisper', icon: AudioLines },
  { key: 'evaluating', label: 'AI analyzing content, fillers & delivery', icon: BrainCircuit },
];

/**
 * Loading card shown after the user submits an answer, while Whisper
 * transcription + AI evaluation are running. Shows elapsed time, an
 * estimated remaining countdown, and the current pipeline stage so the
 * user knows roughly how long until results appear.
 */
export function EvaluationLoadingCard({ stage = 'transcribing', hasAudio = true }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const estimate = hasAudio ? TOTAL_ESTIMATE : STAGE_ESTIMATES.evaluating;
  const remaining = Math.max(0, estimate - elapsed);
  const progressPct = Math.min(95, Math.round((elapsed / estimate) * 100));

  const currentIdx = STAGE_DEFS.findIndex((s) => s.key === stage);

  return (
    <Card className="border-blue-300 bg-blue-50/60">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 animate-pulse text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Analyzing your answer…</p>
              <p className="text-xs text-blue-700">
                Results usually take about {estimate}s — hang tight!
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
            <Timer className="h-3.5 w-3.5" />
            {remaining > 0 ? `~${remaining}s left` : 'almost done…'}
          </span>
        </div>

        <Progress value={progressPct} className="h-2" />

        <div className="space-y-2">
          {STAGE_DEFS.map((step, i) => {
            if (!hasAudio && step.key === 'transcribing') return null;
            const state = i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending';
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center gap-2.5 text-sm">
                {state === 'done' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : state === 'active' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                )}
                <Icon className={`h-4 w-4 ${state === 'active' ? 'text-blue-700' : 'text-muted-foreground/60'}`} />
                <span
                  className={
                    state === 'active'
                      ? 'font-medium text-blue-900'
                      : state === 'done'
                        ? 'text-green-700'
                        : 'text-muted-foreground'
                  }
                >
                  {step.label}
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-2.5 text-sm">
            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
            <ScanSearch className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-muted-foreground">
              Preparing your feedback — strengths, improvements & example answer
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
