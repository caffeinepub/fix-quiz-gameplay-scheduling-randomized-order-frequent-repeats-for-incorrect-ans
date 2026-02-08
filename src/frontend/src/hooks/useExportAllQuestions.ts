import { useState } from 'react';
import { useActor } from './useActor';
import { diagnostics } from '../utils/deploymentDiagnostics';
import type { QuizId } from '../backend';
import type { QuizExportData, ExportedQuiz } from '../utils/quizExport';

export function useExportAllQuestions() {
  const { actor } = useActor();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportAllQuestions = async (): Promise<QuizExportData> => {
    if (!actor) {
      diagnostics.captureError(
        'Actor not available for exportAllQuestions',
        'useExportAllQuestions hook',
        'actorInit'
      );
      throw new Error('Actor not available');
    }

    setIsExporting(true);
    setError(null);

    try {
      // Fetch all quiz IDs
      const [, quizIds] = await actor.listAllQuizzes();

      // Fetch questions and block names for each quiz
      const exportedQuizzes: ExportedQuiz[] = [];

      for (const quizId of quizIds) {
        try {
          // Fetch all questions for this quiz
          const questions = await actor.getAllQuestions(quizId);

          // Fetch all block names for this quiz
          const blockNamePairs = await actor.getAllBlockNames(quizId);
          const blockNames = blockNamePairs.map(([blockIndex, name]) => ({
            blockIndex: Number(blockIndex),
            name,
          }));

          exportedQuizzes.push({
            quizId,
            questions,
            blockNames,
          });
        } catch (quizError: any) {
          console.error(`Failed to export quiz ${quizId}:`, quizError);
          diagnostics.captureError(
            quizError,
            `Failed to export quiz ${quizId}`,
            'runtime'
          );
          // Continue with other quizzes even if one fails
        }
      }

      const exportData: QuizExportData = {
        exportVersion: '1.0',
        exportedAt: new Date().toISOString(),
        quizzes: exportedQuizzes,
      };

      return exportData;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to export questions';
      setError(errorMessage);
      diagnostics.captureError(err, 'Export all questions failed', 'runtime');
      throw new Error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportAllQuestions,
    isExporting,
    error,
  };
}
