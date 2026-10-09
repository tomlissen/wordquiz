import { TestBed } from '@angular/core/testing';
import { isComplete } from '../model/quiz.model';
import { QuizStore } from './quiz-store.service';

describe('QuizStore editing', () => {
  beforeEach(() => localStorage.clear());

  it('creates a quiz with one empty row and edits it', () => {
    const store = TestBed.inject(QuizStore);
    const quiz = store.create('New quiz');
    expect(store.get(quiz.id)?.items).toHaveLength(1);
    expect(isComplete(quiz.items[0])).toBe(false);

    const first = quiz.items[0].id;
    store.updateDetails(quiz.id, { title: 'Animals', answerLanguage: 'Dutch' });
    store.updateItem(quiz.id, first, { questions: ['the dog'], answers: ['de hond'] });
    const second = store.addItem(quiz.id, first);
    const between = store.addItem(quiz.id, first);
    store.updateItem(quiz.id, second, { questions: ['the cat'], answers: ['de kat', 'de poes'], remark: 'miauw' });

    const saved = store.get(quiz.id)!;
    expect(saved.title).toBe('Animals');
    expect(saved.answerLanguage).toBe('Dutch');
    expect(saved.items.map((i) => i.id)).toEqual([first, between, second]);
    expect(saved.items[2]).toMatchObject({ answers: ['de kat', 'de poes'], remark: 'miauw' });

    store.removeItem(quiz.id, between);
    expect(store.get(quiz.id)!.items.map((i) => i.id)).toEqual([first, second]);
  });

  it('adds several rows at once and drops the empty starter row', () => {
    const store = TestBed.inject(QuizStore);
    const quiz = store.create('Pasted');
    store.addItems(quiz.id, [
      { questions: ['a'], answers: ['b'] },
      { questions: ['c'], answers: ['d', 'e'], remark: 'note' },
    ]);
    const items = store.get(quiz.id)!.items;
    expect(items.map((i) => i.questions[0])).toEqual(['a', 'c']);
    expect(items[1]).toMatchObject({ answers: ['d', 'e'], remark: 'note', checked: false });
    expect(new Set(items.map((i) => i.id)).size).toBe(2);
  });

  it('keeps edits after a reload', () => {
    const quiz = TestBed.inject(QuizStore).create('Kept');
    TestBed.resetTestingModule();
    expect(TestBed.inject(QuizStore).get(quiz.id)?.title).toBe('Kept');
  });
});
