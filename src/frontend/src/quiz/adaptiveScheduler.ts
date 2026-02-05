import type { QuestionPerformance } from './sessionTypes';

export interface SchedulerState {
  performance: Map<number, QuestionPerformance>;
  questionPool: number[];
  lastSelectedId: number | null;
  rotationIndex: number;
  submissionCount: number; // Track total submissions for spacing logic
  initialOrder: number[]; // Randomized initial order for first-pass
  firstPassIndex: number; // Track position in first pass
}

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
 * Adaptive scheduler with randomized initial order and frequent repeats for missed questions.
 * - Questions appear in random order on first pass
 * - Incorrectly answered questions can repeat during first pass within < 4 subsequent questions
 * - Previously-wrong questions repeat 1-2 more times after being answered correctly
 * - Minimum 2-question spacing prevents immediate back-to-back repeats
 */
export class AdaptiveScheduler {
  private state: SchedulerState;

  constructor(totalQuestions: number) {
    // Create randomized initial order
    const initialOrder = shuffleArray(Array.from({ length: totalQuestions }, (_, i) => i));
    
    this.state = {
      performance: new Map(),
      questionPool: Array.from({ length: totalQuestions }, (_, i) => i),
      lastSelectedId: null,
      rotationIndex: 0,
      submissionCount: 0,
      initialOrder,
      firstPassIndex: 0,
    };

    // Initialize performance tracking
    for (let i = 0; i < totalQuestions; i++) {
      this.state.performance.set(i, {
        questionId: i,
        attempts: 0,
        correctCount: 0,
        incorrectCount: 0,
        lastResult: null,
        everMissed: false,
        postCorrectRepeatsNeeded: 0,
        lastShownAt: -1,
      });
    }
  }

  /**
   * Record the result of an answer attempt
   */
  recordAnswer(questionId: number, isCorrect: boolean): void {
    const perf = this.state.performance.get(questionId);
    if (!perf) return;

    this.state.submissionCount++;
    perf.attempts++;
    
    if (isCorrect) {
      perf.correctCount++;
      perf.lastResult = 'correct';
      
      // If this question was previously missed and this is the first correct answer after being wrong
      if (perf.everMissed && perf.postCorrectRepeatsNeeded === 0 && perf.incorrectCount > 0) {
        // Schedule 1-2 additional repeats after this correct answer
        perf.postCorrectRepeatsNeeded = Math.floor(Math.random() * 2) + 1; // 1 or 2
      } else if (perf.postCorrectRepeatsNeeded > 0) {
        // Decrement post-correct repeats counter
        perf.postCorrectRepeatsNeeded--;
      }
    } else {
      perf.incorrectCount++;
      perf.lastResult = 'incorrect';
      perf.everMissed = true;
    }
  }

  /**
   * Check if a question is eligible for repeat (has cooled down enough)
   * Minimum spacing: 2 questions between repeats (not immediate back-to-back)
   */
  private isEligibleForRepeat(perf: QuestionPerformance): boolean {
    const minSpacing = 2;
    return this.state.submissionCount - perf.lastShownAt >= minSpacing;
  }

  /**
   * Get questions that need repeating (incorrect or post-correct repeats pending)
   * During first pass: only include questions that should reappear within < 4 questions
   */
  private getRepeatCandidates(excludeCurrentId?: number, duringFirstPass: boolean = false): number[] {
    const candidates: number[] = [];
    const maxSoonness = 4; // Reappear within fewer than 4 subsequent questions
    
    for (const [questionId, perf] of this.state.performance) {
      if (excludeCurrentId !== undefined && questionId === excludeCurrentId) {
        continue;
      }
      
      // Skip if not attempted yet
      if (perf.attempts === 0) {
        continue;
      }
      
      // Check if eligible for repeat (spacing requirement)
      if (!this.isEligibleForRepeat(perf)) {
        continue;
      }
      
      // During first pass: only include if within soonness threshold
      if (duringFirstPass) {
        const questionsSinceLastShown = this.state.submissionCount - perf.lastShownAt;
        if (questionsSinceLastShown >= maxSoonness) {
          // Too old, skip during first pass
          continue;
        }
      }
      
      // Include if: has incorrect answers OR needs post-correct repeats
      if (perf.incorrectCount > 0 || perf.postCorrectRepeatsNeeded > 0) {
        candidates.push(questionId);
      }
    }
    
    return candidates;
  }

  /**
   * Get the next question to present.
   * Priority during first pass:
   * 1. Eligible repeat candidates (missed questions within < 4 subsequent questions)
   * 2. Next unanswered question (in randomized initial order)
   * 
   * After first pass:
   * - Questions needing repeats (incorrect or post-correct), prioritizing those with more incorrect answers
   */
  getNextQuestion(excludeCurrentId?: number): number {
    // Check if we're still in first pass (have unanswered questions)
    const hasUnanswered = Array.from(this.state.performance.values()).some(p => p.attempts === 0);
    
    if (hasUnanswered) {
      // FIRST PASS: Interleave repeats with new questions
      
      // Check for eligible repeat candidates (within soonness threshold)
      const repeatCandidates = this.getRepeatCandidates(excludeCurrentId, true);
      
      if (repeatCandidates.length > 0) {
        // Prioritize by incorrect count (more incorrect = higher priority)
        repeatCandidates.sort((a, b) => {
          const perfA = this.state.performance.get(a)!;
          const perfB = this.state.performance.get(b)!;
          
          // Primary: more incorrect answers = higher priority
          if (perfB.incorrectCount !== perfA.incorrectCount) {
            return perfB.incorrectCount - perfA.incorrectCount;
          }
          
          // Secondary: questions needing post-correct repeats
          if (perfB.postCorrectRepeatsNeeded !== perfA.postCorrectRepeatsNeeded) {
            return perfB.postCorrectRepeatsNeeded - perfA.postCorrectRepeatsNeeded;
          }
          
          // Tertiary: prefer questions shown longer ago
          return perfA.lastShownAt - perfB.lastShownAt;
        });
        
        const selected = repeatCandidates[0];
        const perf = this.state.performance.get(selected);
        if (perf) {
          perf.lastShownAt = this.state.submissionCount;
        }
        
        this.state.lastSelectedId = selected;
        return selected;
      }
      
      // No eligible repeats, serve next unanswered question in randomized order
      const unansweredInOrder: number[] = [];
      for (let i = this.state.firstPassIndex; i < this.state.initialOrder.length; i++) {
        const qId = this.state.initialOrder[i];
        const perf = this.state.performance.get(qId);
        if (perf && perf.attempts === 0 && qId !== excludeCurrentId) {
          unansweredInOrder.push(qId);
        }
      }
      
      if (unansweredInOrder.length > 0) {
        const selected = unansweredInOrder[0];
        const perf = this.state.performance.get(selected);
        if (perf) {
          perf.lastShownAt = this.state.submissionCount;
        }
        
        // Advance first pass index
        const selectedIndexInInitial = this.state.initialOrder.indexOf(selected);
        if (selectedIndexInInitial >= this.state.firstPassIndex) {
          this.state.firstPassIndex = selectedIndexInInitial + 1;
        }
        
        this.state.lastSelectedId = selected;
        return selected;
      }
    }
    
    // AFTER FIRST PASS: All questions attempted at least once; now handle all repeats
    const repeatCandidates = this.getRepeatCandidates(excludeCurrentId, false);
    
    if (repeatCandidates.length === 0) {
      // No repeats needed; session should complete
      // Return first question as fallback (shouldn't reach here if completion check works)
      return 0;
    }
    
    // Prioritize by incorrect count (more incorrect = higher priority)
    repeatCandidates.sort((a, b) => {
      const perfA = this.state.performance.get(a)!;
      const perfB = this.state.performance.get(b)!;
      
      // Primary: more incorrect answers = higher priority
      if (perfB.incorrectCount !== perfA.incorrectCount) {
        return perfB.incorrectCount - perfA.incorrectCount;
      }
      
      // Secondary: questions needing post-correct repeats
      if (perfB.postCorrectRepeatsNeeded !== perfA.postCorrectRepeatsNeeded) {
        return perfB.postCorrectRepeatsNeeded - perfA.postCorrectRepeatsNeeded;
      }
      
      // Tertiary: rotation for tie-breaking
      return a - b;
    });
    
    // Use rotation to cycle through top-priority candidates
    const topPriority = repeatCandidates[0];
    const topIncorrectCount = this.state.performance.get(topPriority)!.incorrectCount;
    const topCandidates = repeatCandidates.filter(
      qId => this.state.performance.get(qId)!.incorrectCount === topIncorrectCount
    );
    
    const selectedIndex = this.state.rotationIndex % topCandidates.length;
    this.state.rotationIndex++;
    const selected = topCandidates[selectedIndex];
    
    const perf = this.state.performance.get(selected);
    if (perf) {
      perf.lastShownAt = this.state.submissionCount;
    }
    
    this.state.lastSelectedId = selected;
    return selected;
  }

  /**
   * Check if the session is complete:
   * - All questions attempted at least once
   * - No pending repeats (no incorrect answers and no post-correct repeats needed)
   */
  isSessionComplete(): boolean {
    for (const perf of this.state.performance.values()) {
      // Not all attempted yet
      if (perf.attempts === 0) {
        return false;
      }
      
      // Has pending repeats
      if (perf.incorrectCount > 0 || perf.postCorrectRepeatsNeeded > 0) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get current performance statistics
   */
  getPerformance(): Map<number, QuestionPerformance> {
    return new Map(this.state.performance);
  }

  /**
   * Check if all questions have been attempted at least once
   */
  hasAttemptedAll(): boolean {
    for (const perf of this.state.performance.values()) {
      if (perf.attempts === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get total statistics
   */
  getStats(): { totalAttempts: number; totalCorrect: number; totalIncorrect: number } {
    let totalAttempts = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;

    for (const perf of this.state.performance.values()) {
      totalAttempts += perf.attempts;
      totalCorrect += perf.correctCount;
      totalIncorrect += perf.incorrectCount;
    }

    return { totalAttempts, totalCorrect, totalIncorrect };
  }
}
