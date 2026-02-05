import { useState } from 'react';
import { useActor } from './useActor';
import { useQueryClient } from '@tanstack/react-query';
import type { Question, QuizId } from '../backend';

export function useQuizRecovery() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recoverFromQuiz = async (sourceQuizId: QuizId, targetQuizId: QuizId): Promise<void> => {
    if (!actor) {
      throw new Error('Actor not available');
    }

    setIsRecovering(true);
    setError(null);

    try {
      // Fetch questions from source quiz
      const sourceQuestions = await actor.getAllQuestions(sourceQuizId);

      if (!sourceQuestions || sourceQuestions.length === 0) {
        throw new Error('No questions found in the selected quiz');
      }

      // Save questions to target quiz
      await actor.saveQuestions(targetQuizId, sourceQuestions);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['questions', targetQuizId] });
      queryClient.invalidateQueries({ queryKey: ['questionCount', targetQuizId] });
      queryClient.invalidateQueries({ queryKey: ['allQuizzes'] });

      setIsRecovering(false);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to restore questions';
      setError(errorMessage);
      setIsRecovering(false);
      throw new Error(errorMessage);
    }
  };

  return {
    recoverFromQuiz,
    isRecovering,
    error,
  };
}
