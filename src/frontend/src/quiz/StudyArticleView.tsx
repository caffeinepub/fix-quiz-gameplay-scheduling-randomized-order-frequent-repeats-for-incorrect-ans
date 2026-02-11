import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { useGenerateArticle } from '../hooks/useGenerateArticle';

interface StudyArticleViewProps {
  questionText: string;
  questionNumber: number;
  onBack: () => void;
}

export default function StudyArticleView({ questionText, questionNumber, onBack }: StudyArticleViewProps) {
  const { data: article, isLoading, error } = useGenerateArticle(questionText);

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
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating educational article...</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="font-semibold">Article Generation Failed</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-2">
                  The educational article could not be generated at this time. This feature requires real content to be available.
                </p>
                <p className="text-sm opacity-90">
                  Error: {error instanceof Error ? error.message : 'Unknown error occurred'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                  className="mt-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Wrong Answers
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {article && !isLoading && !error && (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Question reference */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Question:</p>
                  <p className="text-base leading-relaxed">{questionText}</p>
                </div>

                {/* Article title */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">{article.title}</h2>
                </div>

                {/* Article content */}
                <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                    {article.content}
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
