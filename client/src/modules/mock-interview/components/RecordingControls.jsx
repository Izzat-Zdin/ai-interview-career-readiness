import { useEffect, useRef } from 'react';
import { Mic, Square, Pause, Play, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BAR_COUNT = 24;

function Waveform({ level, active }) {
  const barsRef = useRef(new Array(BAR_COUNT).fill(0));

  useEffect(() => {
    const bars = barsRef.current;
    bars.shift();
    bars.push(active ? level : 0);
  }, [level, active]);

  return (
    <div className="flex h-10 items-center justify-center gap-[3px]" aria-hidden="true">
      {barsRef.current.map((v, i) => {
        const height = active ? Math.max(4, Math.round(v * 36)) : 4;
        return (
          <span
            key={i}
            className={`w-1 rounded-full transition-all duration-100 ${active ? 'bg-destructive' : 'bg-muted-foreground/40'}`}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}

export function RecordingControls({ recording, isStarting, paused, durationSeconds, level = 0, onStart, onStop, onPauseToggle, onReset, disabled }) {
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-4">
      <div className="text-2xl font-mono font-semibold">{formatTime(durationSeconds)}</div>

      <Waveform level={level} active={recording && !paused} />

      <div className="flex items-center gap-2">
        {!recording && !durationSeconds && (
          <Button type="button" onClick={onStart} disabled={disabled || isStarting} className="gap-2">
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            {isStarting ? 'Starting…' : 'Start Recording'}
          </Button>
        )}
        {recording && (
          <>
            <Button type="button" variant="outline" onClick={onPauseToggle} className="gap-2">
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button type="button" variant="destructive" onClick={onStop} className="gap-2">
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </>
        )}
        {!recording && durationSeconds > 0 && (
          <Button type="button" variant="outline" onClick={onReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Re-record
          </Button>
        )}
      </div>
      {recording && !paused && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive"></span>
          </span>
          Recording…
        </div>
      )}
    </div>
  );
}
