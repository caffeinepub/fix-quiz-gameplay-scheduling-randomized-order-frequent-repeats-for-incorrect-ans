import type { Question } from './types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateQuestions(questions: Question[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (questions.length === 0) {
    errors.push({
      field: 'questions',
      message: 'Quiz must contain at least 1 question',
    });
    return errors;
  }

  questions.forEach((question, index) => {
    // Question must have either text or an image (or both)
    const hasText = question.text.trim().length > 0;
    const hasImage = !!question.imageUrl;

    if (!hasText && !hasImage) {
      errors.push({
        field: `question-${index}-content`,
        message: `Question ${index + 1}: Must have either question text or an image`,
      });
    }

    if (question.answers.length < 2) {
      errors.push({
        field: `question-${index}-answers`,
        message: `Question ${index + 1}: At least 2 answers are required`,
      });
    }

    if (question.answers.length > 6) {
      errors.push({
        field: `question-${index}-answers`,
        message: `Question ${index + 1}: Maximum 6 answers allowed`,
      });
    }

    question.answers.forEach((answer, answerIndex) => {
      if (!answer.trim()) {
        errors.push({
          field: `question-${index}-answer-${answerIndex}`,
          message: `Question ${index + 1}, Answer ${answerIndex + 1}: Text is required`,
        });
      }
    });

    const correctIndex = Number(question.correctAnswer);
    if (correctIndex < 0 || correctIndex >= question.answers.length) {
      errors.push({
        field: `question-${index}-correct`,
        message: `Question ${index + 1}: Must select a correct answer`,
      });
    }
  });

  return errors;
}
