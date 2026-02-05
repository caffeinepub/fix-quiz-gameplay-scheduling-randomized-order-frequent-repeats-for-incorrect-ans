export interface QuestionPerformance {
  questionId: number;
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  lastResult: 'correct' | 'incorrect' | null;
  everMissed: boolean; // Track if this question was ever answered incorrectly
  postCorrectRepeatsNeeded: number; // How many more times to show after first correct (for previously missed questions)
  lastShownAt: number; // Submission count when last shown (for spacing repeats)
}

export interface SessionState {
  performance: Map<number, QuestionPerformance>;
  totalAnswered: number;
  totalCorrect: number;
  isComplete: boolean;
}
