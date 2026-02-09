import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ArrowLeft, Play } from 'lucide-react';
import { getCombinedBlockLabel } from './blockUtils';
import type { Question } from '../backend';

interface PreQuizSummaryViewProps {
  selectedBlockIndex: number | null;
  selectedQuestionCount: number;
  blockQuestions: Question[];
  blockNamesMap: Map<number, string>;
  onStartQuiz: () => void;
  onBackToQuestionCount: () => void;
  onBackToBlockSelection: () => void;
}

export default function PreQuizSummaryView({
  selectedBlockIndex,
  selectedQuestionCount,
  blockQuestions,
  blockNamesMap,
  onStartQuiz,
  onBackToQuestionCount,
  onBackToBlockSelection,
}: PreQuizSummaryViewProps) {
  const blockLabel = selectedBlockIndex !== null
    ? getCombinedBlockLabel(selectedBlockIndex, blockNamesMap.get(selectedBlockIndex))
    : 'Unknown Block';

  const availableQuestions = blockQuestions.length;
  const isValidSelection = selectedQuestionCount <= availableQuestions;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Ready to Start</CardTitle>
          <CardDescription>
            Review your quiz settings before beginning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Block</span>
              <span className="font-medium">{blockLabel}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Questions to practice</span>
              <span className="font-medium">{selectedQuestionCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Available in block</span>
              <span className="font-medium">{availableQuestions}</span>
            </div>
          </div>

          {!isValidSelection && (
            <Alert variant="destructive">
              <AlertDescription>
                You selected {selectedQuestionCount} questions, but only {availableQuestions} are available in this block.
                Please adjust your selection.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={onStartQuiz}
              disabled={!isValidSelection}
              size="lg"
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Quiz
            </Button>
            <div className="flex gap-2">
              <Button onClick={onBackToQuestionCount} variant="outline" className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Adjust Count
              </Button>
              <Button onClick={onBackToBlockSelection} variant="outline" className="flex-1">
                Change Block
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
