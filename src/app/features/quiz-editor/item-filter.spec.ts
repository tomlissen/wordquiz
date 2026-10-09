import { emptyStats, QuizItem } from '../../core/model/quiz.model';
import { joinAlternatives, splitAlternatives } from './alternatives';
import { itemFilter } from './quiz-editor-page';

const item = (q: string, a: string): QuizItem => ({ id: q, questions: [q], answers: [a], checked: false, stats: emptyStats() });
const items = [item('the horse', 'het paard'), item('the dog', 'de hond'), item('the sheep', 'het schaap')];
const names = (filter: string) => items.filter(itemFilter(filter)).map((i) => i.questions[0]);

describe('itemFilter', () => {
  it('matches text in questions and answers, case-insensitively', () => {
    expect(names('')).toHaveLength(3);
    expect(names('HOND')).toEqual(['the dog']);
    expect(names('ee')).toEqual(['the sheep']);
  });

  it('treats ^…$ as a regular expression', () => {
    expect(names('^het .*$')).toEqual(['the horse', 'the sheep']);
    expect(names('^(unclosed$')).toEqual([]);
  });
});

describe('alternatives', () => {
  it('splits on semicolons and drops empty parts', () => {
    expect(splitAlternatives(' de kat ;de poes;; ')).toEqual(['de kat', 'de poes']);
    expect(splitAlternatives('and/or')).toEqual(['and/or']);
    expect(splitAlternatives('   ')).toEqual([]);
    expect(joinAlternatives(['de kat', 'de poes'])).toBe('de kat; de poes');
  });
});
