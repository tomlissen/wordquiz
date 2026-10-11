import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { emptyStats, Quiz } from '../../core/model/quiz.model';
import { QuizStore } from '../../core/services/quiz-store.service';
import { encodeQuiz } from '../../core/services/share-link';
import { SharePage } from './share-page';

const shared: Quiz = {
  id: 'original',
  title: 'Animals',
  fileName: '',
  createdAt: 1,
  results: [],
  items: Array.from({ length: 7 }, (_, n) => ({
    id: String(n),
    questions: [`animal ${n}`],
    answers: [`dier ${n}`],
    checked: false,
    stats: emptyStats(),
  })),
};

async function open(code: string) {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: [provideTranslateService(), provideRouter([])] });
  const fixture = TestBed.createComponent(SharePage);
  fixture.componentRef.setInput('data', code);
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 20)); // decoding is async (DecompressionStream)
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('SharePage', () => {
  it('shows the shared quiz with a preview of the first questions', async () => {
    const { el } = await open(await encodeQuiz(shared));
    expect(el.querySelector('h1')?.textContent).toBe('Animals');
    expect(el.querySelectorAll('.preview tr')).toHaveLength(5);
    expect(el.querySelector('.more')).not.toBeNull();
  });

  it('adds the quiz only when asked, then goes to the quiz list', async () => {
    const { el } = await open(await encodeQuiz(shared));
    const store = TestBed.inject(QuizStore);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(store.quizzes()).toHaveLength(0);

    (el.querySelector('.btn-primary') as HTMLButtonElement).click();
    expect(store.quizzes()).toHaveLength(1);
    expect(store.quizzes()[0].title).toBe('Animals');
    expect(store.quizzes()[0].items).toHaveLength(7);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('explains a damaged link instead of failing', async () => {
    const code = await encodeQuiz(shared);
    const { el } = await open(code.slice(0, 20));
    expect(el.querySelector('[role=alert]')?.textContent).toContain('shareImport.broken');
    expect(el.querySelector('.btn-primary')).toBeNull();
  });
});
