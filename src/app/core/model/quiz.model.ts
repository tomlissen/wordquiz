/** Per-item learning statistics. */
export interface ItemStats {
  testCount: number;
  correctCount: number;
  errors: number;
  /** Lifetime streak of correct answers; 4+ means the item counts as "known". */
  consecutiveCorrect: number;
  lastTested?: number;
}

export interface QuizItem {
  id: string;
  /** Alternative phrasings of the question; the first one is shown. */
  questions: string[];
  /** Accepted answers; the first one is shown as "the" correct answer. */
  answers: string[];
  remark?: string;
  /** User selection used by the "checked items" question list. */
  checked: boolean;
  stats: ItemStats;
}

export interface TestResult {
  date: number;
  asked: number;
  correct: number;
  bonus: number;
  percent: number;
}

export interface Quiz {
  id: string;
  title: string;
  questionLanguage?: string;
  answerLanguage?: string;
  fileName: string;
  createdAt: number;
  items: QuizItem[];
  results: TestResult[];
}

/** One directional question as asked during a test. */
export interface Card {
  /** Unique within a session: item id + direction. */
  key: string;
  itemId: string;
  reversed: boolean;
  prompts: string[];
  accepted: string[];
  remark?: string;
}

export const KNOWN_STREAK = 4;

/** The editor allows unfinished rows; only items with a question and an answer are tested or exported. */
export function isComplete(item: QuizItem): boolean {
  return item.questions.length > 0 && item.answers.length > 0;
}

export function isKnown(item: QuizItem): boolean {
  return item.stats.consecutiveCorrect >= KNOWN_STREAK;
}

/** Known vs not-yet-known among the questions that can be tested. */
export function knownProgress(items: QuizItem[]): { total: number; known: number; unknown: number } {
  const testable = items.filter(isComplete);
  const known = testable.filter(isKnown).length;
  return { total: testable.length, known, unknown: testable.length - known };
}

export function emptyStats(): ItemStats {
  return { testCount: 0, correctCount: 0, errors: 0, consecutiveCorrect: 0 };
}
