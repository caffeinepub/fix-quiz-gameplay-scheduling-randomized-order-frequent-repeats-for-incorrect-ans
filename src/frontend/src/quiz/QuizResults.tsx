import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Trophy, RotateCcw, Edit } from 'lucide-react';

interface QuizResultsProps {
  score: { correct: number; total: number };
  onPlayAgain: () => void;
  onBackToEditor: () => void;
}

export default function QuizResults({ score, onPlayAgain, onBackToEditor }: QuizResultsProps) {
  const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  const getMessage = () => {
    if (percentage >= 90) return 'Outstanding! 🎉';
    if (percentage >= 75) return 'Great job! 👏';
    if (percentage >= 60) return 'Good effort! 👍';
    return 'Keep practicing! 💪';
  };

  const getColor = () => {
    if (percentage >= 75) return 'success-text';
    if (percentage >= 60) return 'text-primary';
    return 'text-muted-foreground';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl mb-2">Quiz Complete!</CardTitle>
          <p className="text-xl text-muted-foreground">{getMessage()}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8 bg-muted/30 rounded-lg">
            <div className={`text-6xl font-bold mb-2 ${getColor()}`}>{percentage}%</div>
            <p className="text-muted-foreground">
              {score.correct} correct out of {score.total} questions
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-card border">
              <div className="text-2xl font-bold">{score.total}</div>
              <div className="text-sm text-muted-foreground">Total Answered</div>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <div className="text-2xl font-bold success-text">{score.correct}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="p-4 rounded-lg bg-card border">
              <div className="text-2xl font-bold text-destructive">{score.total - score.correct}</div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
          </div>

          <div className="pt-4 flex gap-3 justify-center">
            <Button onClick={onPlayAgain} size="lg">
              <RotateCcw className="h-4 w-4 mr-2" />
              Play Again
            </Button>
            <Button onClick={onBackToEditor} variant="outline" size="lg">
              <Edit className="h-4 w-4 mr-2" />
              Edit Questions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
