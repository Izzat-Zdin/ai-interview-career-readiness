import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function Delta({ before, after, invert = false, suffix = '' }) {
  if (before == null || after == null) return null;
  const diff = after - before;
  const improved = invert ? diff < 0 : diff > 0;
  const Icon = diff === 0 ? Minus : improved ? TrendingUp : TrendingDown;
  const color =
    diff === 0 ? 'text-muted-foreground' : improved ? 'text-green-600' : 'text-red-600';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {diff > 0 ? '+' : ''}
      {Number.isInteger(diff) ? diff : diff.toFixed(1)}
      {suffix}
    </span>
  );
}

/**
 * Before/after comparison shown after a "Try Again" retry of the same
 * question: did the score go up? did fillers go down?
 */
export function RetryComparison({ comparison, attemptNumber }) {
  if (!comparison) return null;

  const rows = [
    {
      label: 'Overall score',
      before: comparison.score?.before,
      after: comparison.score?.after,
      suffix: '/100',
      invert: false,
    },
    {
      label: 'Filler words (per 100 words)',
      before: comparison.fillers?.before,
      after: comparison.fillers?.after,
      suffix: '',
      invert: true,
    },
    {
      label: 'Speaking rate (wpm)',
      before: comparison.speakingRate?.before,
      after: comparison.speakingRate?.after,
      suffix: '',
      invert: false,
    },
    {
      label: 'Nervousness (%)',
      before: comparison.nervousness?.before,
      after: comparison.nervousness?.after,
      suffix: '%',
      invert: true,
    },
  ].filter((r) => r.before != null && r.after != null);

  if (!rows.length) return null;

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
      <p className="mb-2 font-medium text-blue-800">
        Attempt #{attemptNumber} vs previous attempt
      </p>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2">
            <span className="text-blue-900/80">{row.label}</span>
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground line-through">
                {row.before}
                {row.suffix}
              </span>
              <span className="font-semibold text-blue-900">
                {row.after}
                {row.suffix}
              </span>
              <Delta before={row.before} after={row.after} invert={row.invert} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
