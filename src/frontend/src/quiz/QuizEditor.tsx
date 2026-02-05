import { useState, useEffect } from 'react';
import { useGetAllQuestions, useSaveQuestions, useListAllQuizzes, useGetAllQuizCounts, useGetFirst20Questions, useGetQuestionCount, useGetAllBlockNames, useSetBlockName } from '../hooks/useQueries';
import { useQuizRecovery } from '../hooks/useQuizRecovery';
import { validateQuestions } from './validation';
import type { Question, QuizId } from './types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Plus, Trash2, Save, Play, AlertCircle, Search, RefreshCw, Eye, Edit2, Check, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import TroubleshootingPanel from './TroubleshootingPanel';
import { getAvailableBlockIndices, getCombinedBlockLabel, getBlockRange } from './blockUtils';

interface QuizEditorProps {
  quizId: QuizId;
  onStartQuiz: () => void;
}

function QuizRecoveryPrompt({ 
  currentQuizId, 
  onRecover 
}: { 
  currentQuizId: QuizId; 
  onRecover: () => void;
}) {
  const { data: quizzesData } = useListAllQuizzes();
  const [selectedQuizId, setSelectedQuizId] = useState<QuizId | null>(null);
  const { recoverFromQuiz, isRecovering } = useQuizRecovery();

  const availableQuizzes = quizzesData?.[1] || [];
  const otherQuizzes = availableQuizzes.filter(id => id !== currentQuizId);

  const { data: quizCounts, isLoading: countsLoading } = useGetAllQuizCounts(otherQuizzes);

  const quizOptions = otherQuizzes
    .map(quizId => ({
      quizId,
      questionCount: quizCounts?.[quizId] || 0,
    }))
    .filter(option => option.questionCount > 0);

  const handleRecover = async () => {
    if (!selectedQuizId) {
      toast.error('Please select a quiz to restore from');
      return;
    }

    try {
      await recoverFromQuiz(selectedQuizId, currentQuizId);
      toast.success('Questions restored successfully!');
      onRecover();
    } catch (error: any) {
      toast.error(error.message || 'Failed to restore questions');
    }
  };

  if (countsLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Checking for available quizzes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (otherQuizzes.length === 0 || quizOptions.length === 0) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Questions Yet</AlertTitle>
        <AlertDescription>
          You don't have any saved quizzes to restore from. Start by creating your first question below.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Restore Questions
        </CardTitle>
        <CardDescription>
          Your current quiz is empty. You can restore questions from one of your existing quizzes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label>Select a quiz to restore from:</Label>
          <RadioGroup value={selectedQuizId || ''} onValueChange={setSelectedQuizId}>
            {quizOptions.map(({ quizId, questionCount }) => (
              <div key={quizId} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <RadioGroupItem value={quizId} id={`quiz-${quizId}`} />
                <Label htmlFor={`quiz-${quizId}`} className="flex-1 cursor-pointer">
                  <div className="font-medium">{quizId}</div>
                  <div className="text-sm text-muted-foreground">
                    {questionCount} question{questionCount !== 1 ? 's' : ''}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <Button
          onClick={handleRecover}
          disabled={!selectedQuizId || isRecovering}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRecovering ? 'animate-spin' : ''}`} />
          {isRecovering ? 'Restoring...' : 'Restore Questions'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function QuizEditor({ quizId, onStartQuiz }: QuizEditorProps) {
  const { data: savedQuestions, isLoading } = useGetAllQuestions(quizId);
  const { data: questionCountBigInt } = useGetQuestionCount(quizId);
  const { data: blockNamesMap } = useGetAllBlockNames(quizId);
  const setBlockNameMutation = useSetBlockName(quizId);
  const saveQuestions = useSaveQuestions(quizId);

  const [questions, setQuestions] = useState<Question[]>([
    {
      text: '',
      answers: ['', ''],
      correctAnswer: BigInt(0),
    },
  ]);

  const [errors, setErrors] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [showFirst20Dialog, setShowFirst20Dialog] = useState(false);
  const [enableFirst20Fetch, setEnableFirst20Fetch] = useState(false);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [isEditingBlockName, setIsEditingBlockName] = useState(false);
  const [editBlockName, setEditBlockName] = useState('');
  const pageSize = 10;

  const { data: first20Questions, isLoading: first20Loading, error: first20Error } = useGetFirst20Questions(quizId, enableFirst20Fetch);

  const totalQuestions = questionCountBigInt ? Number(questionCountBigInt) : questions.length;
  const availableBlocks = getAvailableBlockIndices(totalQuestions);

  useEffect(() => {
    if (savedQuestions && savedQuestions.length > 0) {
      setQuestions(savedQuestions);
      setShowRestorePrompt(false);
    } else if (savedQuestions && savedQuestions.length === 0) {
      setShowRestorePrompt(true);
    }
  }, [savedQuestions]);

  useEffect(() => {
    if (first20Questions && enableFirst20Fetch) {
      setShowFirst20Dialog(true);
    }
  }, [first20Questions, enableFirst20Fetch]);

  useEffect(() => {
    if (first20Error && enableFirst20Fetch) {
      toast.error('Failed to load first 20 questions');
      setEnableFirst20Fetch(false);
    }
  }, [first20Error, enableFirst20Fetch]);

  // Filter questions by selected block
  const blockRange = getBlockRange(selectedBlockIndex);
  const questionsInBlock = questions.slice(blockRange.start, blockRange.end);

  const filteredQuestions = questionsInBlock.filter(q =>
    q.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredQuestions.length / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredQuestions.length);
  const displayedQuestions = filteredQuestions.slice(startIndex, endIndex);

  const updateQuestion = (globalIndex: number, field: 'text', value: string) => {
    const newQuestions = [...questions];
    newQuestions[globalIndex] = { ...newQuestions[globalIndex], [field]: value };
    setQuestions(newQuestions);
  };

  const updateAnswer = (globalIndex: number, answerIndex: number, value: string) => {
    const newQuestions = [...questions];
    const newAnswers = [...newQuestions[globalIndex].answers];
    newAnswers[answerIndex] = value;
    newQuestions[globalIndex] = { ...newQuestions[globalIndex], answers: newAnswers };
    setQuestions(newQuestions);
  };

  const addAnswer = (globalIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[globalIndex].answers.length < 6) {
      newQuestions[globalIndex] = {
        ...newQuestions[globalIndex],
        answers: [...newQuestions[globalIndex].answers, ''],
      };
      setQuestions(newQuestions);
    }
  };

  const removeAnswer = (globalIndex: number, answerIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[globalIndex].answers.length > 2) {
      const newAnswers = newQuestions[globalIndex].answers.filter((_, i) => i !== answerIndex);
      let correctAnswer = Number(newQuestions[globalIndex].correctAnswer);
      if (correctAnswer === answerIndex) {
        correctAnswer = 0;
      } else if (correctAnswer > answerIndex) {
        correctAnswer--;
      }
      newQuestions[globalIndex] = {
        ...newQuestions[globalIndex],
        answers: newAnswers,
        correctAnswer: BigInt(correctAnswer),
      };
      setQuestions(newQuestions);
    }
  };

  const setCorrectAnswer = (globalIndex: number, answerIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[globalIndex] = {
      ...newQuestions[globalIndex],
      correctAnswer: BigInt(answerIndex),
    };
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    const newQuestion = {
      text: '',
      answers: ['', ''],
      correctAnswer: BigInt(0),
    };
    
    // Insert at the end of the current block
    const insertIndex = Math.min(blockRange.end, questions.length);
    const newQuestions = [
      ...questions.slice(0, insertIndex),
      newQuestion,
      ...questions.slice(insertIndex),
    ];
    
    setQuestions(newQuestions);
  };

  const removeQuestion = (globalIndex: number) => {
    const newQuestions = questions.filter((_, i) => i !== globalIndex);
    setQuestions(newQuestions.length > 0 ? newQuestions : [{
      text: '',
      answers: ['', ''],
      correctAnswer: BigInt(0),
    }]);
  };

  const handleSave = async () => {
    const validationErrors = validateQuestions(questions);
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => e.message));
      toast.error('Please fix the errors before saving');
      return;
    }

    setErrors([]);
    try {
      await saveQuestions.mutateAsync(questions);
      toast.success('Quiz saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save quiz');
    }
  };

  const handleStartQuiz = () => {
    const validationErrors = validateQuestions(questions);
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => e.message));
      toast.error('Please fix the errors and save before playing');
      return;
    }

    if (!savedQuestions || savedQuestions.length === 0) {
      toast.error('Please save your quiz before playing');
      return;
    }

    onStartQuiz();
  };

  const handleShowFirst20 = () => {
    setEnableFirst20Fetch(true);
  };

  const handleCloseFirst20Dialog = () => {
    setShowFirst20Dialog(false);
    setEnableFirst20Fetch(false);
  };

  const handleBlockChange = (value: string) => {
    setSelectedBlockIndex(parseInt(value));
    setCurrentPage(0);
    setSearchTerm('');
  };

  const handleEditBlockName = () => {
    const currentName = blockNamesMap?.get(selectedBlockIndex) || '';
    setEditBlockName(currentName);
    setIsEditingBlockName(true);
  };

  const handleSaveBlockName = async () => {
    try {
      await setBlockNameMutation.mutateAsync({
        blockIndex: selectedBlockIndex,
        blockName: editBlockName.trim(),
      });
      toast.success('Block name saved!');
      setIsEditingBlockName(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save block name');
    }
  };

  const handleCancelEditBlockName = () => {
    setIsEditingBlockName(false);
    setEditBlockName('');
  };

  const currentBlockLabel = getCombinedBlockLabel(
    selectedBlockIndex,
    blockNamesMap?.get(selectedBlockIndex)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <TroubleshootingPanel currentQuizId={quizId} />

      {showRestorePrompt && (
        <QuizRecoveryPrompt 
          currentQuizId={quizId} 
          onRecover={() => setShowRestorePrompt(false)} 
        />
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Create Your Quiz</h2>
          <p className="text-muted-foreground">
            {questions.length} question{questions.length !== 1 ? 's' : ''} • Add and edit questions manually
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleShowFirst20} variant="outline" disabled={first20Loading}>
            <Eye className="h-4 w-4 mr-2" />
            {first20Loading ? 'Loading...' : 'Show first 20 questions'}
          </Button>
          <Button onClick={handleSave} disabled={saveQuestions.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveQuestions.isPending ? 'Saving...' : 'Save Quiz'}
          </Button>
          <Button onClick={handleStartQuiz} variant="default">
            <Play className="h-4 w-4 mr-2" />
            Play Quiz
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.slice(0, 5).map((error, i) => (
                <li key={i}>{error}</li>
              ))}
              {errors.length > 5 && <li>...and {errors.length - 5} more errors</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Block Selector */}
      {availableBlocks.length > 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Question Block</CardTitle>
            <CardDescription>
              Select a 100-question block to view and edit. Questions are organized in blocks of 100.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="block-select">Select Block</Label>
                <Select value={String(selectedBlockIndex)} onValueChange={handleBlockChange}>
                  <SelectTrigger id="block-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBlocks.map((blockIdx) => (
                      <SelectItem key={blockIdx} value={String(blockIdx)}>
                        {getCombinedBlockLabel(blockIdx, blockNamesMap?.get(blockIdx))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isEditingBlockName && (
                <Button variant="outline" size="icon" onClick={handleEditBlockName}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isEditingBlockName && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="block-name-input">Block Name</Label>
                  <Input
                    id="block-name-input"
                    value={editBlockName}
                    onChange={(e) => setEditBlockName(e.target.value)}
                    placeholder="Enter a name for this block (e.g., Cardiology)"
                  />
                </div>
                <Button
                  variant="default"
                  size="icon"
                  onClick={handleSaveBlockName}
                  disabled={setBlockNameMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCancelEditBlockName}
                  disabled={setBlockNameMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Currently viewing: <span className="font-medium">{currentBlockLabel}</span>
              {' • '}
              {questionsInBlock.length} question{questionsInBlock.length !== 1 ? 's' : ''} in this block
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Add Question */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions in current block..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
            }}
            className="pl-9"
          />
        </div>
        <Button onClick={addQuestion}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {/* Questions List */}
      <Accordion type="single" collapsible className="space-y-4">
        {displayedQuestions.map((question) => {
          const globalIndex = questions.indexOf(question);
          return (
            <AccordionItem key={globalIndex} value={`question-${globalIndex}`} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 text-left flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                    {globalIndex + 1}
                  </div>
                  <span className="font-medium flex-1">
                    {question.text || `Question ${globalIndex + 1}`}
                  </span>
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeQuestion(globalIndex);
                      }}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor={`question-${globalIndex}`}>Question Text</Label>
                    <Input
                      id={`question-${globalIndex}`}
                      value={question.text}
                      onChange={(e) => updateQuestion(globalIndex, 'text', e.target.value)}
                      placeholder="Enter your question"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Answer Choices (select the correct one)</Label>
                    <RadioGroup
                      value={String(question.correctAnswer)}
                      onValueChange={(value) => setCorrectAnswer(globalIndex, parseInt(value))}
                    >
                      {question.answers.map((answer, aIndex) => (
                        <div key={aIndex} className="flex items-center gap-2">
                          <RadioGroupItem value={String(aIndex)} id={`q${globalIndex}-a${aIndex}`} />
                          <Input
                            value={answer}
                            onChange={(e) => updateAnswer(globalIndex, aIndex, e.target.value)}
                            placeholder={`Answer ${aIndex + 1}`}
                            className="flex-1"
                          />
                          {question.answers.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAnswer(globalIndex, aIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                    {question.answers.length < 6 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addAnswer(globalIndex)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Answer
                      </Button>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{endIndex} of {filteredQuestions.length}
            {searchTerm && ` (filtered from ${questionsInBlock.length} in block)`}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* First 20 Questions Dialog */}
      <Dialog open={showFirst20Dialog} onOpenChange={handleCloseFirst20Dialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>First 20 Questions</DialogTitle>
            <DialogDescription>
              {first20Questions && first20Questions.length > 0
                ? `Showing ${first20Questions.length} question${first20Questions.length !== 1 ? 's' : ''}`
                : 'No questions found'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {first20Loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading questions...</p>
                </div>
              </div>
            ) : first20Questions && first20Questions.length > 0 ? (
              <div className="space-y-6">
                {first20Questions.map((question, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0">
                          {index + 1}
                        </Badge>
                        {question.text}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Answers:</p>
                        {question.answers.map((answer, aIndex) => (
                          <div
                            key={aIndex}
                            className={`p-2 rounded-md border ${
                              Number(question.correctAnswer) === aIndex
                                ? 'bg-success/10 border-success text-success-foreground'
                                : 'bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs">
                                {String.fromCharCode(65 + aIndex)}.
                              </span>
                              <span className="text-sm">{answer}</span>
                              {Number(question.correctAnswer) === aIndex && (
                                <Badge variant="outline" className="ml-auto text-xs bg-success/20 border-success">
                                  Correct
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Questions</AlertTitle>
                  <AlertDescription>
                    This quiz doesn't have any questions yet.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
