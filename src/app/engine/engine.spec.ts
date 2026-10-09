import { Card, emptyStats, QuizItem } from '../core/model/quiz.model';
import { defaultSettings, MatchOptions } from '../core/model/settings.model';
import { checkAnswer, isPrefixOfAnswer, normalize } from './answer-matcher';
import { diffAnswer, levenshtein, similarity } from './diff';
import { multipleChoiceOptions } from './distractors';
import { scrambleLetters } from './puzzle';
import { seededRng } from './random';
import { bonusForWrongAnswer, effectiveCorrect, scorePercent } from './scoring';
import { buildCards, hardestItems, orderCards, selectItems } from './selection';

const NONE: MatchOptions = defaultSettings().match;
const opts = (o: Partial<MatchOptions>): MatchOptions => ({ ...NONE, ...o });

function item(id: string, q: string, a: string, stats: Partial<QuizItem['stats']> = {}, checked = false): QuizItem {
  return { id, questions: [q], answers: [a], checked, stats: { ...emptyStats(), ...stats } };
}

describe('answer matcher (Controle)', () => {
  it('is exact by default apart from whitespace', () => {
    expect(checkAnswer('  de   hond ', ['de hond'], NONE).correct).toBe(true);
    expect(checkAnswer('De hond', ['de hond'], NONE).correct).toBe(false);
    expect(checkAnswer('de hond.', ['de hond'], NONE).correct).toBe(false);
  });

  it('applies each option', () => {
    expect(checkAnswer('De Hond', ['de hond'], opts({ ignoreCase: true })).correct).toBe(true);
    expect(checkAnswer('de hond!', ['de hond'], opts({ ignorePunctuation: true })).correct).toBe(true);
    expect(checkAnswer("it's", ['its'], opts({ ignorePunctuation: true })).correct).toBe(false);
    expect(checkAnswer('de boom', ['2 de boom'], opts({ ignoreNumbers: true })).correct).toBe(true);
    expect(checkAnswer('hond de', ['de hond'], opts({ anyWordOrder: true })).correct).toBe(true);
    expect(checkAnswer('cafe', ['café'], opts({ ignoreAccents: true })).correct).toBe(true);
    expect(checkAnswer('cafe', ['café'], NONE).correct).toBe(false);
  });

  it('combines numbers and punctuation ("2. De boom")', () => {
    const o = opts({ ignoreNumbers: true, ignorePunctuation: true });
    expect(checkAnswer('De boom', ['2. De boom'], o).correct).toBe(true);
    expect(normalize('2. De boom', o)).toBe('De boom');
  });

  it('accepts any of the alternatives and reports the closest one', () => {
    expect(checkAnswer('de poes', ['de kat', 'de poes'], NONE)).toEqual({
      correct: true,
      closest: 'de poes',
      similarity: 1,
    });
    const wrong = checkAnswer('de pos', ['de kat', 'de poes'], NONE);
    expect(wrong.correct).toBe(false);
    expect(wrong.closest).toBe('de poes');
    expect(wrong.similarity).toBeGreaterThan(0.8);
  });

  it('checks prefixes for The English Teacher', () => {
    expect(isPrefixOfAnswer('de h', ['de hond'], NONE)).toBe(true);
    expect(isPrefixOfAnswer('de ', ['de hond'], NONE)).toBe(true);
    expect(isPrefixOfAnswer('de x', ['de hond'], NONE)).toBe(false);
    expect(isPrefixOfAnswer('De', ['de hond'], NONE)).toBe(false);
    expect(isPrefixOfAnswer('De', ['de hond'], opts({ ignoreCase: true }))).toBe(true);
    expect(isPrefixOfAnswer('de p', ['de kat', 'de poes'], NONE)).toBe(true);
  });
});

describe('diff', () => {
  it('computes edit distance and similarity', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(similarity('abc', 'abc')).toBe(1);
    expect(similarity('', '')).toBe(1);
    expect(similarity('abcd', 'wxyz')).toBe(0);
  });

  it('marks wrong, missing and extra letters', () => {
    const kinds = (e: string, g: string) =>
      diffAnswer(e, g)
        .map((p) => `${p.kind[0]}${p.char}`)
        .join(' ');
    expect(kinds('hond', 'hond')).toBe('oh oo on od');
    expect(kinds('hond', 'hand')).toBe('oh wo on od');
    expect(kinds('hond', 'hnd')).toBe('oh mo on od');
    expect(kinds('hond', 'hoond')).toMatch(/^oh (eo oo|oo eo) on od$/);
    expect(kinds('ab', '')).toBe('ma mb');
    expect(kinds('', 'x')).toBe('ex');
  });
});

describe('scoring', () => {
  it('awards bonus for nearly right answers and converts 5 bonus to 1 correct', () => {
    expect(bonusForWrongAnswer(0.9)).toBe(2);
    expect(bonusForWrongAnswer(0.6)).toBe(1);
    expect(bonusForWrongAnswer(0.2)).toBe(0);
    expect(effectiveCorrect({ asked: 10, correct: 6, bonus: 5 })).toBe(7);
    expect(effectiveCorrect({ asked: 10, correct: 6, bonus: 4 })).toBe(6);
    expect(effectiveCorrect({ asked: 10, correct: 6, bonus: -1 })).toBe(5);
    expect(effectiveCorrect({ asked: 2, correct: 2, bonus: 10 })).toBe(2);
    expect(scorePercent({ asked: 4, correct: 3, bonus: 0 })).toBe(75);
    expect(scorePercent({ asked: 0, correct: 0, bonus: 0 })).toBe(0);
  });
});

describe('selection (Vragenlijst / Vraagstelling / Volgorde)', () => {
  const items = [
    item('a', 'qa', 'aa', { testCount: 0 }),
    item('b', 'qb', 'ab', { testCount: 4, errors: 1, consecutiveCorrect: 0 }, true),
    item('c', 'qc', 'ac', { testCount: 2, errors: 2 }),
    item('d', 'qd', 'ad', { testCount: 5, correctCount: 5, consecutiveCorrect: 4 }, true),
  ];
  const settings = (s: Partial<ReturnType<typeof defaultSettings>>) => ({ ...defaultSettings(), ...s });
  const ids = (list: QuizItem[]) => list.map((i) => i.id);
  const rng = seededRng(1);

  it('filters by each question list option', () => {
    expect(ids(selectItems(items, settings({ selection: 'all' }), rng))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(selectItems(items, settings({ selection: 'everWrong' }), rng))).toEqual(['b', 'c']);
    expect(ids(selectItems(items, settings({ selection: 'checked' }), rng))).toEqual(['b', 'd']);
    expect(ids(selectItems(items, settings({ selection: 'new' }), rng))).toEqual(['a']);
    expect(ids(selectItems(items, settings({ selection: 'skipKnown' }), rng))).toEqual(['a', 'b', 'c']);
    expect(selectItems(items, settings({ selection: 'sample', selectionCount: 2 }), rng)).toHaveLength(2);
  });

  it('leaves out unfinished rows', () => {
    const unfinished: QuizItem = { id: 'x', questions: ['q'], answers: [], checked: true, stats: emptyStats() };
    expect(ids(selectItems([...items, unfinished], settings({ selection: 'all' }), rng))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ranks the hardest items by error rate', () => {
    expect(ids(hardestItems(items, 1))).toEqual(['c']);
    expect(ids(hardestItems(items, 10))).toEqual(['b', 'c']);
  });

  it('builds directional cards', () => {
    const [a] = items;
    expect(buildCards([a], 'forward')[0]).toMatchObject({ key: 'a:f', prompts: ['qa'], accepted: ['aa'] });
    expect(buildCards([a], 'reverse')[0]).toMatchObject({ key: 'a:r', prompts: ['aa'], accepted: ['qa'] });
    expect(buildCards(items.slice(0, 2), 'both').map((c) => c.key)).toEqual(['a:f', 'b:f', 'a:r', 'b:r']);
  });

  it('orders cards', () => {
    const cards = buildCards(items, 'forward');
    expect(orderCards(cards, 'reversed', rng).map((c) => c.itemId)).toEqual(['d', 'c', 'b', 'a']);
    const shuffled = orderCards(cards, 'shuffled', seededRng(3));
    expect([...shuffled].map((c) => c.itemId).sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('puzzle and multiple choice', () => {
  it('scrambles letters without spaces and differs from the answer', () => {
    const tiles = scrambleLetters('de hond', seededRng(5));
    expect([...tiles].sort().join('')).toBe('dehnod'.split('').sort().join(''));
    expect(tiles.join('')).not.toBe('dehond');
    expect(scrambleLetters('aa', seededRng(5))).toEqual(['a', 'a']);
  });

  it('offers the correct answer plus distractors from other cards', () => {
    const pool: Card[] = buildCards(
      [item('1', 'dog', 'hond'), item('2', 'cat', 'kat'), item('3', 'hound', 'jachthond'),
       item('4', 'blond', 'blond'), item('5', 'tree', 'boom'), item('6', 'pond', 'vijver')],
      'forward',
    );
    const options = multipleChoiceOptions(pool[0], pool, 'similar', seededRng(2));
    expect(options).toHaveLength(4);
    expect(options).toContain('hond');
    expect(options).toContain('blond');
    expect(new Set(options).size).toBe(4);

    const random = multipleChoiceOptions(pool[0], pool, 'random', seededRng(2));
    expect(random).toHaveLength(4);
    expect(random).toContain('hond');
  });

  it('copes with tiny lists', () => {
    const pool = buildCards([item('1', 'dog', 'hond')], 'forward');
    expect(multipleChoiceOptions(pool[0], pool, 'random', seededRng(1))).toEqual(['hond']);
  });
});
