import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { readJson, writeJson } from '../../../core/services/storage';
import {
  BIRD_RADIUS,
  BIRD_X,
  FIELD,
  FlappyGame,
  GRAVITY,
  MAX_FALL_SPEED,
  PIPE_SPEED,
  PLAY_HEIGHT,
} from '../../../engine/flappy';
import { Autofocus } from '../../../shared/autofocus';
import { COLORS, drawBackground, drawBird, drawGround, drawPipe, drawScore } from './flappy-art';

type Phase = 'ready' | 'playing' | 'falling' | 'over';
type EndReason = 'crashed' | 'timeUp';
export type Medal = 'bronze' | 'silver' | 'gold';

const BEST_KEY = 'flappyBest';
/** Points needed for each medal; about 12 are possible in the default 20 seconds. */
const MEDALS: [Medal, number][] = [
  ['gold', 10],
  ['silver', 6],
  ['bronze', 3],
];
const FALL_MS = 700;
const COUNT_UP_MS = 600;
const SHAKE_MS = 300;
const FLASH_MS = 150;
const FAST_WING_MS = 250;
const PUFF_LIFE_MS = 350;
const POP_LIFE_MS = 600;

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  age: number;
}

interface Pop {
  x: number;
  y: number;
  age: number;
}

/** The reward break: Flappy Bird, until the time runs out or the bird crashes. */
@Component({
  selector: 'app-flappy-break',
  imports: [TranslatePipe, Autofocus],
  templateUrl: './flappy-break.html',
  styleUrl: './flappy-break.scss',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class FlappyBreak {
  readonly seconds = input.required<number>();
  readonly finished = output<void>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  protected readonly phase = signal<Phase>('ready');
  protected readonly score = signal(0);
  protected readonly timeLeft = signal(0);
  protected readonly endReason = signal<EndReason | null>(null);
  protected readonly best = signal(readJson<number>(BEST_KEY, 0));
  protected readonly newBest = signal(false);
  /** The score on the result card, counting up to the final score. */
  protected readonly shownScore = signal(0);
  protected readonly medal = computed<Medal | null>(
    () => MEDALS.find(([, points]) => this.score() >= points)?.[0] ?? null,
  );

  private game = new FlappyGame(Math.random);
  private ctx: CanvasRenderingContext2D | null = null;
  private font = 'sans-serif';
  private readonly reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  private frame = 0;
  private lastTime: number | null = null;
  private idleTime = 0;
  /** How far the world has scrolled, in px; drives the ground and the background. */
  private scroll = 0;
  private sinceFlap = Infinity;
  private puffs: Puff[] = [];
  private pops: Pop[] = [];
  private fall = { y: 0, vy: 0, ms: 0 };
  private shakeMs = 0;
  private flashMs = 0;
  private overMs = 0;

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => {
      this.timeLeft.set(this.seconds());
      this.setUpCanvas();
      // The settings bar can push the game below the fold; bring the whole field into view.
      host.nativeElement.scrollIntoView?.({ block: 'start' });
      this.frame = requestAnimationFrame((t) => this.tick(t));
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
  }

  protected flap(): void {
    if (this.phase() === 'ready') {
      this.phase.set('playing');
    }
    if (this.phase() === 'playing') {
      this.game.flap();
      this.sinceFlap = 0;
      this.puff();
    }
  }

  protected onPointer(event: PointerEvent): void {
    event.preventDefault();
    this.flap();
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key !== ' ' && event.key !== 'ArrowUp') {
      return;
    }
    // Space on a focused button should press that button, not flap.
    const target = event.target;
    if (target instanceof Element && target.closest('button, a, input, select, textarea')) {
      return;
    }
    event.preventDefault();
    if (!event.repeat) {
      this.flap();
    }
  }

  protected done(): void {
    this.finished.emit();
  }

  private tick(now: number): void {
    const dt = this.lastTime === null ? 0 : now - this.lastTime;
    this.lastTime = now;

    switch (this.phase()) {
      case 'ready':
        this.idleTime += dt;
        this.scroll += (PIPE_SPEED * dt) / 1000;
        break;
      case 'playing':
        this.play(dt);
        break;
      case 'falling':
        this.tumble(dt);
        break;
      case 'over':
        this.overMs += dt;
        this.shownScore.set(Math.round(this.score() * Math.min(1, this.overMs / COUNT_UP_MS)));
        break;
    }
    this.sinceFlap += dt;
    this.shakeMs = Math.max(0, this.shakeMs - dt);
    this.flashMs = Math.max(0, this.flashMs - dt);
    this.age(dt);

    this.draw();
    if (this.phase() !== 'over' || this.shownScore() < this.score()) {
      this.frame = requestAnimationFrame((t) => this.tick(t));
    }
  }

  private play(dt: number): void {
    const before = this.game.score;
    this.game.step(dt);
    this.scroll += (this.game.speed * Math.min(dt, 50)) / 1000;
    if (this.game.score > before) {
      this.pops.push({ x: BIRD_X, y: this.game.y - BIRD_RADIUS - 6, age: 0 });
    }
    this.score.set(this.game.score);
    const limitMs = this.seconds() * 1000;
    this.timeLeft.set(Math.max(0, Math.ceil((limitMs - this.game.elapsedMs) / 1000)));
    if (this.game.crashed) {
      this.crash();
    } else if (this.game.elapsedMs >= limitMs) {
      this.end('timeUp');
    }
  }

  /** The bird hit something: flash, shake, and let it drop to the ground before the result. */
  private crash(): void {
    this.phase.set('falling');
    this.fall = { y: this.game.y, vy: Math.max(0, this.game.vy), ms: 0 };
    if (!this.reducedMotion) {
      this.shakeMs = SHAKE_MS;
      this.flashMs = FLASH_MS;
    }
  }

  private tumble(dt: number): void {
    const s = Math.min(dt, 50) / 1000;
    this.fall.vy = Math.min(this.fall.vy + GRAVITY * s, MAX_FALL_SPEED);
    this.fall.y = Math.min(this.fall.y + this.fall.vy * s, PLAY_HEIGHT - BIRD_RADIUS);
    this.fall.ms += dt;
    if (this.fall.ms >= FALL_MS) {
      this.end('crashed');
    }
  }

  private end(reason: EndReason): void {
    this.phase.set('over');
    this.endReason.set(reason);
    this.overMs = 0;
    this.shownScore.set(this.reducedMotion ? this.game.score : 0);
    if (this.game.score > this.best()) {
      this.best.set(this.game.score);
      this.newBest.set(true);
      try {
        writeJson(BEST_KEY, this.game.score);
      } catch {
        // A best score that isn't remembered is no loss.
      }
    }
  }

  private puff(): void {
    for (let i = 0; i < 5; i++) {
      const spread = this.reducedMotion ? 0 : 1;
      this.puffs.push({
        x: BIRD_X - BIRD_RADIUS,
        y: this.game.y + 4,
        vx: spread * (-60 - Math.random() * 60),
        vy: spread * (Math.random() * 120 - 30),
        r: 2 + Math.random() * 2.5,
        age: 0,
      });
    }
  }

  private age(dt: number): void {
    const s = dt / 1000;
    for (const p of this.puffs) {
      p.age += dt;
      p.x += p.vx * s;
      p.y += p.vy * s;
    }
    for (const p of this.pops) {
      p.age += dt;
      if (!this.reducedMotion) {
        p.y -= 40 * s;
      }
    }
    this.puffs = this.puffs.filter((p) => p.age < PUFF_LIFE_MS);
    this.pops = this.pops.filter((p) => p.age < POP_LIFE_MS);
  }

  private setUpCanvas(): void {
    const canvas = this.canvas().nativeElement;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = FIELD.width * dpr;
    canvas.height = FIELD.height * dpr;
    this.ctx = canvas.getContext('2d');
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.font = getComputedStyle(document.documentElement).getPropertyValue('--font').trim() || this.font;
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    const phase = this.phase();
    ctx.save();
    if (this.shakeMs > 0) {
      const strength = 6 * (this.shakeMs / SHAKE_MS);
      ctx.translate((Math.random() * 2 - 1) * strength, (Math.random() * 2 - 1) * strength);
    }

    drawBackground(ctx, this.scroll);
    for (const pipe of this.game.pipes) {
      drawPipe(ctx, pipe.x, pipe.gapY, pipe.gapY + pipe.gap);
    }
    drawGround(ctx, this.scroll);

    ctx.fillStyle = COLORS.white;
    for (const p of this.puffs) {
      ctx.globalAlpha = 1 - p.age / PUFF_LIFE_MS;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The bird tilts with its speed, nose-dives while falling, and bobs while waiting.
    const falling = phase === 'falling' || (phase === 'over' && this.endReason() === 'crashed');
    const y = falling ? this.fall.y : this.game.y + (phase === 'ready' ? Math.sin(this.idleTime / 250) * 6 : 0);
    const angle = falling
      ? Math.PI / 2
      : phase === 'ready'
        ? 0
        : Math.max(-0.5, Math.min(1.1, this.game.vy / 500));
    const wingPhase = falling ? 0.34 : this.sinceFlap < FAST_WING_MS ? this.sinceFlap / 83 : this.idleTime / 400;
    ctx.save();
    ctx.translate(BIRD_X, y);
    ctx.rotate(angle);
    drawBird(ctx, wingPhase % 1);
    ctx.restore();

    ctx.font = `800 18px ${this.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLORS.outline;
    ctx.fillStyle = COLORS.white;
    for (const p of this.pops) {
      ctx.globalAlpha = 1 - p.age / POP_LIFE_MS;
      ctx.strokeText('+1', p.x, p.y);
      ctx.fillText('+1', p.x, p.y);
    }
    ctx.globalAlpha = 1;

    if (phase === 'playing' || phase === 'falling') {
      drawScore(ctx, this.game.score, this.font);
    }
    ctx.restore();

    if (this.flashMs > 0) {
      ctx.fillStyle = COLORS.white;
      ctx.globalAlpha = this.flashMs / FLASH_MS;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.globalAlpha = 1;
    }
  }
}
