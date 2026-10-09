import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { FlappyBreak } from './flappy-break';

/** Drives requestAnimationFrame by hand in 16ms frames, so the game runs deterministically. */
function fakeFrames() {
  let queue = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  let now = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    queue.set(nextId, cb);
    return nextId++;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => queue.delete(id));
  return {
    /** Runs `ms` worth of 16ms frames, calling `each(elapsedMs)` before every frame. */
    run(ms: number, each: (t: number) => void = () => undefined) {
      for (let t = 0; t < ms && queue.size; t += 16) {
        each(t);
        // Like a real frame: every callback queued so far runs (Angular schedules some too).
        const due = [...queue.values()];
        queue = new Map();
        now += 16;
        due.forEach((cb) => cb(now));
      }
    },
  };
}

const press = (key: string) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

async function setup(seconds: number) {
  TestBed.configureTestingModule({ providers: [provideTranslateService()] });
  const fixture = TestBed.createComponent(FlappyBreak);
  fixture.componentRef.setInput('seconds', seconds);
  let finished = 0;
  fixture.componentInstance.finished.subscribe(() => finished++);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement, finished: () => finished };
}

describe('FlappyBreak', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('waits for the first flap before the clock starts', async () => {
    const frames = fakeFrames();
    const { fixture, el } = await setup(5);
    frames.run(3000);
    await fixture.whenStable();
    expect(el.querySelector('.overlay.ready')).not.toBeNull();
    expect(el.textContent).toContain('game.timeLeft');
  });

  it('ends early when the bird crashes', async () => {
    const frames = fakeFrames();
    const { fixture, el, finished } = await setup(20);
    press(' ');
    frames.run(3000); // no more flaps: the bird drops to the floor
    await fixture.whenStable();
    expect(el.querySelector('.verdict')?.textContent).toContain('game.crashed');
    (el.querySelector('.over .btn') as HTMLButtonElement).click();
    expect(finished()).toBe(1);
  });

  it("ends with time's up when the bird survives the time limit", async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // centred gaps
    const frames = fakeFrames();
    const { fixture, el } = await setup(5);
    press(' ');
    // A flap rhythm that keeps the bird in the centred gaps (found by simulating the engine).
    frames.run(6000, (t) => {
      if (t === 624 || (t > 624 && (t - 624) % 592 === 0)) {
        press(' ');
      }
    });
    await fixture.whenStable();
    expect(el.querySelector('.verdict')?.textContent).toContain('game.timeUp');
    expect(Number(localStorage.getItem('wq.v1.flappyBest'))).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it('can be skipped at any time', async () => {
    fakeFrames();
    const { el, finished } = await setup(20);
    (el.querySelector('.skip') as HTMLButtonElement).click();
    expect(finished()).toBe(1);
  });
});
