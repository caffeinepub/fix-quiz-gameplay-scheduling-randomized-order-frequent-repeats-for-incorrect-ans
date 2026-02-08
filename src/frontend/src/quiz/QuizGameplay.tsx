import { useState, useEffect } from 'react';
import { useGetQuestionChunk, useGetQuestionCount, useGetAllBlockNames } from '../hooks/useQueries';
import { useQuestionTranslation } from '../hooks/useQuestionTranslation';
import { AdaptiveScheduler } from './adaptiveScheduler';
import type { SessionState, QuestionPerformance } from './sessionTypes';
import type { Question, QuizId } from './types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { CheckCircle, XCircle, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { getAvailableBlockIndices, getCombinedBlockLabel } from './blockUtils';
import { getExternalBlobUrl } from './imageUtils';
import TroubleshootingPanel from './TroubleshootingPanel';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';

interface QuizGameplayProps {
  quizId: QuizId;
  onComplete: (correct: number, total: number) => void;
  onBack: () => void;
  isAdmin: boolean;
}

export default function QuizGameplay({ quizId, onComplete, onBack, isAdmin }: QuizGameplayProps) {
  const { data: questionCountBigInt } = useGetQuestionCount(quizId);
  const { data: blockNamesMap } = useGetAllBlockNames(quizId);
  
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [blockSelectionComplete, setBlockSelectionComplete] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  
  const { data: questions, isLoading: questionsLoading } = useGetQuestionChunk(
    quizId,
    selectedBlockIndex ?? 0,
    blockSelectionComplete && selectedBlockIndex !== null
  );
  
  const { getTranslation, getCachedTranslation, isTranslating, error: translationError, clearError } = useQuestionTranslation();
  
  const [scheduler, setScheduler] = useState<AdaptiveScheduler | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);

  const totalQuestions = questionCountBigInt ? Number(questionCountBigInt) : 0;
  const availableBlocks = getAvailableBlockIndices(totalQuestions);

  useEffect(() => {
    if (questions && questions.length > 0 && blockSelectionComplete) {
      const newScheduler = new AdaptiveScheduler(questions.length);
      setScheduler(newScheduler);
      
      const performanceMap = new Map<number, QuestionPerformance>();
      for (let i = 0; i < questions.length; i++) {
        performanceMap.set(i, {
          questionId: i,
          attempts: 0,
          correctCount: 0,
          incorrectCount: 0,
          lastResult: null,
          everMissed: false,
          correctAfterMissCount: 0,
          lastShownAt: -1,
        });
      }
      
      setSessionState({
        performance: performanceMap,
        totalAnswered: 0,
        totalCorrect: 0,
        isComplete: false,
      });
      setCurrentQuestionId(newScheduler.getNextQuestion(undefined));
      setSelectedAnswer(null);
      setShowFeedback(false);
      setIsCorrect(false);
    }
  }, [questions, blockSelectionComplete]);

  // Show translation error as toast
  useEffect(() => {
    if (translationError) {
      toast.error(translationError);
      clearError();
    }
  }, [translationError, clearError]);

  // Reset translation state when question changes
  useEffect(() => {
    setShowTranslation(false);
    setTranslatedText(null);
  }, [currentQuestionId]);

  const handleBlockSelect = (blockIndex: number) => {
    setSelectedBlockIndex(blockIndex);
    setBlockSelectionComplete(true);
  };

  // Block selection screen
  if (!blockSelectionComplete) {
    if (availableBlocks.length === 0) {
      return (
        <div className="max-w-2xl mx-auto">
          {isAdmin && (
            <Button variant="ghost" onClick={onBack} className="mb-3 sm:mb-4" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Editor
            </Button>
          )}
          
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Questions Found</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                This quiz doesn't have any questions yet. This could happen for two reasons:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>No questions have been uploaded to this quiz yet</li>
                <li>You are signed in with a different Internet Identity than the person who uploaded the questions</li>
              </ul>
              <p className="text-sm">
                Click the button below to view quiz data diagnostics and see all available quizzes.
              </p>
            </AlertDescription>
          </Alert>

          <TroubleshootingPanel 
            currentQuizId={quizId} 
            initialOpen={showTroubleshooting}
            onOpenChange={setShowTroubleshooting}
          />

          {!showTroubleshooting && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <Button 
                  onClick={() => setShowTroubleshooting(true)} 
                  className="w-full"
                  variant="outline"
                >
                  View Quiz Data Diagnostics
                </Button>
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card>
              <CardContent className="pt-6">
                <Button onClick={onBack} className="w-full" size="sm">
                  Go to Editor to Add Questions
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto">
        {isAdmin && (
          <Button variant="ghost" onClick={onBack} className="mb-3 sm:mb-4" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Select Question Block</CardTitle>
            <CardDescription className="text-sm">
              Choose which 100-question block you want to practice. Each block contains up to 100 questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            {availableBlocks.map((blockIdx) => {
              const blockLabel = getCombinedBlockLabel(blockIdx, blockNamesMap?.get(blockIdx));
              return (
                <Button
                  key={blockIdx}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 sm:py-4 px-3 sm:px-4"
                  onClick={() => handleBlockSelect(blockIdx)}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-sm sm:text-base">{blockLabel}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Practice questions in this block
                    </span>
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questionsLoading || !questions || !scheduler || !sessionState || currentQuestionId === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionId];
  
  // Calculate progress based on unique questions attempted (not total submissions)
  const uniqueQuestionsAttempted = Array.from(sessionState.performance.values()).filter(
    p => p.attempts > 0
  ).length;
  const progress = (uniqueQuestionsAttempted / questions.length) * 100;

  const handleAnswerSelect = (answerIndex: number) => {
    if (!showFeedback) {
      setSelectedAnswer(answerIndex);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    const correct = selectedAnswer === Number(currentQuestion.correctAnswer);
    setIsCorrect(correct);
    setShowFeedback(true);

    // Record answer in scheduler first (source of truth)
    scheduler.recordAnswer(currentQuestionId, correct);

    // Sync session state from scheduler
    const updatedPerformance = scheduler.getPerformance();
    const stats = scheduler.getStats();
    
    setSessionState({
      performance: updatedPerformance,
      totalAnswered: stats.totalAttempts,
      totalCorrect: stats.totalCorrect,
      isComplete: scheduler.isSessionComplete(),
    });
  };

  const handleNext = () => {
    // Check if session is complete via scheduler
    if (scheduler.isSessionComplete()) {
      onComplete(sessionState.totalCorrect, sessionState.totalAnswered);
      return;
    }

    const nextId = scheduler.getNextQuestion(currentQuestionId);
    setCurrentQuestionId(nextId);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setIsCorrect(false);
  };

  const handleTranslationPress = async () => {
    // Only translate if there is text to translate
    if (!currentQuestion.text || currentQuestion.text.trim().length === 0) {
      return;
    }

    // Check if we already have a cached translation
    const cached = getCachedTranslation(currentQuestion.text);
    if (cached) {
      setTranslatedText(cached);
      setShowTranslation(true);
      return;
    }

    // Fetch translation if not cached
    const translation = await getTranslation(currentQuestion.text);
    if (translation) {
      setTranslatedText(translation);
      setShowTranslation(true);
    }
  };

  const handleTranslationRelease = () => {
    setShowTranslation(false);
  };

  const hasQuestionText = currentQuestion.text && currentQuestion.text.trim().length > 0;
  const displayedQuestionText = showTranslation && translatedText ? translatedText : currentQuestion.text;
  const currentBlockLabel = getCombinedBlockLabel(
    selectedBlockIndex ?? 0,
    blockNamesMap?.get(selectedBlockIndex ?? 0)
  );

  // Get current question performance for feedback message
  const currentQuestionPerf = sessionState.performance.get(currentQuestionId);
  const needsMoreCorrect = currentQuestionPerf?.everMissed && currentQuestionPerf.correctAfterMissCount < 2;
  const correctsRemaining = needsMoreCorrect ? 2 - (currentQuestionPerf?.correctAfterMissCount ?? 0) : 0;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Top-aligned scrollable content area */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 sm:py-4 quiz-gameplay-scroll-container">
        <div className="w-full max-w-2xl mx-auto">
          {isAdmin && (
            <Button variant="ghost" onClick={onBack} className="mb-2 sm:mb-3" size="sm">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span className="text-xs sm:text-sm">Back to Editor</span>
            </Button>
          )}

          <Card className="quiz-mobile-scale">
            <CardHeader className="p-2.5 sm:p-6 pb-1.5 sm:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                <div className="flex-1 space-y-1.5 sm:space-y-3 min-w-0">
                  {hasQuestionText && (
                    <CardTitle className="text-sm sm:text-xl leading-snug break-words">{displayedQuestionText}</CardTitle>
                  )}
                  {currentQuestion.imageUrl && (
                    <div className="w-full">
                      <img
                        src={getExternalBlobUrl(currentQuestion.imageUrl)}
                        alt="Question"
                        className="w-full max-h-40 sm:max-h-96 object-contain rounded-lg border"
                      />
                    </div>
                  )}
                </div>
                {hasQuestionText && (
                  <button
                    onPointerDown={handleTranslationPress}
                    onPointerUp={handleTranslationRelease}
                    onPointerLeave={handleTranslationRelease}
                    onPointerCancel={handleTranslationRelease}
                    onMouseDown={handleTranslationPress}
                    onMouseUp={handleTranslationRelease}
                    onMouseLeave={handleTranslationRelease}
                    onTouchStart={handleTranslationPress}
                    onTouchEnd={handleTranslationRelease}
                    onTouchCancel={handleTranslationRelease}
                    disabled={isTranslating}
                    className="flex items-center justify-center px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md border-2 border-foreground/80 bg-background hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-none select-none shadow-sm shrink-0 h-9 sm:h-auto"
                    title="Press and hold to translate to English"
                    aria-label="Press and hold to translate to English"
                  >
                    {isTranslating ? (
                      <Loader2 className="h-3.5 w-3.5 sm:h-5 sm:w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="text-[0.65rem] sm:text-sm font-black uppercase tracking-wider text-foreground rotate-[-2deg] inline-block">
                        Plan-B
                      </span>
                    )}
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-4 p-2.5 sm:p-6 pt-0">
              <RadioGroup
                value={selectedAnswer !== null ? String(selectedAnswer) : ""}
                onValueChange={(value) => handleAnswerSelect(parseInt(value))}
                disabled={showFeedback}
              >
                {currentQuestion.answers.map((answer, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrectAnswer = index === Number(currentQuestion.correctAnswer);
                  const showAsCorrect = showFeedback && isCorrectAnswer;
                  const showAsWrong = showFeedback && isSelected && !isCorrect;

                  return (
                    <div
                      key={index}
                      className={`flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-4 rounded-lg border-2 transition-colors min-h-[44px] ${
                        showAsCorrect
                          ? 'border-success bg-success/10'
                          : showAsWrong
                          ? 'border-destructive bg-destructive/10'
                          : isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value={String(index)} id={`answer-${index}`} className="shrink-0" />
                      <Label
                        htmlFor={`answer-${index}`}
                        className="flex-1 cursor-pointer font-normal text-xs sm:text-base leading-snug break-words"
                      >
                        {answer}
                      </Label>
                      {showAsCorrect && <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success shrink-0" />}
                      {showAsWrong && <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive shrink-0" />}
                    </div>
                  );
                })}
              </RadioGroup>

              {showFeedback && (
                <div
                  className={`p-2.5 sm:p-4 rounded-lg ${
                    isCorrect ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 font-medium text-xs sm:text-base">
                    {isCorrect ? (
                      <>
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                        <span>
                          {needsMoreCorrect 
                            ? `Correct! Answer correctly ${correctsRemaining} more time${correctsRemaining > 1 ? 's' : ''} to master this question.`
                            : 'Correct!'}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                        <span>Incorrect - You'll need to answer this correctly twice to master it</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div className="quiz-gameplay-action-bar border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
          {!showFeedback ? (
            <Button 
              onClick={handleSubmit} 
              disabled={selectedAnswer === null} 
              className="w-full text-xs sm:text-sm h-10 sm:h-auto" 
              size="sm"
            >
              Submit Answer
            </Button>
          ) : (
            <Button 
              onClick={handleNext} 
              className="w-full text-xs sm:text-sm h-10 sm:h-auto" 
              size="sm"
            >
              {scheduler.isSessionComplete() ? 'View Results' : 'Next Question'}
            </Button>
          )}
        </div>
      </div>

      {/* Fixed bottom progress bar */}
      <div className="border-t bg-card px-2 sm:px-4 py-2 sm:py-3 safe-area-inset-bottom">
        <div className="w-full max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2 text-[0.65rem] sm:text-sm text-muted-foreground">
            <span className="font-medium">{currentBlockLabel}</span>
            <span>
              {uniqueQuestionsAttempted} / {questions.length} questions
            </span>
          </div>
          <Progress value={progress} className="h-1.5 sm:h-2" />
          <div className="flex items-center justify-between mt-1 sm:mt-1.5 text-[0.6rem] sm:text-xs text-muted-foreground">
            <span>Score: {sessionState.totalCorrect} / {sessionState.totalAnswered}</span>
            <span>
              {sessionState.totalAnswered > 0
                ? `${Math.round((sessionState.totalCorrect / sessionState.totalAnswered) * 100)}% correct`
                : 'No answers yet'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
