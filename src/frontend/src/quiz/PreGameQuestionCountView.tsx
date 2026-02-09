import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Slider } from '../components/ui/slider';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';

interface PreGameQuestionCountViewProps {
  maxQuestions: number;
  onStart: (count: number) => void;
  onBack: () => void;
  isLoading: boolean;
}

export default function PreGameQuestionCountView({
  maxQuestions,
  onStart,
  onBack,
  isLoading,
}: PreGameQuestionCountViewProps) {
  const [selectedCount, setSelectedCount] = useState(10);

  const handleSliderChange = (values: number[]) => {
    setSelectedCount(values[0]);
  };

  const handleStart = () => {
    onStart(selectedCount);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (maxQuestions < 10) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Not Enough Questions</CardTitle>
            <CardDescription>
              This block needs at least 10 questions to start a quiz session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Currently available: {maxQuestions} question{maxQuestions !== 1 ? 's' : ''}
              </AlertDescription>
            </Alert>
            <Button onClick={onBack} variant="outline" className="w-full mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Block Selection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxAllowed = Math.min(maxQuestions, 100);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>How many questions?</CardTitle>
          <CardDescription>
            Select the number of random questions you want to practice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{selectedCount}</div>
              <div className="text-sm text-muted-foreground mt-1">
                questions (out of {maxQuestions} available)
              </div>
            </div>
            <Slider
              value={[selectedCount]}
              onValueChange={handleSliderChange}
              min={10}
              max={maxAllowed}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10</span>
              <span>{maxAllowed}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={onBack} variant="outline" className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleStart} className="flex-1">
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
