/** Five bonus points make one extra correct answer. */
export const BONUS_PER_CORRECT = 5;
export const HINT_COST = 1;

/** Bonus points for a wrong answer that was not completely wrong. */
export function bonusForWrongAnswer(similarity: number): number {
  if (similarity >= 0.75) {
    return 2;
  }
  if (similarity >= 0.5) {
    return 1;
  }
  return 0;
}

export interface Score {
  asked: number;
  correct: number;
  bonus: number;
}

export function emptyScore(): Score {
  return { asked: 0, correct: 0, bonus: 0 };
}

/** Correct answers plus bonus converted to extra correct answers; hints can push bonus below zero. */
export function effectiveCorrect(score: Score): number {
  const total = score.correct + Math.floor(score.bonus / BONUS_PER_CORRECT);
  return Math.max(0, Math.min(score.asked, total));
}

export function scorePercent(score: Score): number {
  return score.asked === 0 ? 0 : Math.round((effectiveCorrect(score) / score.asked) * 100);
}
