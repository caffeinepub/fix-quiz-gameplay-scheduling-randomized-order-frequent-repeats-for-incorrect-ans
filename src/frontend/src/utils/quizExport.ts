import type { Question, QuizId } from '../backend';

export interface ExportedQuiz {
  quizId: QuizId;
  questions: Question[];
  blockNames: Array<{ blockIndex: number; name: string }>;
}

export interface QuizExportData {
  exportVersion: string;
  exportedAt: string;
  quizzes: ExportedQuiz[];
}

/**
 * Triggers a browser download of the provided JSON data
 */
export function downloadJsonFile(data: QuizExportData, filename: string = 'quiz-export.json'): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a timestamped filename for the export
 */
export function generateExportFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `quiz-export-${timestamp}.json`;
}
