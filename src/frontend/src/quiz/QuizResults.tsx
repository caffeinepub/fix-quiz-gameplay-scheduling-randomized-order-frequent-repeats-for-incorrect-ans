import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Play, Edit, AlertCircle } from 'lucide-react';
import type { WrongAnswerEntry } from './wrongAnswerTypes';

interface QuizResultsProps {
  score: { correct: number; total: number };
  wrongAnswers: WrongAnswerEntry[];
  onPlayAgain: () => void;
  onReviewWrongAnswers: () => void;
  onBackToEditor?: () => void;
}

export default function QuizResults({
  score,
  wrongAnswers,
  onPlayAgain,
  onReviewWrongAnswers,
  onBackToEditor,
}: QuizResultsProps) {
  const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">Quiz Complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <div className="text-5xl font-bold text-primary">{percentage}%</div>
            <div className="text-muted-foreground">
              {score.correct} out of {score.total} correct
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-2xl font-bold text-success">{score.correct}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-2xl font-bold text-destructive">{wrongAnswers.length}</div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
          </div>

          <div className="space-y-2">
            <Button onClick={onPlayAgain} className="w-full" size="lg">
              <Play className="h-4 w-4 mr-2" />
              Play Again
            </Button>
            {wrongAnswers.length > 0 && (
              <Button onClick={onReviewWrongAnswers} variant="outline" className="w-full">
                <AlertCircle className="h-4 w-4 mr-2" />
                Review Wrong Answers
              </Button>
            )}
            {onBackToEditor && (
              <Button onClick={onBackToEditor} variant="outline" className="w-full">
                <Edit className="h-4 w-4 mr-2" />
                Back to Editor
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
