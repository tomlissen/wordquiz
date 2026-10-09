import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { BuiltInQuiz, BuiltInQuizDialog } from './built-in-quiz-dialog';

const animals: BuiltInQuiz = {
  id: 'animals',
  file: 'animals.json',
  title: 'Animals',
  questionLanguage: 'English',
  answerLanguage: 'Dutch',
  count: 1,
  data: { title: 'Animals', items: [{ question: 'the dog', answer: 'de hond' }] },
};

async function setup(response: Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(() => response));
  // jsdom has no modal dialogs
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
  TestBed.configureTestingModule({ providers: [provideTranslateService()] });
  const fixture = TestBed.createComponent(BuiltInQuizDialog);
  const picked: { fileName: string; text: string }[] = [];
  fixture.componentInstance.picked.subscribe((p) => picked.push(p));
  await fixture.whenStable();
  fixture.componentInstance.open();
  await new Promise((r) => setTimeout(r));
  await fixture.whenStable();
  return { el: fixture.nativeElement as HTMLElement, fixture, picked };
}

describe('BuiltInQuizDialog', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists the built-in quizzes and hands over the chosen one as file text', async () => {
    const { el, fixture, picked } = await setup(Promise.resolve(new Response(JSON.stringify({ quizzes: [animals] }))));
    expect(el.querySelector('.title')?.textContent).toBe('Animals');
    expect(el.querySelector('.meta')?.textContent).toContain('English → Dutch');

    (el.querySelector('.list .btn') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(picked).toEqual([{ fileName: 'animals.json', text: JSON.stringify(animals.data) }]);
    expect(el.querySelector('.added')).not.toBeNull();
    expect(el.querySelector('.list .btn')).toBeNull();
  });

  it('says so when the generated list is missing', async () => {
    const { el } = await setup(Promise.resolve(new Response('', { status: 404 })));
    expect(el.querySelector('[role=alert]')?.textContent).toContain('builtIn.loadError');
  });
});
