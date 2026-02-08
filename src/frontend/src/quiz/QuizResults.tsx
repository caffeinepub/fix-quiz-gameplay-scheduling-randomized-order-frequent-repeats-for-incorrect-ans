import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Trophy, RotateCcw, Edit } from 'lucide-react';

interface QuizResultsProps {
  score: { correct: number; total: number };
  onPlayAgain: () => void;
  onBackToEditor: () => void;
  isAdmin: boolean;
}

export default function QuizResults({ score, onPlayAgain, onBackToEditor, isAdmin }: QuizResultsProps) {
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
        <CardHeader className="text-center pb-3 sm:pb-4 p-4 sm:p-6">
          <div className="mx-auto mb-3 sm:mb-4 inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10">
            <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl mb-2">Quiz Complete!</CardTitle>
          <p className="text-lg sm:text-xl text-muted-foreground">{getMessage()}</p>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
          <div className="text-center py-6 sm:py-8 bg-muted/30 rounded-lg">
            <div className={`text-5xl sm:text-6xl font-bold mb-2 ${getColor()}`}>{percentage}%</div>
            <p className="text-sm sm:text-base text-muted-foreground">
              {score.correct} correct out of {score.total} questions
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="p-3 sm:p-4 rounded-lg bg-card border">
              <div className="text-xl sm:text-2xl font-bold">{score.total}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Total Answered</div>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-card border">
              <div className="text-xl sm:text-2xl font-bold success-text">{score.correct}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-card border">
              <div className="text-xl sm:text-2xl font-bold text-destructive">{score.total - score.correct}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Incorrect</div>
            </div>
          </div>

          <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-center">
            <Button onClick={onPlayAgain} size="sm" className="w-full sm:w-auto sm:min-w-[140px]">
              <RotateCcw className="h-4 w-4 mr-2" />
              Play Again
            </Button>
            {isAdmin && (
              <Button onClick={onBackToEditor} variant="outline" size="sm" className="w-full sm:w-auto sm:min-w-[140px]">
                <Edit className="h-4 w-4 mr-2" />
                Edit Questions
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
