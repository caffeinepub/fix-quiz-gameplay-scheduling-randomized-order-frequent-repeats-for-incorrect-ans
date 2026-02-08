import type { StateSnapshot } from '../backend';
import { ExternalBlob } from '../backend';

/**
 * JSON serialization/deserialization helpers for full-state backup content.
 * Handles ExternalBlob serialization to direct URLs for portability.
 */

export interface SerializedStateSnapshot {
  version: number;
  questions: Array<[string, Array<{
    text: string;
    imageUrl: string | null;
    answers: string[];
    correctAnswer: string;
  }>]>;
  blockNames: Array<[string, Array<[string, string]>]>;
}

/**
 * Serialize StateSnapshot to JSON-safe format
 * Converts ExternalBlob to direct URL strings
 */
export function serializeStateSnapshot(snapshot: StateSnapshot): SerializedStateSnapshot {
  return {
    version: Number(snapshot.version),
    questions: snapshot.questions.map(([quizId, questions]) => [
      quizId,
      questions.map(q => ({
        text: q.text,
        imageUrl: q.imageUrl ? q.imageUrl.getDirectURL() : null,
        answers: q.answers,
        correctAnswer: q.correctAnswer.toString(),
      }))
    ]),
    blockNames: snapshot.blockNames.map(([quizId, blocks]) => [
      quizId,
      blocks.map(([blockIndex, name]) => [
        blockIndex.toString(),
        name
      ])
    ])
  };
}

/**
 * Deserialize JSON-safe format back to StateSnapshot
 * Reconstructs ExternalBlob from URL strings
 */
export function deserializeStateSnapshot(serialized: SerializedStateSnapshot): StateSnapshot {
  return {
    version: BigInt(serialized.version),
    questions: serialized.questions.map(([quizId, questions]) => [
      quizId,
      questions.map(q => ({
        text: q.text,
        imageUrl: q.imageUrl ? ExternalBlob.fromURL(q.imageUrl) : undefined,
        answers: q.answers,
        correctAnswer: BigInt(q.correctAnswer),
      }))
    ]),
    blockNames: serialized.blockNames.map(([quizId, blocks]) => [
      quizId,
      blocks.map(([blockIndexStr, name]) => [
        BigInt(blockIndexStr),
        name
      ])
    ])
  };
}

/**
 * Validate that a parsed JSON object matches the expected structure
 */
export function validateSerializedSnapshot(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid JSON: not an object' };
  }

  if (typeof data.version !== 'number') {
    return { valid: false, error: 'Invalid format: missing or invalid version' };
  }

  if (data.version !== 1 && data.version !== 2) {
    return { valid: false, error: `Unsupported version: ${data.version}` };
  }

  if (!Array.isArray(data.questions)) {
    return { valid: false, error: 'Invalid format: questions must be an array' };
  }

  if (!Array.isArray(data.blockNames)) {
    return { valid: false, error: 'Invalid format: blockNames must be an array' };
  }

  return { valid: true };
}
