import { parseBulkText } from './bulk-parse';

describe('parseBulkText', () => {
  it('reads tab, = and " - " separated lines, with alternatives and notes', () => {
    const result = parseBulkText(
      [
        'the dog\tde hond',
        'the cat = de kat; de poes',
        'the horse - het paard - neuter',
        'the cow\tde koe\tmoo',
      ].join('\n'),
    );
    expect(result.skipped).toEqual([]);
    expect(result.items).toEqual([
      { questions: ['the dog'], answers: ['de hond'], remark: undefined },
      { questions: ['the cat'], answers: ['de kat', 'de poes'], remark: undefined },
      { questions: ['the horse'], answers: ['het paard'], remark: 'neuter' },
      { questions: ['the cow'], answers: ['de koe'], remark: 'moo' },
    ]);
  });

  it('never splits on a hyphen inside a word, and a tab beats other separators', () => {
    expect(parseBulkText('e-mail - de e-mail').items[0]).toMatchObject({ questions: ['e-mail'], answers: ['de e-mail'] });
    expect(parseBulkText('1 + 1 = 2\ttwee').items[0]).toMatchObject({ questions: ['1 + 1 = 2'], answers: ['twee'] });
  });

  it('ignores blank lines and reports unusable ones by line number', () => {
    const result = parseBulkText('the dog = de hond\n\n   \njust a word\n = no question\nthe cat =\r\nthe cow = de koe');
    expect(result.items.map((i) => i.questions[0])).toEqual(['the dog', 'the cow']);
    expect(result.skipped).toEqual([4, 5, 6]);
  });
});
