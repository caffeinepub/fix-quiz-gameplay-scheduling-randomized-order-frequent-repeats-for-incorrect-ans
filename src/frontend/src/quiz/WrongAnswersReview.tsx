import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import type { WrongAnswerEntry } from './wrongAnswerTypes';

interface WrongAnswersReviewProps {
  wrongAnswers: WrongAnswerEntry[];
  onBack: () => void;
}

export default function WrongAnswersReview({ wrongAnswers, onBack }: WrongAnswersReviewProps) {
  // Handle Escape key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Results
          </Button>
          <h1 className="text-3xl font-bold">Review Wrong Answers</h1>
        </div>

        <Card className="shadow-cyber">
          <CardHeader>
            <CardTitle>Questions You Missed</CardTitle>
          </CardHeader>
          <CardContent>
            {wrongAnswers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No wrong answers to review. Great job!
              </p>
            ) : (
              <div className="space-y-4">
                {wrongAnswers.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/20 text-destructive flex items-center justify-center font-semibold text-sm">
                        {entry.questionNumber}
                      </div>
                      <div className="flex-1">
                        <p className="text-base leading-relaxed">{entry.questionText}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button onClick={onBack} variant="default" size="lg">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Results
          </Button>
        </div>
      </div>
    </div>
  );
}
