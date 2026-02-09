import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';
import type { WrongAnswerEntry } from './wrongAnswerTypes';

interface WrongAnswersReviewProps {
  wrongAnswers: WrongAnswerEntry[];
  onBack: () => void;
}

export default function WrongAnswersReview({ wrongAnswers, onBack }: WrongAnswersReviewProps) {
  // Handle Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onBack]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl sm:text-3xl">
              Wrong Answers Review
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Esc
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Review the {wrongAnswers.length} question{wrongAnswers.length !== 1 ? 's' : ''} you answered incorrectly
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4 pr-4">
              {wrongAnswers.map((entry, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex gap-3">
                    <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive font-semibold">
                      {entry.questionNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base leading-relaxed break-words">
                        {entry.questionText}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
