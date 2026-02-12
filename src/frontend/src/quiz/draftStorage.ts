import type { Question, QuizId } from './types';
import { ExternalBlob } from '../backend';

interface QuestionDraft {
  text: string;
  imageUrl?: string | null;
  answers: string[];
  correctAnswer: number;
  studyArticle?: string;
}

interface DraftData {
  quizId: QuizId;
  questions: QuestionDraft[];
  timestamp: number;
  version: number;
}

const DRAFT_KEY_PREFIX = 'quiz-draft-';
const DRAFT_VERSION = 2;

function getDraftKey(quizId: QuizId): string {
  return `${DRAFT_KEY_PREFIX}${quizId}`;
}

function serializeQuestion(question: Question): QuestionDraft {
  return {
    text: question.text,
    imageUrl: question.imageUrl ? question.imageUrl.getDirectURL() : null,
    answers: question.answers,
    correctAnswer: Number(question.correctAnswer),
    studyArticle: question.studyArticle,
  };
}

function deserializeQuestion(draft: QuestionDraft): Question {
  return {
    text: draft.text,
    imageUrl: draft.imageUrl ? ExternalBlob.fromURL(draft.imageUrl) : undefined,
    answers: draft.answers,
    correctAnswer: BigInt(draft.correctAnswer),
    studyArticle: draft.studyArticle,
  };
}

export function saveDraft(quizId: QuizId, questions: Question[]): void {
  try {
    const draftData: DraftData = {
      quizId,
      questions: questions.map(serializeQuestion),
      timestamp: Date.now(),
      version: DRAFT_VERSION,
    };
    localStorage.setItem(getDraftKey(quizId), JSON.stringify(draftData));
  } catch (error) {
    console.error('Failed to save draft:', error);
  }
}

export function loadDraft(quizId: QuizId): Question[] | null {
  try {
    const stored = localStorage.getItem(getDraftKey(quizId));
    if (!stored) return null;

    const draftData: DraftData = JSON.parse(stored);
    
    if (draftData.version !== DRAFT_VERSION) {
      console.warn('Draft version mismatch, ignoring stored draft');
      clearDraft(quizId);
      return null;
    }

    if (draftData.quizId !== quizId) {
      console.warn('Draft quizId mismatch, ignoring stored draft');
      return null;
    }

    return draftData.questions.map(deserializeQuestion);
  } catch (error) {
    console.error('Failed to load draft:', error);
    return null;
  }
}

export function clearDraft(quizId: QuizId): void {
  try {
    localStorage.removeItem(getDraftKey(quizId));
  } catch (error) {
    console.error('Failed to clear draft:', error);
  }
}

export function hasDraft(quizId: QuizId): boolean {
  try {
    return localStorage.getItem(getDraftKey(quizId)) !== null;
  } catch (error) {
    return false;
  }
}

export function getDraftTimestamp(quizId: QuizId): number | null {
  try {
    const stored = localStorage.getItem(getDraftKey(quizId));
    if (!stored) return null;

    const draftData: DraftData = JSON.parse(stored);
    return draftData.timestamp;
  } catch (error) {
    return null;
  }
}
