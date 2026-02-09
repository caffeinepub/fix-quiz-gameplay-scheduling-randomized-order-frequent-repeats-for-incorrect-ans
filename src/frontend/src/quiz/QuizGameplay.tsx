import { useState, useEffect } from 'react';
import { useGetAllQuestions, useGetAllBlockNames } from '../hooks/useQueries';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { createRandomSubset } from './randomSubset';
import { AdaptiveScheduler } from './adaptiveScheduler';
import { getQuestionsForBlock, getCombinedBlockLabel, getBlockCount } from './blockUtils';
import PreGameQuestionCountView from './PreGameQuestionCountView';
import PreQuizSummaryView from './PreQuizSummaryView';
import type { Question } from '../backend';
import type { WrongAnswerEntry } from './wrongAnswerTypes';
import { useQuestionTranslation } from '../hooks/useQuestionTranslation';

type QuizStep = 'blockSelection' | 'questionCount' | 'summary' | 'quiz';

interface QuizGameplayProps {
  quizId: string;
  onComplete: (correct: number, total: number, wrongAnswers: WrongAnswerEntry[]) => void;
  onStepChange?: (isActiveQuiz: boolean) => void;
}

export default function QuizGameplay({ quizId, onComplete, onStepChange }: QuizGameplayProps) {
  const { data: allQuestions = [], isLoading: questionsLoading } = useGetAllQuestions(quizId);
  const { data: blockNamesData = [] } = useGetAllBlockNames(quizId);

  const [currentStep, setCurrentStep] = useState<QuizStep>('blockSelection');
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(10);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [scheduler, setScheduler] = useState<AdaptiveScheduler | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const { getTranslation, isTranslating, error: translationError } = useQuestionTranslation();
  const [translatedText, setTranslatedText] = useState<string | null>(null);

  const blockNamesMap = new Map(blockNamesData);
  const totalBlocks = getBlockCount(allQuestions.length);

  // Notify parent when step changes - only 'quiz' step is active quiz
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep === 'quiz');
    }
  }, [currentStep, onStepChange]);

  // Reset translation when question changes
  useEffect(() => {
    setTranslatedText(null);
  }, [currentQuestionId]);

  // Fetch translation when toggle is enabled
  useEffect(() => {
    if (showTranslation && !translatedText && sessionQuestions[currentQuestionId]) {
      const currentQuestion = sessionQuestions[currentQuestionId];
      getTranslation(currentQuestion.text).then(setTranslatedText);
    }
  }, [showTranslation, translatedText, currentQuestionId, sessionQuestions, getTranslation]);

  const handleBlockSelect = (blockIndex: number) => {
    setSelectedBlockIndex(blockIndex);
    setCurrentStep('questionCount');
  };

  const handleQuestionCountSelect = (count: number) => {
    setSelectedQuestionCount(count);
    setCurrentStep('summary');
  };

  const handleBackToBlockSelection = () => {
    setCurrentStep('blockSelection');
    setSelectedBlockIndex(null);
  };

  const handleBackToQuestionCount = () => {
    setCurrentStep('questionCount');
  };

  const handleStartQuiz = () => {
    if (selectedBlockIndex === null) return;

    const blockQuestions = getQuestionsForBlock(allQuestions, selectedBlockIndex);
    const subsetIndices = createRandomSubset(blockQuestions.length, selectedQuestionCount);
    const subset = subsetIndices.map(idx => blockQuestions[idx]);
    const newScheduler = new AdaptiveScheduler(subset.length);

    setSessionQuestions(subset);
    setScheduler(newScheduler);
    setCurrentQuestionId(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setCurrentStep('quiz');
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showFeedback) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || !scheduler) return;

    const currentQuestion = sessionQuestions[currentQuestionId];
    const correct = selectedAnswer === Number(currentQuestion.correctAnswer);
    setIsCorrect(correct);
    setShowFeedback(true);

    scheduler.recordAnswer(currentQuestionId, correct);
  };

  const handleNextQuestion = () => {
    if (!scheduler) return;

    if (scheduler.isSessionComplete()) {
      const wrongAnswersList: WrongAnswerEntry[] = [];
      const performance = scheduler.getPerformance();
      let correctCount = 0;

      performance.forEach((perf, qId) => {
        if (perf.incorrectCount > 0) {
          wrongAnswersList.push({
            questionNumber: qId + 1,
            questionText: sessionQuestions[qId].text,
          });
        }
        if (perf.correctCount > 0) {
          correctCount++;
        }
      });

      onComplete(correctCount, sessionQuestions.length, wrongAnswersList);
    } else {
      const nextId = scheduler.getNextQuestion(currentQuestionId);
      setCurrentQuestionId(nextId);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setIsCorrect(false);
    }
  };

  if (questionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (allQuestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert>
          <AlertDescription>
            No questions available. Please contact an administrator to add questions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Block selection step
  if (currentStep === 'blockSelection') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Question Block</CardTitle>
            <CardDescription>
              Choose a block of 100 questions to practice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: totalBlocks }, (_, i) => {
                const blockQuestions = getQuestionsForBlock(allQuestions, i);
                const blockLabel = getCombinedBlockLabel(i, blockNamesMap.get(i));
                return (
                  <Button
                    key={i}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-start"
                    onClick={() => handleBlockSelect(i)}
                  >
                    <div className="font-semibold">{blockLabel}</div>
                    <div className="text-sm text-muted-foreground">
                      {blockQuestions.length} questions
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Question count selection step
  if (currentStep === 'questionCount') {
    const blockQuestions = selectedBlockIndex !== null
      ? getQuestionsForBlock(allQuestions, selectedBlockIndex)
      : [];

    return (
      <PreGameQuestionCountView
        maxQuestions={blockQuestions.length}
        onStart={handleQuestionCountSelect}
        onBack={handleBackToBlockSelection}
        isLoading={false}
      />
    );
  }

  // Summary step
  if (currentStep === 'summary') {
    const blockQuestions = selectedBlockIndex !== null
      ? getQuestionsForBlock(allQuestions, selectedBlockIndex)
      : [];

    return (
      <PreQuizSummaryView
        selectedBlockIndex={selectedBlockIndex}
        selectedQuestionCount={selectedQuestionCount}
        blockQuestions={blockQuestions}
        blockNamesMap={blockNamesMap}
        onStartQuiz={handleStartQuiz}
        onBackToQuestionCount={handleBackToQuestionCount}
        onBackToBlockSelection={handleBackToBlockSelection}
      />
    );
  }

  // Active quiz step
  const currentQuestion = sessionQuestions[currentQuestionId];
  const performance = scheduler?.getPerformance().get(currentQuestionId);
  const attemptNumber = performance ? performance.attempts + 1 : 1;

  return (
    <div className="quiz-gameplay-container">
      <div className="quiz-gameplay-scroll-container">
        <div className="max-w-3xl mx-auto px-4 pt-6 pb-2">
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToBlockSelection}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Block Selection
            </Button>
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>
                Question {currentQuestionId + 1} of {sessionQuestions.length}
              </span>
              {attemptNumber > 1 && (
                <span className="text-xs">Attempt #{attemptNumber}</span>
              )}
            </div>
          </div>

          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-xl leading-relaxed flex-1">
                  {currentQuestion.text}
                </CardTitle>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    id="translation-toggle"
                    checked={showTranslation}
                    onCheckedChange={setShowTranslation}
                  />
                  <Label
                    htmlFor="translation-toggle"
                    className="text-sm cursor-pointer whitespace-nowrap flex items-center gap-1"
                  >
                    <img
                      src="/assets/generated/english-flag-icon.dim_24x24.png"
                      alt="EN"
                      className="w-5 h-5"
                    />
                  </Label>
                </div>
              </div>

              {showTranslation && (
                <div className="pt-2 border-t">
                  {isTranslating ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Translating...
                    </div>
                  ) : translationError ? (
                    <div className="text-sm text-destructive">
                      Translation unavailable
                    </div>
                  ) : translatedText ? (
                    <div className="text-base text-muted-foreground italic">
                      {translatedText}
                    </div>
                  ) : null}
                </div>
              )}

              {currentQuestion.imageUrl && (
                <div className="mt-3">
                  <img
                    src={currentQuestion.imageUrl.getDirectURL()}
                    alt="Question"
                    className="max-w-full h-auto rounded-lg border"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {currentQuestion.answers.map((answer, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectAnswer = index === Number(currentQuestion.correctAnswer);
                const showCorrect = showFeedback && isCorrectAnswer;
                const showIncorrect = showFeedback && isSelected && !isCorrect;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showFeedback}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      showCorrect
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : showIncorrect
                        ? 'border-red-500 bg-red-50 dark:bg-red-950'
                        : isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex-1">{answer}</span>
                      {showCorrect && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />}
                      {showIncorrect && <XCircle className="h-5 w-5 text-red-600 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="quiz-gameplay-action-bar">
        <div className="max-w-3xl mx-auto px-4">
          {!showFeedback ? (
            <Button
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null}
              className="w-full"
              size="lg"
            >
              Submit Answer
            </Button>
          ) : (
            <div className="space-y-2">
              <Alert variant={isCorrect ? 'default' : 'destructive'} className="py-2">
                <AlertDescription className="text-center font-medium">
                  {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </AlertDescription>
              </Alert>
              <Button onClick={handleNextQuestion} className="w-full" size="lg">
                Next Question
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
