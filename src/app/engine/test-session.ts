import { Card } from '../core/model/quiz.model';
import { MatchOptions, Repetition } from '../core/model/settings.model';
import { checkAnswer } from './answer-matcher';
import { diffAnswer, DiffPart } from './diff';
import { Scheduler } from './scheduler';
import { bonusForWrongAnswer, emptyScore, HINT_COST, Score } from './scoring';

/** Persists an answer to item statistics; returns a function that undoes it. */
export type RecordAnswer = (itemId: string, correct: boolean) => () => void;

export type SessionPhase = 'asking' | 'feedback' | 'finished';

export interface Feedback {
  card: Card;
  correct: boolean;
  given: string;
  expected: string;
  diff: DiffPart[];
  bonus: number;
  overridden: boolean;
}

export interface SessionOptions {
  cards: Card[];
  repetition: Repetition;
  match: MatchOptions;
  record: RecordAnswer;
  /** Presentation mode: just show cards, record nothing. */
  scored?: boolean;
  reorder?: (cards: Card[]) => Card[];
}

interface LastAnswer {
  feedback: Feedback;
  schedulerBefore: unknown;
  undo: () => void;
}

/** One run through the Overhoren screen, independent of Angular. */
export class TestSession {
  readonly scheduler: Scheduler;
  readonly scored: boolean;
  phase: SessionPhase;
  score: Score = emptyScore();
  feedback: Feedback | null = null;
  hintsUsed = 0;
  /** Wrong-answer count per card key, for "practice your mistakes". */
  private readonly mistakes = new Map<string, { card: Card; count: number }>();
  private last: LastAnswer | null = null;

  constructor(private readonly opts: SessionOptions) {
    this.scored = opts.scored ?? true;
    const repetition = this.scored ? opts.repetition : 'none';
    this.scheduler = new Scheduler(repetition, opts.cards, opts.reorder);
    this.phase = this.scheduler.current() ? 'asking' : 'finished';
  }

  get current(): Card | null {
    return this.phase === 'finished' ? null : this.scheduler.current();
  }

  get mistakeCards(): Card[] {
    return [...this.mistakes.values()].filter((m) => m.count > 0).map((m) => m.card);
  }

  /** Typed answer (as entered, puzzle, dictation, English Teacher). */
  submit(input: string): Feedback | null {
    const card = this.current;
    if (!card || this.phase !== 'asking') {
      return null;
    }
    const match = checkAnswer(input, card.accepted, this.opts.match);
    const bonus = match.correct ? 0 : bonusForWrongAnswer(match.similarity);
    return this.finishCard(card, match.correct, input, match.closest, bonus);
  }

  /** Multiple choice: the picked option is checked like a typed answer. */
  choose(option: string): Feedback | null {
    return this.submit(option);
  }

  /** Practice without typing: the user says whether they knew it. */
  selfAssess(knewIt: boolean): Feedback | null {
    const card = this.current;
    if (!card || this.phase !== 'asking') {
      return null;
    }
    return this.finishCard(card, knewIt, '', card.accepted[0], 0);
  }

  /** The English Teacher: a wrong keystroke fails the card immediately. */
  failKeystroke(typed: string): Feedback | null {
    const card = this.current;
    if (!card || this.phase !== 'asking') {
      return null;
    }
    return this.finishCard(card, false, typed, card.accepted[0], 0, false);
  }

  /** Presentation: move to the next card without scoring. */
  advance(): void {
    if (this.phase === 'finished') {
      return;
    }
    this.scheduler.report(true);
    this.nextCard();
  }

  /** Reveals one more letter of the answer, at the cost of bonus points. */
  hint(): string {
    const card = this.current;
    if (!card || this.phase !== 'asking') {
      return '';
    }
    const answer = Array.from(card.accepted[0]);
    if (this.hintsUsed < answer.length) {
      this.hintsUsed++;
      this.score.bonus -= HINT_COST;
    }
    return answer.slice(0, this.hintsUsed).join('');
  }

  /** After feedback on a wrong answer: go on to the next card. */
  continue(): void {
    if (this.phase === 'feedback') {
      this.nextCard();
    }
  }

  /** "Dit antwoord is wel goed": turn the last wrong answer into a correct one. */
  markLastCorrect(): boolean {
    const last = this.last;
    if (!last || last.feedback.correct) {
      return false;
    }
    last.undo();
    last.undo = this.opts.record(last.feedback.card.itemId, true);
    this.scheduler.restoreState(last.schedulerBefore);
    this.scheduler.report(true);
    this.score.correct++;
    this.score.bonus -= last.feedback.bonus;
    const mistake = this.mistakes.get(last.feedback.card.key);
    if (mistake) {
      mistake.count--;
    }
    last.feedback = { ...last.feedback, correct: true, overridden: true, bonus: 0 };
    this.feedback = last.feedback;
    if (this.phase === 'finished' && this.scheduler.current()) {
      this.phase = 'feedback';
    }
    return true;
  }

  stop(): void {
    this.phase = 'finished';
  }

  private finishCard(
    card: Card,
    correct: boolean,
    given: string,
    expected: string,
    bonus: number,
    withDiff = true,
  ): Feedback {
    const schedulerBefore = this.scheduler.saveState();
    const undo = this.opts.record(card.itemId, correct);
    this.scheduler.report(correct);
    this.score.asked++;
    if (correct) {
      this.score.correct++;
    } else {
      this.score.bonus += bonus;
      const mistake = this.mistakes.get(card.key) ?? { card, count: 0 };
      mistake.count++;
      this.mistakes.set(card.key, mistake);
    }
    const feedback: Feedback = {
      card,
      correct,
      given,
      expected,
      // A half-typed answer (English Teacher) or none at all (self-assessed) has nothing to compare.
      diff: correct || !given || !withDiff ? [] : diffAnswer(expected, given),
      bonus,
      overridden: false,
    };
    this.feedback = feedback;
    this.last = { feedback, schedulerBefore, undo };
    if (correct) {
      this.nextCard();
    } else {
      this.phase = 'feedback';
    }
    return feedback;
  }

  private nextCard(): void {
    this.hintsUsed = 0;
    this.phase = this.scheduler.current() ? 'asking' : 'finished';
  }
}
