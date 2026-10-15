import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, Lightbulb, Quote, PauseCircle, Eye } from 'lucide-react';
import { HighlightedTranscript } from './HighlightedTranscript';

function ScoreRow({ label, score }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{score}/10</span>
      </div>
      <Progress value={score * 10} max={100} />
    </div>
  );
}

export function FeedbackPanel({ evaluation, audioAnalysis }) {
  if (!evaluation) return null;

  const { scores, overallScore, strengths, weaknesses, improvements, suggestions, exampleAnswer, summary } = evaluation;
  const improvementList = improvements?.length ? improvements : suggestions;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Provisional Feedback</CardTitle>
          <CardDescription>{summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Overall Score</span>
            <Badge variant="outline" className="text-base font-semibold">
              {overallScore}/100
            </Badge>
          </div>
          <Progress value={overallScore} max={100} />

          <div className="grid gap-3 pt-2">
            <ScoreRow label="Relevance" score={scores.relevance} />
            <ScoreRow label="Clarity & Structure" score={scores.clarity} />
            <ScoreRow label="Specificity" score={scores.specificity} />
            <ScoreRow label="Technical Accuracy" score={scores.technicalAccuracy} />
          </div>

          {audioAnalysis?.transcript && (
            <HighlightedTranscript
              transcript={audioAnalysis.transcript}
              fillerAnalysis={audioAnalysis.fillerAnalysis}
            />
          )}

          {audioAnalysis && (
            <div className="rounded-md border bg-muted p-3 text-sm space-y-2">
              <p className="font-medium">Speech analysis</p>
              <p>Words: {audioAnalysis.wordCount ?? '—'}</p>
              <p>Speaking rate: {audioAnalysis.speakingRateWordsPerMinute ? `${audioAnalysis.speakingRateWordsPerMinute} wpm` : '—'}</p>

              {audioAnalysis.fillerAnalysis && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p>
                      Filler words: <span className="font-semibold">{audioAnalysis.fillerAnalysis.total}</span>
                      {' '}({audioAnalysis.fillerAnalysis.ratePer100Words}/100 words)
                    </p>
                    {audioAnalysis.fillerAnalysis.total === 0 ? (
                      <Badge variant="outline" className="border-green-600 text-green-700">Excellent</Badge>
                    ) : audioAnalysis.fillerAnalysis.ratePer100Words <= 5 ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-600">Needs work</Badge>
                    ) : (
                      <Badge variant="destructive">Too many</Badge>
                    )}
                  </div>

                  {audioAnalysis.fillerAnalysis.total > 0 && audioAnalysis.fillerAnalysis.perWord && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(audioAnalysis.fillerAnalysis.perWord).map(([word, count]) => (
                        <span
                          key={word}
                          className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                        >
                          “{word}” ×{count}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {audioAnalysis.fillerAnalysis.total === 0
                      ? 'No filler words detected — your delivery sounds confident and fluent.'
                      : audioAnalysis.fillerAnalysis.ratePer100Words <= 5
                        ? 'A few fillers are natural, but try pausing silently instead of saying them.'
                        : 'You use fillers quite often. Tip: slow down, breathe, and replace “um/uh” with a short silent pause.'}
                  </p>
                </div>
              )}
              {audioAnalysis.silences?.length > 0 && (
                <div className="space-y-1 border-t pt-2">
                  <div className="flex items-center gap-2">
                    <PauseCircle className="h-4 w-4 text-amber-600" />
                    <p>
                      Long pauses (&gt;3s):{' '}
                      <span className="font-semibold">{audioAnalysis.silences.length}</span>
                      {' '}— longest{' '}
                      <span className="font-semibold">
                        {(Math.max(...audioAnalysis.silences.map((s) => s.duration)) / 1000).toFixed(1)}s
                      </span>
                    </p>
                    {audioAnalysis.silences.length >= 3 ? (
                      <Badge variant="destructive">Too many blanks</Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        Noticeable
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Interviewers notice long silent gaps. Practice bridging phrases like
                    “That&apos;s a great question — let me think of the best example…” while you
                    gather your thoughts.
                  </p>
                </div>
              )}
            </div>
          )}

          {audioAnalysis?.facialAnalysis?.eyeContactPercent != null && (
            <div className="rounded-md border bg-muted p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <p>
                  Eye contact with camera:{' '}
                  <span className="font-semibold">{audioAnalysis.facialAnalysis.eyeContactPercent}%</span>{' '}
                  of the time
                </p>
                {audioAnalysis.facialAnalysis.eyeContactPercent >= 70 ? (
                  <Badge variant="outline" className="border-green-600 text-green-700">Strong</Badge>
                ) : audioAnalysis.facialAnalysis.eyeContactPercent >= 40 ? (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">Inconsistent</Badge>
                ) : (
                  <Badge variant="destructive">Avoiding camera</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {audioAnalysis.facialAnalysis.eyeContactPercent >= 70
                  ? 'Great — consistent eye contact reads as confident and engaged.'
                  : 'Try to look at the camera lens when answering, especially at the start and end of sentences — it simulates real eye contact on video calls.'}
              </p>
            </div>
          )}

          {strengths?.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" /> What went well
              </p>
              <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
                {strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {weaknesses?.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <AlertTriangle className="h-4 w-4" /> Slightly off / needs polish
              </p>
              <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
                {weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {improvementList?.length > 0 && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-blue-700">
                <Lightbulb className="h-4 w-4" /> How to improve next time
              </p>
              <ul className="list-disc space-y-1 pl-6 text-sm text-blue-900/80">
                {improvementList.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {exampleAnswer && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-green-700">
                <Quote className="h-4 w-4" /> Example of a strong answer
              </p>
              <p className="text-sm italic text-green-900/80">{exampleAnswer}</p>
            </div>
          )}
          {audioAnalysis?.facialAnalysis && (
            <div className="rounded-md border bg-muted p-3 text-sm space-y-2">
              <p className="font-medium">Facial expression analysis (camera)</p>
              <div className="flex items-center gap-2">
                <p>
                  Nervousness: <span className="font-semibold">{audioAnalysis.facialAnalysis.nervousPercent}%</span>
                  {' '}· Dominant expression: <span className="font-semibold capitalize">{audioAnalysis.facialAnalysis.dominantExpression}</span>
                </p>
                {audioAnalysis.facialAnalysis.nervousPercent < 30 ? (
                  <Badge variant="outline" className="border-green-600 text-green-700">Composed</Badge>
                ) : audioAnalysis.facialAnalysis.nervousPercent < 60 ? (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">Slightly nervous</Badge>
                ) : (
                  <Badge variant="destructive">Very nervous</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(audioAnalysis.facialAnalysis.averages)
                  .filter(([, pct]) => pct >= 5)
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, pct]) => (
                    <span
                      key={label}
                      className="rounded-full bg-background px-2 py-0.5 text-xs capitalize"
                    >
                      {label} {pct}%
                    </span>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {audioAnalysis.facialAnalysis.nervousPercent < 30
                  ? 'Great composure — your expression looked calm and confident.'
                  : audioAnalysis.facialAnalysis.nervousPercent < 60
                    ? 'You showed some nervous cues. Take a slow breath before answering and keep a relaxed face.'
                    : 'Your face showed strong nervous signals. Practice tip: smile lightly, relax your shoulders, and pause to breathe between sentences.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
