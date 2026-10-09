import { parseQuizJson } from './json-parser';
import { writeQuizJson } from './json-writer';
import { QuizParseError } from './parse-error';
import { parseQuizFile } from './quiz-file';

describe('parseQuizJson', () => {
  it('accepts strings and arrays and uses the title', () => {
    const quiz = parseQuizJson(
      JSON.stringify({
        title: 'Capitals',
        answerLanguage: 'City',
        items: [
          { question: 'Belgium', answer: ['Brussels', 'Brussel'] },
          { question: ['NL', 'Netherlands'], answer: 'Amsterdam', remark: ' capital ' },
        ],
      }),
      'file.json',
    );
    expect(quiz.title).toBe('Capitals');
    expect(quiz.answerLanguage).toBe('City');
    expect(quiz.items[0].answers).toEqual(['Brussels', 'Brussel']);
    expect(quiz.items[1].questions).toEqual(['NL', 'Netherlands']);
    expect(quiz.items[1].remark).toBe('capital');
    expect(quiz.items[0].checked).toBe(false);
    expect(quiz.items[0].stats.testCount).toBe(0);
    expect(quiz.results).toEqual([]);
  });

  it('falls back to the file name for the title', () => {
    expect(parseQuizJson('{"items":[{"question":"a","answer":"b"}]}', 'dir/chapter 3.json').title).toBe('chapter 3');
  });

  it('reports which item is broken', () => {
    try {
      parseQuizJson(JSON.stringify({ items: [{ question: 'a', answer: 'b' }, { question: 'x' }] }), 'f.json');
      throw new Error('expected a parse error');
    } catch (e) {
      expect(e).toBeInstanceOf(QuizParseError);
      expect((e as QuizParseError).messageKey).toBe('errors.jsonBadItem');
      expect((e as QuizParseError).params).toEqual({ index: 2 });
    }
  });

  it('rejects non-JSON, missing items and empty lists', () => {
    expect(() => parseQuizJson('nope', 'f.json')).toThrow(/jsonInvalid/);
    expect(() => parseQuizJson('{"title":"x"}', 'f.json')).toThrow(/jsonNoItemsArray/);
    expect(() => parseQuizJson('{"items":[]}', 'f.json')).toThrow(/noItems/);
  });

  it('ignores invalid progress instead of rejecting the file', () => {
    const quiz = parseQuizJson(
      JSON.stringify({
        items: [{ question: 'a', answer: 'b', checked: 'yes', stats: { testCount: -3, errors: 1.5, correctCount: 'x' } }],
        results: [{ date: 'today', asked: 3 }, 'junk', { date: 5, asked: 2, correct: 1, bonus: -1, percent: 250 }],
      }),
      'f.json',
    );
    expect(quiz.items[0].checked).toBe(false);
    expect(quiz.items[0].stats).toEqual({ testCount: 0, correctCount: 0, errors: 0, consecutiveCorrect: 0 });
    expect(quiz.results).toEqual([{ date: 5, asked: 2, correct: 1, bonus: -1, percent: 100 }]);
  });
});

describe('writeQuizJson', () => {
  it('round-trips the list together with progress', () => {
    const quiz = parseQuizJson(
      JSON.stringify({
        title: 'Animals',
        questionLanguage: 'English',
        answerLanguage: 'Dutch',
        items: [
          { question: 'the dog', answer: 'de hond', remark: 'blaft' },
          { question: 'the cat', answer: ['de kat', 'de poes'] },
        ],
      }),
      'animals.json',
    );
    quiz.items[1].checked = true;
    quiz.items[1].stats = { testCount: 4, correctCount: 1, errors: 3, consecutiveCorrect: 1, lastTested: 1234 };
    quiz.results = [{ date: 99, asked: 4, correct: 1, bonus: 2, percent: 25 }];

    const json = writeQuizJson(quiz);
    const again = parseQuizJson(json, 'export.json');

    expect(again.title).toBe('Animals');
    expect(again.questionLanguage).toBe('English');
    expect(again.answerLanguage).toBe('Dutch');
    expect(again.items.map(({ questions, answers, remark, checked, stats }) => ({ questions, answers, remark, checked, stats })))
      .toEqual(quiz.items.map(({ questions, answers, remark, checked, stats }) => ({ questions, answers, remark, checked, stats })));
    expect(again.results).toEqual(quiz.results);
  });

  it('leaves out unfinished rows from the editor', () => {
    const quiz = parseQuizJson('{"items":[{"question":"a","answer":"b"}]}', 'q.json');
    quiz.items.push({ ...quiz.items[0], id: 'new', answers: [] });
    expect(JSON.parse(writeQuizJson(quiz)).items).toEqual([{ question: 'a', answer: 'b' }]);
  });

  it('keeps untouched items as plain question/answer pairs', () => {
    const quiz = parseQuizJson('{"items":[{"question":"a","answer":"b"}]}', 'q.json');
    expect(JSON.parse(writeQuizJson(quiz))).toEqual({ title: 'q', items: [{ question: 'a', answer: 'b' }] });
  });
});

describe('parseQuizFile', () => {
  it('reads .json files and JSON content without an extension', () => {
    expect(parseQuizFile('{"items":[{"question":"a","answer":"b"}]}', 'list.json').items).toHaveLength(1);
    expect(parseQuizFile('  {"items":[{"question":"a","answer":"b"}]}', 'download').items).toHaveLength(1);
  });

  it('rejects other file types', () => {
    expect(() => parseQuizFile('<list></list>', 'list.xml')).toThrow(/unknownFormat/);
    expect(() => parseQuizFile('hello', 'a.txt')).toThrow(/unknownFormat/);
  });
});
