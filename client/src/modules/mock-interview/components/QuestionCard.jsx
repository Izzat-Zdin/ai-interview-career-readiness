import { HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export function QuestionCard({ question, progress, type }) {
  const typeLabel = type ? `${type.charAt(0).toUpperCase() + type.slice(1)} Interview` : 'Interview';
  const percent = Math.round(((progress.current || 1) / (progress.total || 5)) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="h-5 w-5" />
            Current Question
          </CardTitle>
          <Badge variant="secondary">{typeLabel}</Badge>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress value={percent} max={100} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-medium leading-relaxed">{question?.text}</p>
      </CardContent>
    </Card>
  );
}
