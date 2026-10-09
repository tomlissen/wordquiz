import { emptyStats, knownProgress, QuizItem } from './quiz.model';

const item = (streak: number, complete = true): QuizItem => ({
  id: String(Math.random()),
  questions: ['q'],
  answers: complete ? ['a'] : [],
  checked: false,
  stats: { ...emptyStats(), consecutiveCorrect: streak },
});

describe('knownProgress', () => {
  it('counts questions answered right 4 times in a row as known, skipping unfinished rows', () => {
    expect(knownProgress([item(4), item(7), item(3), item(0), item(9, false)])).toEqual({ total: 4, known: 2, unknown: 2 });
    expect(knownProgress([])).toEqual({ total: 0, known: 0, unknown: 0 });
  });
});
