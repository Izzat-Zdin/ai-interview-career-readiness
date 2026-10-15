import { useMemo } from 'react';

// Must stay in sync with server/src/modules/mock-interview/services/speech-analysis.service.js
const FILLER_WORDS = [
  'um', 'uh', 'ah', 'er', 'erm', 'hmm', 'umm', 'uhh', 'aaa', 'eee',
  'like', 'you know', 'i mean', 'sort of', 'kind of', 'basically', 'actually',
  'errr', 'mmm', 'kot', 'tahu tak', 'macam', 'apa ni', 'apa benda',
];

/**
 * Renders the transcript with filler words highlighted inline so the user
 * can re-read their answer and see exactly where they hesitated.
 */
export function HighlightedTranscript({ transcript, fillerAnalysis }) {
  const segments = useMemo(() => {
    if (!transcript) return [];

    // Build one regex that matches any filler phrase (longest first so
    // "you know" wins over "you"), case-insensitive, word-bounded.
    const escaped = [...FILLER_WORDS]
      .sort((a, b) => b.length - a.length)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
    const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(transcript)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: transcript.slice(lastIndex, match.index), filler: false });
      }
      parts.push({ text: match[0], filler: true });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < transcript.length) {
      parts.push({ text: transcript.slice(lastIndex), filler: false });
    }
    return parts;
  }, [transcript]);

  if (!transcript) return null;

  const fillerCounts = fillerAnalysis?.perWord || {};
  const totalFillers = fillerAnalysis?.total ?? 0;

  return (
    <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">Your answer (read-back)</p>
        {totalFillers > 0 && (
          <span className="text-xs text-muted-foreground">
            {totalFillers} filler{totalFillers === 1 ? '' : 's'} highlighted
          </span>
        )}
      </div>

      <p className="leading-relaxed">
        {segments.map((seg, i) =>
          seg.filler ? (
            <mark
              key={i}
              className="rounded bg-red-200/80 px-0.5 font-medium text-red-800"
              title="Filler word — try replacing with a short silent pause"
            >
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </p>

      {Object.keys(fillerCounts).length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t pt-2">
          {Object.entries(fillerCounts).map(([word, count]) => (
            <span
              key={word}
              className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
            >
              “{word}” ×{count}
            </span>
          ))}
        </div>
      )}

      {totalFillers === 0 && (
        <p className="text-xs text-green-700">
          ✓ Clean delivery — no filler words detected in this answer.
        </p>
      )}
    </div>
  );
}
