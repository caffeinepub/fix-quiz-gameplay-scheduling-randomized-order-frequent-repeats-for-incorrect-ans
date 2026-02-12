import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';

interface StudyArticleViewProps {
  questionText: string;
  questionNumber: number;
  studyArticle?: string;
  onBack: () => void;
}

export default function StudyArticleView({ questionText, questionNumber, studyArticle, onBack }: StudyArticleViewProps) {
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

  const hasArticle = studyArticle && studyArticle.trim().length > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl sm:text-3xl">
              Study Article
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
            Question #{questionNumber}
          </p>
        </CardHeader>
        <CardContent>
          {!hasArticle && (
            <Alert className="mb-6">
              <BookOpen className="h-5 w-5" />
              <AlertTitle className="font-semibold">No Study Article Available</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-4">
                  No study article is available for this question. The administrator has not yet added educational content for this topic.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Wrong Answers
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {hasArticle && (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Question reference */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Question:</p>
                  <p className="text-base leading-relaxed">{questionText}</p>
                </div>

                {/* Article content */}
                <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                    {studyArticle}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
