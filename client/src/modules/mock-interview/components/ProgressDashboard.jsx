import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, TrendingUp, TrendingDown, Minus, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getHistory } from '../services/mock-interview.service';

const PERSONA_LABELS = {
  neutral: 'Standard',
  friendly: 'Friendly HR',
  strict: 'Strict Lead',
};

/** Tiny dependency-free SVG line chart. */
function TrendChart({ points, label, color = '#2563eb', max = 100, invert = false }) {
  const W = 260;
  const H = 70;
  const PAD = 6;

  const valid = points.filter((p) => p.value != null && Number.isFinite(p.value));
  if (valid.length < 2) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex h-[70px] items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
          Need 2+ sessions
        </div>
      </div>
    );
  }

  const stepX = (W - PAD * 2) / (valid.length - 1);
  const coords = valid.map((p, i) => {
    const x = PAD + i * stepX;
    const y = H - PAD - (Math.min(Math.max(p.value, 0), max) / max) * (H - PAD * 2);
    return [x, y];
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const first = valid[0].value;
  const last = valid[valid.length - 1].value;
  const diff = last - first;
  const improved = invert ? diff < 0 : diff > 0;
  const TrendIcon = diff === 0 ? Minus : improved ? TrendingUp : TrendingDown;
  const trendColor = diff === 0 ? 'text-muted-foreground' : improved ? 'text-green-600' : 'text-red-600';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${trendColor}`}>
          <TrendIcon className="h-3.5 w-3.5" />
          {diff > 0 ? '+' : ''}
          {Number.isInteger(diff) ? diff : diff.toFixed(1)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[70px] w-full rounded border bg-muted/30">
        <path d={path} fill="none" stroke={color} strokeWidth="2" />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{new Date(valid[0].date).toLocaleDateString()}</span>
        <span>{new Date(valid[valid.length - 1].date).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

/**
 * Feature: progress tracking dashboard — fetches past sessions from SQLite
 * and renders trend charts (avg score, filler rate) plus a session list.
 */
export function ProgressDashboard() {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getHistory();
        const data = res?.data || res || [];
        if (!cancelled) {
          // Oldest first for charts
          setHistory([...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          Failed to load progress history: {error}
        </CardContent>
      </Card>
    );
  }

  if (!history) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your progress…
      </div>
    );
  }

  const completed = history.filter((s) => s.averageScore != null);
  const scorePoints = completed.map((s) => ({ date: s.createdAt, value: s.averageScore }));
  const fillerPoints = completed
    .filter((s) => s.avgFillerRate != null)
    .map((s) => ({ date: s.createdAt, value: s.avgFillerRate }));
  const maxFiller = Math.max(10, ...fillerPoints.map((p) => p.value));

  const latest = history[history.length - 1];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Average score trend</CardTitle>
            <CardDescription>Across completed mock interviews</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart points={scorePoints} label="Score /100" color="#2563eb" max={100} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Filler words trend</CardTitle>
            <CardDescription>Fillers per 100 words (lower is better)</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart points={fillerPoints} label="Fillers /100 words" color="#dc2626" max={maxFiller} invert />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Past sessions
          </CardTitle>
          <CardDescription>
            {history.length} session{history.length === 1 ? '' : 's'} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions yet — complete a mock interview and it will appear here.
            </p>
          ) : (
            <div className="divide-y">
              {[...history].reverse().map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium capitalize">
                      {(s.role || '').replace(/-/g, ' ')} · {s.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString()} · {s.answeredCount}/{s.questionCount} answered
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{PERSONA_LABELS[s.persona] || 'Standard'}</Badge>
                    <Badge variant="outline">{s.language === 'ms' ? 'BM' : 'EN'}</Badge>
                    {s.averageScore != null ? (
                      <Badge
                        variant="outline"
                        className={
                          s.averageScore >= 70
                            ? 'border-green-600 text-green-700'
                            : s.averageScore >= 40
                              ? 'border-amber-500 text-amber-600'
                              : 'border-red-500 text-red-600'
                        }
                      >
                        {s.averageScore}/100
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{s.status}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {latest && (
        <Button asChild variant="outline" className="w-full">
          <Link to="/mock-interview">Start another practice interview</Link>
        </Button>
      )}
    </div>
  );
}
