import { Card, KNOWN_STREAK } from '../core/model/quiz.model';
import { Repetition } from '../core/model/settings.model';

/**
 * Interval training (simplified Pimsleur graduated interval recall): after a
 * correct answer the card comes back after a growing number of other cards;
 * after a wrong answer it comes back soon. Four correct answers in a row and
 * the card is known and leaves the session.
 */
export const INTERVAL_GAPS = [3, 7, 15];
export const INTERVAL_WRONG_GAP = 2;

interface SchedulerState {
  queue: Card[];
  /** untilAllCorrect: cards answered wrong in the current round. */
  wrongThisRound: Card[];
  /** interval: current streak per card key. */
  streaks: Record<string, number>;
  round: number;
  known: number;
}

/** Herhaling: decides which card comes next. */
export class Scheduler {
  private state: SchedulerState;

  /**
   * @param reorder produces the next pass of the list for "repeat list", so a
   *   shuffled order is reshuffled every round.
   */
  constructor(
    readonly repetition: Repetition,
    private readonly cards: Card[],
    private readonly reorder: (cards: Card[]) => Card[] = (c) => [...c],
  ) {
    this.state = { queue: [...cards], wrongThisRound: [], streaks: {}, round: 1, known: 0 };
  }

  get total(): number {
    return this.cards.length;
  }

  get round(): number {
    return this.state.round;
  }

  /** Cards the session still has to get through, if the mode ends at all. */
  get remaining(): number {
    return this.state.queue.length + this.state.wrongThisRound.length;
  }

  /** interval: cards that have reached the known streak and left the session. */
  get known(): number {
    return this.state.known;
  }

  current(): Card | null {
    return this.state.queue[0] ?? null;
  }

  report(correct: boolean): void {
    const s = this.state;
    const card = s.queue.shift();
    if (!card) {
      return;
    }
    switch (this.repetition) {
      case 'none':
        break;
      case 'repeatList':
        if (s.queue.length === 0) {
          s.queue = this.reorder(this.cards);
          s.round++;
        }
        break;
      case 'untilAllCorrect':
        if (!correct) {
          s.wrongThisRound.push(card);
        }
        if (s.queue.length === 0 && s.wrongThisRound.length > 0) {
          s.queue = this.reorder(s.wrongThisRound);
          s.wrongThisRound = [];
          s.round++;
        }
        break;
      case 'interval': {
        const streak = correct ? (s.streaks[card.key] ?? 0) + 1 : 0;
        s.streaks[card.key] = streak;
        if (streak >= KNOWN_STREAK) {
          s.known++;
          break;
        }
        const gap = correct ? INTERVAL_GAPS[Math.min(streak, INTERVAL_GAPS.length) - 1] : INTERVAL_WRONG_GAP;
        s.queue.splice(Math.min(gap, s.queue.length), 0, card);
        break;
      }
    }
  }

  /** Snapshot for undo ("this answer was actually correct"). */
  saveState(): unknown {
    return structuredClone(this.state);
  }

  restoreState(saved: unknown): void {
    this.state = structuredClone(saved as SchedulerState);
  }
}
