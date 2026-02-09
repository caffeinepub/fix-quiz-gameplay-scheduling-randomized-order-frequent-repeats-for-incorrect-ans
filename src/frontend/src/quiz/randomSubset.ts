/**
 * Utility functions for creating randomized question subsets
 */

/**
 * Fisher-Yates shuffle algorithm for randomizing array order
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Create a randomized subset of indices
 * @param totalCount Total number of items available
 * @param requestedCount Desired subset size
 * @returns Array of randomized indices, clamped to available count
 */
export function createRandomSubset(totalCount: number, requestedCount: number): number[] {
  // Clamp requested count to available count
  const actualCount = Math.min(requestedCount, totalCount);
  
  // Create array of all indices
  const allIndices = Array.from({ length: totalCount }, (_, i) => i);
  
  // Shuffle and take the first actualCount items
  const shuffled = shuffleArray(allIndices);
  return shuffled.slice(0, actualCount);
}
