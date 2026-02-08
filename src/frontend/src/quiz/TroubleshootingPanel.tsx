import { useState } from 'react';
import { useListAllQuizzes, useGetAllQuizCounts } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Button } from '../components/ui/button';
import { ChevronDown, ChevronUp, Database, AlertCircle } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import type { QuizId } from './types';

interface TroubleshootingPanelProps {
  currentQuizId: QuizId;
  initialOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function TroubleshootingPanel({ 
  currentQuizId, 
  initialOpen = false,
  onOpenChange 
}: TroubleshootingPanelProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const { data: quizzesData, isLoading: quizzesLoading } = useListAllQuizzes();
  const availableQuizzes = quizzesData?.[1] || [];
  const { data: quizCounts, isLoading: countsLoading } = useGetAllQuizCounts(availableQuizzes);

  const isLoading = quizzesLoading || countsLoading;

  const currentQuizCount = quizCounts?.[currentQuizId] || 0;
  const otherQuizzesWithQuestions = availableQuizzes
    .filter(id => id !== currentQuizId && (quizCounts?.[id] || 0) > 0)
    .map(id => ({ id, count: quizCounts?.[id] || 0 }));

  const hasOtherQuizzesWithQuestions = otherQuizzesWithQuestions.length > 0;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange} className="mb-6">
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Quiz Data Troubleshooting</CardTitle>
                  <CardDescription>
                    View all your saved quizzes and question counts
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Loading quiz data...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Quiz Status */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Current Quiz</h4>
                    <Badge variant="outline" className="bg-primary/10">Active</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{currentQuizId}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentQuizCount} question{currentQuizCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Warning if current quiz is empty but others have questions */}
                {currentQuizCount === 0 && hasOtherQuizzesWithQuestions && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Questions Found in Other Quizzes</AlertTitle>
                    <AlertDescription>
                      Your current quiz "{currentQuizId}" has 0 questions, but you have {otherQuizzesWithQuestions.length} other quiz{otherQuizzesWithQuestions.length !== 1 ? 'zes' : ''} with saved questions. See below for details.
                    </AlertDescription>
                  </Alert>
                )}

                {/* All Available Quizzes */}
                {availableQuizzes.length > 0 ? (
                  <div>
                    <h4 className="font-semibold text-sm mb-3">All Your Quizzes ({availableQuizzes.length})</h4>
                    <div className="space-y-2">
                      {availableQuizzes.map(quizId => {
                        const count = quizCounts?.[quizId] || 0;
                        const isCurrent = quizId === currentQuizId;
                        return (
                          <div
                            key={quizId}
                            className={`p-3 border rounded-lg flex items-center justify-between ${
                              isCurrent ? 'bg-primary/5 border-primary/20' : 'bg-background'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm truncate">{quizId}</p>
                                {isCurrent && (
                                  <Badge variant="outline" className="text-xs shrink-0">Current</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {count} question{count !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <Badge
                              variant={count > 0 ? 'default' : 'secondary'}
                              className="ml-2 shrink-0"
                            >
                              {count}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Quizzes Found</AlertTitle>
                    <AlertDescription>
                      You don't have any saved quizzes yet. Create and save your first quiz to see it here.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Summary */}
                <div className="pt-4 border-t text-xs text-muted-foreground">
                  <p>
                    <strong>Total quizzes:</strong> {availableQuizzes.length}
                  </p>
                  <p>
                    <strong>Total questions across all quizzes:</strong>{' '}
                    {Object.values(quizCounts || {}).reduce((sum, count) => sum + count, 0)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
