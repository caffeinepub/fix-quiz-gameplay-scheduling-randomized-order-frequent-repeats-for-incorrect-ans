import { useState, useEffect } from 'react';
import { useGetQuestionChunk, useGetQuestionCount, useGetAllBlockNames } from '../hooks/useQueries';
import { useQuestionTranslation } from '../hooks/useQuestionTranslation';
import { AdaptiveScheduler } from './adaptiveScheduler';
import type { SessionState, QuestionPerformance } from './sessionTypes';
import type { Question, QuizId } from './types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { getAvailableBlockIndices, getCombinedBlockLabel } from './blockUtils';

interface QuizGameplayProps {
  quizId: QuizId;
  onComplete: (correct: number, total: number) => void;
  onBack: () => void;
}

export default function QuizGameplay({ quizId, onComplete, onBack }: QuizGameplayProps) {
  const { data: questionCountBigInt } = useGetQuestionCount(quizId);
  const { data: blockNamesMap } = useGetAllBlockNames(quizId);
  
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [blockSelectionComplete, setBlockSelectionComplete] = useState(false);
  
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
          postCorrectRepeatsNeeded: 0,
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
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>No Questions Available</CardTitle>
              <CardDescription>
                This quiz doesn't have any questions yet. Please add questions in the editor first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={onBack} className="w-full">
                Go to Editor
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Editor
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Select Question Block</CardTitle>
            <CardDescription>
              Choose which 100-question block you want to practice. Each block contains up to 100 questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableBlocks.map((blockIdx) => {
              const blockLabel = getCombinedBlockLabel(blockIdx, blockNamesMap?.get(blockIdx));
              return (
                <Button
                  key={blockIdx}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4"
                  onClick={() => handleBlockSelect(blockIdx)}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold">{blockLabel}</span>
                    <span className="text-sm text-muted-foreground">
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quiz...</p>
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

    const newSessionState = { ...sessionState };
    newSessionState.totalAnswered++;
    if (correct) {
      newSessionState.totalCorrect++;
    }

    const questionPerf = newSessionState.performance.get(currentQuestionId);
    if (questionPerf) {
      questionPerf.attempts++;
      if (correct) {
        questionPerf.correctCount++;
        
        // Handle post-correct repeats for previously missed questions
        if (questionPerf.everMissed && questionPerf.postCorrectRepeatsNeeded === 0 && questionPerf.incorrectCount > 0) {
          questionPerf.postCorrectRepeatsNeeded = Math.floor(Math.random() * 2) + 1;
        } else if (questionPerf.postCorrectRepeatsNeeded > 0) {
          questionPerf.postCorrectRepeatsNeeded--;
        }
      } else {
        questionPerf.incorrectCount++;
        questionPerf.everMissed = true;
      }
      questionPerf.lastResult = correct ? 'correct' : 'incorrect';
    }

    scheduler.recordAnswer(currentQuestionId, correct);
    setSessionState(newSessionState);
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

  const displayedQuestionText = showTranslation && translatedText ? translatedText : currentQuestion.text;
  const currentBlockLabel = getCombinedBlockLabel(
    selectedBlockIndex ?? 0,
    blockNamesMap?.get(selectedBlockIndex ?? 0)
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Editor
        </Button>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Block: {currentBlockLabel}
            </span>
            <span className="text-muted-foreground">
              Progress: {uniqueQuestionsAttempted} of {questions.length} questions attempted
            </span>
            <span className="font-medium">
              Score: {sessionState.totalCorrect}/{sessionState.totalAnswered}
            </span>
          </div>
          <Progress value={progress} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl flex-1">{displayedQuestionText}</CardTitle>
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
              className="flex items-center justify-center px-3 py-2 rounded-md border-2 border-foreground/80 bg-background hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-none select-none shadow-sm"
              title="Press and hold to translate to English"
              aria-label="Press and hold to translate to English"
            >
              {isTranslating ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-sm font-black uppercase tracking-wider text-foreground rotate-[-2deg] inline-block">
                  Plan-B
                </span>
              )}
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                    showAsCorrect
                      ? 'border-success bg-success/10'
                      : showAsWrong
                      ? 'border-destructive bg-destructive/10'
                      : isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={String(index)} id={`answer-${index}`} />
                  <Label
                    htmlFor={`answer-${index}`}
                    className="flex-1 cursor-pointer font-normal"
                  >
                    {answer}
                  </Label>
                  {showAsCorrect && <CheckCircle className="h-5 w-5 text-success" />}
                  {showAsWrong && <XCircle className="h-5 w-5 text-destructive" />}
                </div>
              );
            })}
          </RadioGroup>

          {showFeedback && (
            <div
              className={`p-4 rounded-lg ${
                isCorrect ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {isCorrect ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Correct!
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    Incorrect - You'll see this question again soon
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            {!showFeedback ? (
              <Button onClick={handleSubmit} disabled={selectedAnswer === null}>
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext}>
                {scheduler.isSessionComplete() ? 'View Results' : 'Next Question'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
