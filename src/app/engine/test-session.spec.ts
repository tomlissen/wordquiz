import { Card, emptyStats, KNOWN_STREAK } from '../core/model/quiz.model';
import { defaultSettings, Repetition } from '../core/model/settings.model';
import { INTERVAL_WRONG_GAP, Scheduler } from './scheduler';
import { buildCards } from './selection';
import { RecordAnswer, TestSession } from './test-session';

function cards(n: number): Card[] {
  return buildCards(
    Array.from({ length: n }, (_, i) => ({
      id: String(i),
      questions: [`q${i}`],
      answers: [`a${i}`],
      checked: false,
      stats: emptyStats(),
    })),
    'forward',
  );
}

/** Runs a scheduler, answering per card with `answer`; returns the item ids in asked order. */
function run(s: Scheduler, answer: (c: Card, askedBefore: number) => boolean, max = 200): string[] {
  const asked: string[] = [];
  const counts = new Map<string, number>();
  for (let i = 0; i < max; i++) {
    const c = s.current();
    if (!c) {
      break;
    }
    asked.push(c.itemId);
    const before = counts.get(c.key) ?? 0;
    counts.set(c.key, before + 1);
    s.report(answer(c, before));
  }
  return asked;
}

describe('Scheduler (Herhaling)', () => {
  it('none: asks every card once', () => {
    expect(run(new Scheduler('none', cards(3)), () => false)).toEqual(['0', '1', '2']);
  });

  it('repeatList: starts over after the list ends', () => {
    const s = new Scheduler('repeatList', cards(2));
    expect(run(s, () => true, 5)).toEqual(['0', '1', '0', '1', '0']);
    expect(s.round).toBe(3);
  });

  it('untilAllCorrect: repeats wrong cards in later rounds until right', () => {
    const s = new Scheduler('untilAllCorrect', cards(3));
    // card 1 is wrong twice, card 2 wrong once
    const asked = run(s, (c, before) => !((c.itemId === '1' && before < 2) || (c.itemId === '2' && before < 1)));
    expect(asked).toEqual(['0', '1', '2', '1', '2', '1']);
    expect(s.current()).toBeNull();
  });

  it('interval: a card leaves after 4 correct answers in a row', () => {
    const s = new Scheduler('interval', cards(1));
    expect(run(s, () => true)).toEqual(['0', '0', '0', '0']);
    expect(s.known).toBe(1);
  });

  it('interval: wrong cards come back sooner than right ones', () => {
    const s = new Scheduler('interval', cards(20));
    s.report(false); // card 0 wrong
    s.report(true); // card 1 right
    const order = run(s, () => true, 10);
    expect(order.indexOf('0')).toBe(INTERVAL_WRONG_GAP - 1);
    expect(order.indexOf('1')).toBeGreaterThan(order.indexOf('0'));
  });

  it('interval: a wrong answer resets the streak', () => {
    const s = new Scheduler('interval', cards(1));
    const asked = run(s, (_c, before) => before !== 2);
    // right, right, wrong, then 4 right in a row
    expect(asked).toHaveLength(3 + KNOWN_STREAK);
  });

  it('interval: every card is eventually known when always right', () => {
    const s = new Scheduler('interval', cards(10));
    const asked = run(s, () => true, 1000);
    expect(asked).toHaveLength(10 * KNOWN_STREAK);
    expect(s.remaining).toBe(0);
  });
});

describe('TestSession', () => {
  function session(repetition: Repetition, n = 2) {
    const log: string[] = [];
    const record: RecordAnswer = (itemId, correct) => {
      log.push(`${itemId}:${correct ? '+' : '-'}`);
      return () => log.push(`undo ${itemId}`);
    };
    const s = new TestSession({ cards: cards(n), repetition, match: defaultSettings().match, record });
    return { s, log };
  }

  it('moves on immediately after a correct answer and waits after a wrong one', () => {
    const { s, log } = session('none');
    s.submit('a0');
    expect(s.phase).toBe('asking');
    expect(s.current?.itemId).toBe('1');
    const fb = s.submit('a9');
    expect(fb?.correct).toBe(false);
    expect(fb?.expected).toBe('a1');
    expect(s.phase).toBe('feedback');
    s.continue();
    expect(s.phase).toBe('finished');
    expect(s.score).toEqual({ asked: 2, correct: 1, bonus: 1 });
    expect(log).toEqual(['0:+', '1:-']);
    expect(s.mistakeCards.map((c) => c.itemId)).toEqual(['1']);
  });

  it('turns the last wrong answer into a correct one', () => {
    const { s, log } = session('untilAllCorrect', 1);
    s.submit('a7');
    expect(s.markLastCorrect()).toBe(true);
    expect(s.score).toEqual({ asked: 1, correct: 1, bonus: 0 });
    expect(log).toEqual(['0:-', 'undo 0', '0:+']);
    expect(s.feedback?.overridden).toBe(true);
    expect(s.mistakeCards).toEqual([]);
    s.continue();
    // the card was not re-queued, so the session is done
    expect(s.phase).toBe('finished');
    expect(s.markLastCorrect()).toBe(false);
  });

  it('charges bonus points for hints', () => {
    const { s } = session('none', 1);
    expect(s.hint()).toBe('a');
    expect(s.hint()).toBe('a0');
    expect(s.hint()).toBe('a0');
    s.submit('a0');
    expect(s.score).toEqual({ asked: 1, correct: 1, bonus: -2 });
  });

  it('supports self assessment and English Teacher failures', () => {
    const { s } = session('none');
    s.selfAssess(true);
    s.failKeystroke('x');
    expect(s.feedback?.given).toBe('x');
    expect(s.feedback?.diff).toEqual([]);
    expect(s.score.correct).toBe(1);
    expect(s.score.asked).toBe(2);
  });

  it('presentation mode records nothing', () => {
    const log: string[] = [];
    const s = new TestSession({
      cards: cards(2),
      repetition: 'interval',
      match: defaultSettings().match,
      scored: false,
      record: () => {
        log.push('x');
        return () => undefined;
      },
    });
    s.advance();
    s.advance();
    expect(s.phase).toBe('finished');
    expect(log).toEqual([]);
  });

  it('finishes straight away without cards', () => {
    const s = new TestSession({ cards: [], repetition: 'none', match: defaultSettings().match, record: () => () => undefined });
    expect(s.phase).toBe('finished');
    expect(s.submit('x')).toBeNull();
  });
});
