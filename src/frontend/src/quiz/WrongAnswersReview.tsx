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
              {wrongAnswers.map((entry) => (
                <Card key={entry.questionGlobalIndex} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-muted-foreground mb-2">
                          Question {entry.questionNumber}
                        </div>
                        <p className="text-base leading-relaxed">
                          {entry.questionText}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
