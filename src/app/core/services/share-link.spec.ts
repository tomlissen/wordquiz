import { emptyStats, Quiz } from '../model/quiz.model';
import { decodeQuiz, encodeQuiz, ShareLinkError, shareUrl } from './share-link';

function quiz(): Quiz {
  return {
    id: 'q1',
    title: 'Frans – hoofdstuk 1',
    questionLanguage: 'Frans',
    answerLanguage: 'Nederlands',
    fileName: 'frans.json',
    createdAt: 1,
    results: [{ date: 5, asked: 2, correct: 1, bonus: 0, percent: 50 }],
    items: [
      {
        id: 'a',
        questions: ['le chat'],
        answers: ['de kat', 'de poes'],
        remark: 'mannelijk',
        checked: true,
        stats: { testCount: 3, correctCount: 1, errors: 2, consecutiveCorrect: 1 },
      },
      { id: 'b', questions: ['être'], answers: ['zijn'], checked: false, stats: emptyStats() },
      { id: 'c', questions: ['unfinished'], answers: [], checked: false, stats: emptyStats() },
    ],
  };
}

describe('share links', () => {
  it('round-trips the questions, without progress or unfinished rows', async () => {
    const code = await encodeQuiz(quiz());
    const shared = await decodeQuiz(code);

    expect(shared.id).not.toBe('q1');
    expect(shared.title).toBe('Frans – hoofdstuk 1');
    expect(shared.questionLanguage).toBe('Frans');
    expect(shared.answerLanguage).toBe('Nederlands');
    expect(shared.items.map(({ questions, answers, remark }) => ({ questions, answers, remark }))).toEqual([
      { questions: ['le chat'], answers: ['de kat', 'de poes'], remark: 'mannelijk' },
      { questions: ['être'], answers: ['zijn'], remark: undefined },
    ]);
    expect(shared.items.every((i) => !i.checked && i.stats.testCount === 0)).toBe(true);
    expect(shared.results).toEqual([]);
  });

  it('only uses characters that are safe in a URL', async () => {
    expect(await encodeQuiz(quiz())).toMatch(/^1[A-Za-z0-9_-]+$/);
  });

  it('compresses a long list well below its JSON size', async () => {
    const big = quiz();
    big.items = Array.from({ length: 200 }, (_, n) => ({
      id: String(n),
      questions: [`le mot numéro ${n}`],
      answers: [`het woord nummer ${n}`],
      checked: false,
      stats: emptyStats(),
    }));
    const code = await encodeQuiz(big);
    expect(code.length).toBeLessThan(JSON.stringify(big.items).length / 3);
    expect((await decodeQuiz(code)).items).toHaveLength(200);
  });

  it('rejects damaged, cut-off and foreign codes', async () => {
    const code = await encodeQuiz(quiz());
    await expect(decodeQuiz(code.slice(0, code.length / 2))).rejects.toBeInstanceOf(ShareLinkError);
    await expect(decodeQuiz('1' + 'A'.repeat(40))).rejects.toBeInstanceOf(ShareLinkError);
    await expect(decodeQuiz('1@@@')).rejects.toBeInstanceOf(ShareLinkError);
    await expect(decodeQuiz('2' + code.slice(1))).rejects.toBeInstanceOf(ShareLinkError);
    await expect(decodeQuiz('')).rejects.toBeInstanceOf(ShareLinkError);
  });

  it('builds a link to the share page on the current site', () => {
    expect(shareUrl('1abc', { origin: 'https://tomlissen.github.io', pathname: '/wordquiz/' })).toBe(
      'https://tomlissen.github.io/wordquiz/#/share/1abc',
    );
  });
});
