import { useState } from 'react';
import { Trophy, RotateCcw, TrendingUp, AlertCircle, CheckCircle, FileDown, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RecordingPlayback } from './RecordingPlayback';

function exportReportPdf(report) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed = 24) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const heading = (text, size = 14) => {
    ensureSpace(size + 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    doc.text(text, margin, y);
    y += size + 6;
  };
  const body = (text, { indent = 0, gap = 4 } = {}) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(String(text ?? ''), maxWidth - indent);
    lines.forEach((line) => {
      ensureSpace(14);
      doc.text(line, margin + indent, y);
      y += 14;
    });
    y += gap;
  };
  const bullets = (items = []) => {
    if (!items.length) {
      body('— none recorded —', { indent: 12 });
      return;
    }
    items.forEach((item) => body(`• ${item}`, { indent: 12 }));
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('AI Mock Interview Report', margin, y);
  y += 26;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const meta = [
    `Role: ${(report.role || '').replace(/-/g, ' ')}`,
    `Type: ${(report.type || '').charAt(0).toUpperCase() + (report.type || '').slice(1)}`,
    report.language ? `Language: ${report.language === 'ms' ? 'Bahasa Melayu' : 'English'}` : null,
    report.persona ? `Persona: ${report.persona}` : null,
    `Answered: ${report.answeredCount}/${report.questionCount} questions`,
    `Date: ${new Date(report.createdAt || Date.now()).toLocaleString()}`,
  ].filter(Boolean);
  meta.forEach((line) => {
    doc.text(line, margin, y);
    y += 16;
  });
  y += 6;

  heading(`Average Score: ${report.averageScore}/100`, 16);
  if (report.summary) body(report.summary);

  heading('Strengths');
  bullets(report.strengths);
  heading('Weaknesses');
  bullets(report.weaknesses);
  heading('Improvement Suggestions');
  bullets(report.suggestions);

  heading('Question Breakdown');
  (report.qa || []).forEach((item, idx) => {
    heading(`Q${idx + 1}${item.evaluation ? ` — ${item.evaluation.overallScore}/100` : ''}`, 12);
    body(`Question: ${item.question}`);
    body(`Answer: ${item.answer || '(no answer submitted)'}`, { indent: 10 });
    if (item.evaluation?.feedback) {
      body(`Feedback: ${item.evaluation.feedback}`, { indent: 10 });
    }
    const attempts = report.attempts?.[item.questionId];
    if (attempts?.length > 1) {
      body(`Attempts: ${attempts.length} (best score kept)`, { indent: 10 });
    }
    y += 4;
  });

  doc.save(`mock-interview-report-${Date.now()}.pdf`);
}

export function ResultsView({ report, onRestart }) {
  const [exporting, setExporting] = useState(false);

  if (!report) return null;

  const {
    role,
    type,
    questionCount,
    answeredCount,
    averageScore,
    strengths,
    weaknesses,
    suggestions,
    qa,
    summary,
  } = report;

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  const handleExportPdf = () => {
    setExporting(true);
    try {
      exportReportPdf(report);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="h-6 w-6 text-yellow-600" />
            Interview Report
          </CardTitle>
          <CardDescription>
            {typeLabel} interview for {role.replace(/-/g, ' ')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 rounded-lg border bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Average Score</p>
              <p className="text-3xl font-bold">{averageScore}/100</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {answeredCount} of {questionCount} questions answered
            </div>
          </div>

          <Progress value={averageScore} max={100} className="h-3" />

          <p className="text-sm text-muted-foreground">{summary}</p>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                {strengths.length ? (
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No major strengths recorded.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weaknesses.length ? (
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No major weaknesses recorded.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <TrendingUp className="h-4 w-4" />
                Improvement Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestions.length ? (
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No suggestions recorded.</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Question Breakdown</h3>
            {qa.map((item, idx) => (
              <Card key={item.questionId}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-medium">Q{idx + 1}</CardTitle>
                    {item.evaluation && (
                      <Badge variant="outline">{item.evaluation.overallScore}/100</Badge>
                    )}
                  </div>
                  <CardDescription>{item.question}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Your answer:</span>{' '}
                    {item.answer || <em className="text-muted-foreground">No answer submitted.</em>}
                  </p>
                  {report.attempts?.[item.questionId]?.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      🔁 {report.attempts[item.questionId].length} attempts recorded — the best
                      attempt is kept in this report.
                    </p>
                  )}
                  {(report.audio?.[item.questionId] || item.audioUrl) && (
                    <RecordingPlayback audioUrl={item.audioUrl || report.audio[item.questionId]} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleExportPdf} disabled={exporting} className="flex-1 gap-2">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Download PDF Report
            </Button>
            <Button onClick={onRestart} className="flex-1 gap-2">
              <RotateCcw className="h-4 w-4" />
              Practice Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
