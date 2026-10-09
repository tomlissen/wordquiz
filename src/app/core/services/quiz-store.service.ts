import { computed, Injectable, signal } from '@angular/core';
import { emptyStats, ItemStats, Quiz, QuizItem, TestResult } from '../model/quiz.model';
import { readJson, removeKey, StorageFullError, writeJson } from './storage';

const QUIZZES_KEY = 'quizzes';
const MAX_RESULTS = 50;

export type QuizDetails = Partial<Pick<Quiz, 'title' | 'questionLanguage' | 'answerLanguage'>>;
export type ItemContent = Partial<Pick<QuizItem, 'questions' | 'answers' | 'remark'>>;
export type NewItem = Pick<QuizItem, 'questions' | 'answers' | 'remark'>;

function emptyItem(): QuizItem {
  return { id: crypto.randomUUID(), questions: [], answers: [], checked: false, stats: emptyStats() };
}

/** All loaded quizzes with their item statistics and result history, persisted to localStorage. */
@Injectable({ providedIn: 'root' })
export class QuizStore {
  private readonly _quizzes = signal<Quiz[]>(readJson<Quiz[]>(QUIZZES_KEY, []));
  readonly quizzes = this._quizzes.asReadonly();
  /** Set when the last save failed because localStorage is full. */
  readonly storageFull = signal(false);

  readonly count = computed(() => this._quizzes().length);

  get(id: string): Quiz | undefined {
    return this._quizzes().find((q) => q.id === id);
  }

  add(quiz: Quiz): void {
    this.update((list) => [quiz, ...list]);
  }

  /** A new quiz starts with one empty row to type in. */
  create(title: string): Quiz {
    const quiz: Quiz = {
      id: crypto.randomUUID(),
      title,
      fileName: '',
      createdAt: Date.now(),
      items: [emptyItem()],
      results: [],
    };
    this.add(quiz);
    return quiz;
  }

  updateDetails(quizId: string, details: QuizDetails): void {
    this.updateQuiz(quizId, (quiz) => ({ ...quiz, ...details }));
  }

  updateItem(quizId: string, itemId: string, content: ItemContent): void {
    this.updateQuiz(quizId, (quiz) => ({
      ...quiz,
      items: quiz.items.map((i) => (i.id === itemId ? { ...i, ...content } : i)),
    }));
  }

  /** Adds an empty row after `afterItemId` (or at the end) and returns its id. */
  addItem(quizId: string, afterItemId?: string): string {
    const item = emptyItem();
    this.updateQuiz(quizId, (quiz) => {
      const index = quiz.items.findIndex((i) => i.id === afterItemId);
      const at = index === -1 ? quiz.items.length : index + 1;
      return { ...quiz, items: [...quiz.items.slice(0, at), item, ...quiz.items.slice(at)] };
    });
    return item.id;
  }

  /** Appends several rows at once; completely empty rows (like a new quiz's first row) are dropped. */
  addItems(quizId: string, newItems: NewItem[]): void {
    const isEmpty = (i: QuizItem) => !i.questions.length && !i.answers.length && !i.remark;
    this.updateQuiz(quizId, (quiz) => ({
      ...quiz,
      items: [...quiz.items.filter((i) => !isEmpty(i)), ...newItems.map((content) => ({ ...emptyItem(), ...content }))],
    }));
  }

  removeItem(quizId: string, itemId: string): void {
    this.updateQuiz(quizId, (quiz) => ({ ...quiz, items: quiz.items.filter((i) => i.id !== itemId) }));
  }

  remove(id: string): void {
    this.update((list) => list.filter((q) => q.id !== id));
    removeKey(`settings.${id}`);
  }

  setChecked(quizId: string, itemIds: Set<string>, checked: boolean): void {
    this.updateQuiz(quizId, (quiz) => ({
      ...quiz,
      items: quiz.items.map((i) => (itemIds.has(i.id) ? { ...i, checked } : i)),
    }));
  }

  /** Records one answer and returns a function that restores the previous stats. */
  recordAnswer(quizId: string, itemId: string, correct: boolean): () => void {
    const before = this.get(quizId)?.items.find((i) => i.id === itemId)?.stats;
    if (!before) {
      return () => undefined;
    }
    const after: ItemStats = {
      testCount: before.testCount + 1,
      correctCount: before.correctCount + (correct ? 1 : 0),
      errors: before.errors + (correct ? 0 : 1),
      consecutiveCorrect: correct ? before.consecutiveCorrect + 1 : 0,
      lastTested: Date.now(),
    };
    this.setStats(quizId, itemId, after);
    return () => this.setStats(quizId, itemId, before);
  }

  addResult(quizId: string, result: TestResult): void {
    this.updateQuiz(quizId, (quiz) => ({ ...quiz, results: [...quiz.results, result].slice(-MAX_RESULTS) }));
  }

  /** Used when the last test's score changes afterwards ("this answer was actually correct"). */
  replaceLastResult(quizId: string, result: TestResult): void {
    this.updateQuiz(quizId, (quiz) => ({ ...quiz, results: [...quiz.results.slice(0, -1), result] }));
  }

  resetStats(quizId: string): void {
    this.updateQuiz(quizId, (quiz) => ({
      ...quiz,
      results: [],
      items: quiz.items.map((i) => ({
        ...i,
        stats: { testCount: 0, correctCount: 0, errors: 0, consecutiveCorrect: 0 },
      })),
    }));
  }

  private setStats(quizId: string, itemId: string, stats: ItemStats): void {
    this.updateQuiz(quizId, (quiz) => ({
      ...quiz,
      items: quiz.items.map((i) => (i.id === itemId ? { ...i, stats } : i)),
    }));
  }

  private updateQuiz(quizId: string, fn: (quiz: Quiz) => Quiz): void {
    this.update((list) => list.map((q) => (q.id === quizId ? fn(q) : q)));
  }

  private update(fn: (list: Quiz[]) => Quiz[]): void {
    const next = fn(this._quizzes());
    this._quizzes.set(next);
    try {
      writeJson(QUIZZES_KEY, next);
      this.storageFull.set(false);
    } catch (e) {
      if (e instanceof StorageFullError) {
        this.storageFull.set(true);
      } else {
        throw e;
      }
    }
  }
}
