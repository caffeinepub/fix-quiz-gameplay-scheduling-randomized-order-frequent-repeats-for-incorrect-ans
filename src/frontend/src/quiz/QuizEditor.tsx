import { useState, useEffect, useRef } from 'react';
import { useGetAllQuestions, useSaveQuestions, useListAllQuizzes, useGetAllQuizCounts, useGetFirst20Questions, useGetQuestionCount, useGetAllBlockNames, useSetBlockName } from '../hooks/useQueries';
import { useQuizRecovery } from '../hooks/useQuizRecovery';
import { useExportAllQuestions } from '../hooks/useExportAllQuestions';
import { downloadJsonFile, generateExportFilename } from '../utils/quizExport';
import { validateQuestions } from './validation';
import type { Question, QuizId } from './types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Plus, Trash2, Save, Play, AlertCircle, Search, RefreshCw, Eye, Edit2, Check, X, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import TroubleshootingPanel from './TroubleshootingPanel';
import { getAvailableBlockIndices, getCombinedBlockLabel, getBlockRange } from './blockUtils';
import QuestionImagePicker from './QuestionImagePicker';
import { getExternalBlobUrl } from './imageUtils';
import { ExternalBlob } from '../backend';
import BackupRestorePanel from './BackupRestorePanel';
import { saveDraft, loadDraft, clearDraft, hasDraft, getDraftTimestamp } from './draftStorage';

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
          {isRecovering ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Restoring...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restore Questions
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function QuizEditor({ quizId, onStartQuiz }: QuizEditorProps) {
  const { data: questions = [], isLoading, refetch } = useGetAllQuestions(quizId);
  const { data: questionCount = BigInt(0) } = useGetQuestionCount(quizId);
  const { data: blockNamesMap = new Map() } = useGetAllBlockNames(quizId);
  const saveQuestionsMutation = useSaveQuestions(quizId);
  const setBlockNameMutation = useSetBlockName(quizId);
  const { exportAllQuestions, isExporting } = useExportAllQuestions();

  const [localQuestions, setLocalQuestions] = useState<Question[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState<number | 'all'>('all');
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);
  const [editingBlockName, setEditingBlockName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [showReloadConfirm, setShowReloadConfirm] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  
  const initialSyncDone = useRef(false);
  const lastSavedQuestionsRef = useRef<Question[]>([]);

  // Initial sync from server or draft restore
  useEffect(() => {
    if (initialSyncDone.current) return;
    if (isLoading) return;

    // Check for draft on mount
    if (hasDraft(quizId)) {
      const draft = loadDraft(quizId);
      if (draft && draft.length > 0) {
        setShowDraftDialog(true);
        return;
      }
    }

    // No draft, sync from server
    setLocalQuestions(questions);
    lastSavedQuestionsRef.current = questions;
    initialSyncDone.current = true;
  }, [questions, isLoading, quizId]);

  // Auto-save draft when local questions change (debounced)
  useEffect(() => {
    if (!initialSyncDone.current) return;
    if (!hasUnsavedChanges) return;

    const timeoutId = setTimeout(() => {
      saveDraft(quizId, localQuestions);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [localQuestions, hasUnsavedChanges, quizId]);

  const handleResumeDraft = () => {
    const draft = loadDraft(quizId);
    if (draft) {
      setLocalQuestions(draft);
      setHasUnsavedChanges(true);
      setDraftLoaded(true);
      toast.info('Draft restored. Review your changes and save when ready.');
    }
    setShowDraftDialog(false);
    initialSyncDone.current = true;
  };

  const handleDiscardDraft = () => {
    clearDraft(quizId);
    setLocalQuestions(questions);
    lastSavedQuestionsRef.current = questions;
    setShowDraftDialog(false);
    initialSyncDone.current = true;
    toast.info('Draft discarded. Showing saved questions.');
  };

  const handleReloadClick = () => {
    if (hasUnsavedChanges) {
      setShowReloadConfirm(true);
    } else {
      performReload();
    }
  };

  const performReload = () => {
    clearDraft(quizId);
    setHasUnsavedChanges(false);
    refetch();
    setShowReloadConfirm(false);
    toast.info('Reloaded questions from server.');
  };

  const availableBlocks = getAvailableBlockIndices(localQuestions.length);

  const filteredQuestions = localQuestions.filter((q, index) => {
    const matchesSearch = searchQuery === '' || 
      q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answers.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (selectedBlock === 'all') return matchesSearch;
    
    const { start, end } = getBlockRange(selectedBlock);
    return matchesSearch && index >= start && index < end;
  });

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      text: '',
      imageUrl: undefined,
      answers: ['', ''],
      correctAnswer: BigInt(0),
    };
    setLocalQuestions([...localQuestions, newQuestion]);
    setHasUnsavedChanges(true);
  };

  const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...localQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setLocalQuestions(updated);
    setHasUnsavedChanges(true);
  };

  const handleAddAnswer = (questionIndex: number) => {
    const updated = [...localQuestions];
    if (updated[questionIndex].answers.length < 6) {
      updated[questionIndex] = {
        ...updated[questionIndex],
        answers: [...updated[questionIndex].answers, ''],
      };
      setLocalQuestions(updated);
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveAnswer = (questionIndex: number, answerIndex: number) => {
    const updated = [...localQuestions];
    if (updated[questionIndex].answers.length > 2) {
      const newAnswers = updated[questionIndex].answers.filter((_, i) => i !== answerIndex);
      const currentCorrect = Number(updated[questionIndex].correctAnswer);
      let newCorrect = currentCorrect;
      
      if (currentCorrect === answerIndex) {
        newCorrect = 0;
      } else if (currentCorrect > answerIndex) {
        newCorrect = currentCorrect - 1;
      }
      
      updated[questionIndex] = {
        ...updated[questionIndex],
        answers: newAnswers,
        correctAnswer: BigInt(newCorrect),
      };
      setLocalQuestions(updated);
      setHasUnsavedChanges(true);
    }
  };

  const handleUpdateAnswer = (questionIndex: number, answerIndex: number, value: string) => {
    const updated = [...localQuestions];
    const newAnswers = [...updated[questionIndex].answers];
    newAnswers[answerIndex] = value;
    updated[questionIndex] = { ...updated[questionIndex], answers: newAnswers };
    setLocalQuestions(updated);
    setHasUnsavedChanges(true);
  };

  const handleDeleteQuestion = (index: number) => {
    setLocalQuestions(localQuestions.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    const errors = validateQuestions(localQuestions);
    if (errors.length > 0) {
      toast.error(`Validation failed: ${errors[0].message}`);
      return;
    }

    try {
      await saveQuestionsMutation.mutateAsync(localQuestions);
      toast.success('Questions saved successfully!');
      setHasUnsavedChanges(false);
      clearDraft(quizId);
      lastSavedQuestionsRef.current = localQuestions;
    } catch (error: any) {
      toast.error(error.message || 'Failed to save questions');
    }
  };

  const handleExport = async () => {
    try {
      const exportData = await exportAllQuestions();
      const filename = generateExportFilename();
      downloadJsonFile(exportData, filename);
      toast.success('Export downloaded successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export questions');
    }
  };

  const handleStartBlockNameEdit = (blockIndex: number) => {
    setEditingBlockIndex(blockIndex);
    setEditingBlockName(blockNamesMap.get(blockIndex) || '');
  };

  const handleSaveBlockName = async () => {
    if (editingBlockIndex === null) return;

    try {
      await setBlockNameMutation.mutateAsync({
        blockIndex: editingBlockIndex,
        blockName: editingBlockName.trim(),
      });
      toast.success('Block name saved!');
      setEditingBlockIndex(null);
      setEditingBlockName('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save block name');
    }
  };

  const handleCancelBlockNameEdit = () => {
    setEditingBlockIndex(null);
    setEditingBlockName('');
  };

  const handlePreview = () => {
    setPreviewQuestions(localQuestions.slice(0, 20));
    setShowPreview(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const showRecoveryPrompt = localQuestions.length === 0 && !hasUnsavedChanges;

  return (
    <div className="space-y-6">
      <AlertDialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes from a previous session. Would you like to resume editing or discard the draft?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardDraft}>Discard Draft</AlertDialogCancel>
            <AlertDialogAction onClick={handleResumeDraft}>Resume Draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showReloadConfirm} onOpenChange={setShowReloadConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Unsaved Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Reloading will discard all your edits. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performReload}>Reload</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Quiz Editor</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {Number(questionCount)} question{Number(questionCount) !== 1 ? 's' : ''} total
            {hasUnsavedChanges && <span className="text-warning ml-2">(unsaved changes)</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleReloadClick} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm" disabled={isExporting}>
            {isExporting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
          <Button onClick={onStartQuiz} variant="outline" size="sm">
            <Play className="h-4 w-4 mr-2" />
            Play Quiz
          </Button>
        </div>
      </div>

      {showRecoveryPrompt && <QuizRecoveryPrompt currentQuizId={quizId} onRecover={refetch} />}

      <TroubleshootingPanel currentQuizId={quizId} />

      <BackupRestorePanel />

      {localQuestions.length > 0 && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={String(selectedBlock)} onValueChange={(v) => setSelectedBlock(v === 'all' ? 'all' : Number(v))}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Questions</SelectItem>
                {availableBlocks.map(blockIndex => {
                  const customName = blockNamesMap.get(blockIndex);
                  return (
                    <SelectItem key={blockIndex} value={String(blockIndex)}>
                      {getCombinedBlockLabel(blockIndex, customName)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedBlock !== 'all' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Block Name: {getCombinedBlockLabel(selectedBlock, blockNamesMap.get(selectedBlock))}
                  </CardTitle>
                  {editingBlockIndex === selectedBlock ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={handleSaveBlockName}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelBlockNameEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => handleStartBlockNameEdit(selectedBlock)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              {editingBlockIndex === selectedBlock && (
                <CardContent>
                  <Input
                    placeholder="Enter block name (e.g., Cardiology)"
                    value={editingBlockName}
                    onChange={(e) => setEditingBlockName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveBlockName();
                      if (e.key === 'Escape') handleCancelBlockNameEdit();
                    }}
                    autoFocus
                  />
                </CardContent>
              )}
            </Card>
          )}

          <Accordion type="single" collapsible className="space-y-2">
            {filteredQuestions.map((question, displayIndex) => {
              const actualIndex = localQuestions.indexOf(question);
              return (
                <AccordionItem key={actualIndex} value={`question-${actualIndex}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left flex-1">
                      <Badge variant="outline">#{actualIndex + 1}</Badge>
                      <span className="truncate">
                        {question.text || question.imageUrl ? (
                          question.text || '[Image Question]'
                        ) : (
                          <span className="text-muted-foreground italic">Empty question</span>
                        )}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Question Text</Label>
                      <Input
                        value={question.text}
                        onChange={(e) => handleUpdateQuestion(actualIndex, 'text', e.target.value)}
                        placeholder="Enter question text (optional if image is provided)"
                      />
                    </div>

                    <QuestionImagePicker
                      imageUrl={question.imageUrl}
                      onImageChange={(blob) => handleUpdateQuestion(actualIndex, 'imageUrl', blob)}
                      questionIndex={actualIndex}
                    />

                    <div className="space-y-3">
                      <Label>Answers</Label>
                      {question.answers.map((answer, answerIndex) => (
                        <div key={answerIndex} className="flex gap-2 items-start">
                          <div className="flex-1 space-y-2">
                            <Input
                              value={answer}
                              onChange={(e) => handleUpdateAnswer(actualIndex, answerIndex, e.target.value)}
                              placeholder={`Answer ${answerIndex + 1}`}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAnswer(actualIndex, answerIndex)}
                            disabled={question.answers.length <= 2}
                            className="shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {question.answers.length < 6 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddAnswer(actualIndex)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Answer
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Correct Answer</Label>
                      <RadioGroup
                        value={String(question.correctAnswer)}
                        onValueChange={(value) => handleUpdateQuestion(actualIndex, 'correctAnswer', BigInt(value))}
                      >
                        {question.answers.map((answer, answerIndex) => (
                          <div key={answerIndex} className="flex items-center space-x-2">
                            <RadioGroupItem value={String(answerIndex)} id={`q${actualIndex}-a${answerIndex}`} />
                            <Label htmlFor={`q${actualIndex}-a${answerIndex}`} className="cursor-pointer">
                              {answer || `Answer ${answerIndex + 1}`}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteQuestion(actualIndex)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Question
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleAddQuestion} className="flex-1">
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasUnsavedChanges || saveQuestionsMutation.isPending}
          variant="default"
          className="flex-1"
        >
          {saveQuestionsMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {localQuestions.length > 0 && (
        <Button onClick={handlePreview} variant="outline" className="w-full">
          <Eye className="h-4 w-4 mr-2" />
          Preview First 20 Questions
        </Button>
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preview - First 20 Questions</DialogTitle>
            <DialogDescription>
              Review the first 20 questions of your quiz
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {previewQuestions.map((q, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {q.text && <p className="font-medium">{q.text}</p>}
                    {q.imageUrl && (
                      <div className="rounded-lg overflow-hidden border">
                        <img
                          src={q.imageUrl.getDirectURL()}
                          alt={`Question ${index + 1}`}
                          className="w-full h-auto"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      {q.answers.map((answer, answerIndex) => (
                        <div
                          key={answerIndex}
                          className={`p-3 rounded-lg border ${
                            Number(q.correctAnswer) === answerIndex
                              ? 'bg-success/10 border-success'
                              : 'bg-muted/50'
                          }`}
                        >
                          {answer}
                          {Number(q.correctAnswer) === answerIndex && (
                            <Badge variant="outline" className="ml-2">Correct</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
