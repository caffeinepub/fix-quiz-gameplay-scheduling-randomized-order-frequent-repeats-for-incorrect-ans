/**
 * Utilities for managing 100-question blocks
 */

export const BLOCK_SIZE = 100;

/**
 * Calculate the number of blocks needed for a given question count
 */
export function getBlockCount(totalQuestions: number): number {
  return Math.ceil(totalQuestions / BLOCK_SIZE);
}

/**
 * Get the start and end indices for a block (0-based, inclusive start, exclusive end)
 */
export function getBlockRange(blockIndex: number): { start: number; end: number } {
  return {
    start: blockIndex * BLOCK_SIZE,
    end: (blockIndex + 1) * BLOCK_SIZE,
  };
}

/**
 * Get a default label for a block (e.g., "1–100", "101–200")
 */
export function getDefaultBlockLabel(blockIndex: number): string {
  const { start, end } = getBlockRange(blockIndex);
  return `${start + 1}–${end}`;
}

/**
 * Get a combined label with custom name and range (e.g., "Cardiology (1–100)")
 */
export function getCombinedBlockLabel(blockIndex: number, customName?: string): string {
  const rangeLabel = getDefaultBlockLabel(blockIndex);
  return customName ? `${customName} (${rangeLabel})` : rangeLabel;
}

/**
 * Get all available block indices for a given question count
 */
export function getAvailableBlockIndices(totalQuestions: number): number[] {
  const blockCount = getBlockCount(totalQuestions);
  return Array.from({ length: blockCount }, (_, i) => i);
}

/**
 * Extract questions for a specific block from a full question array
 */
export function getQuestionsForBlock<T>(questions: T[], blockIndex: number): T[] {
  const { start, end } = getBlockRange(blockIndex);
  return questions.slice(start, end);
}

/**
 * Determine which block a question index belongs to
 */
export function getBlockIndexForQuestion(questionIndex: number): number {
  return Math.floor(questionIndex / BLOCK_SIZE);
}
