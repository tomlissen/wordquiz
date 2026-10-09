import {
  afterNextRender,
  Component,
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
  PIPE_GAP,
  PIPE_WIDTH,
} from '../../../engine/flappy';
import { Autofocus } from '../../../shared/autofocus';

type Phase = 'ready' | 'playing' | 'over';
type EndReason = 'crashed' | 'timeUp';

const BEST_KEY = 'flappyBest';
const RULE_SPACING = 24;
const MARGIN_X = 34;

interface Palette {
  sheet: string;
  ink: string;
  rule: string;
  margin: string;
  redPen: string;
  pipeFill: string;
  blue: string;
}

/** The reward break: Flappy Bird on a notebook page, until the time runs out or the bird crashes. */
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

  private game = new FlappyGame(Math.random);
  private ctx: CanvasRenderingContext2D | null = null;
  private palette: Palette | null = null;
  private frame = 0;
  private lastTime: number | null = null;
  private idleTime = 0;

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

    if (this.phase() === 'playing') {
      this.game.step(dt);
      this.score.set(this.game.score);
      const limitMs = this.seconds() * 1000;
      this.timeLeft.set(Math.max(0, Math.ceil((limitMs - this.game.elapsedMs) / 1000)));
      if (this.game.crashed) {
        this.end('crashed');
      } else if (this.game.elapsedMs >= limitMs) {
        this.end('timeUp');
      }
    } else if (this.phase() === 'ready') {
      this.idleTime += dt;
    }

    this.draw();
    if (this.phase() !== 'over') {
      this.frame = requestAnimationFrame((t) => this.tick(t));
    }
  }

  private end(reason: EndReason): void {
    this.phase.set('over');
    this.endReason.set(reason);
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

  private setUpCanvas(): void {
    const canvas = this.canvas().nativeElement;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = FIELD.width * dpr;
    canvas.height = FIELD.height * dpr;
    this.ctx = canvas.getContext('2d');
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    this.palette = {
      sheet: v('--sheet', '#ffffff'),
      ink: v('--ink', '#1c2b4a'),
      rule: v('--rule', '#bfd0e6'),
      margin: v('--margin-line', '#e7a2ad'),
      redPen: v('--red-pen', '#c8102e'),
      pipeFill: '#fbe7ea',
      blue: v('--blue', '#2557d6'),
    };
  }

  private draw(): void {
    const ctx = this.ctx;
    const p = this.palette;
    if (!ctx || !p) {
      return;
    }
    const { width, height } = FIELD;

    // Ruled sheet with a red margin.
    ctx.fillStyle = p.sheet;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = p.rule;
    ctx.lineWidth = 1;
    for (let y = RULE_SPACING; y < height; y += RULE_SPACING) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = p.margin;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, 0);
    ctx.lineTo(MARGIN_X, height);
    ctx.stroke();

    // Pipes drawn in red pen.
    for (const pipe of this.game.pipes) {
      this.drawPipe(ctx, p, pipe.x, 0, pipe.gapY);
      this.drawPipe(ctx, p, pipe.x, pipe.gapY + PIPE_GAP, height - pipe.gapY - PIPE_GAP);
    }

    // The bird: an ink doodle that tilts with its speed; bobs while waiting.
    const bob = this.phase() === 'ready' ? Math.sin(this.idleTime / 250) * 6 : 0;
    const angle = Math.max(-0.5, Math.min(1.1, this.game.vy / 500));
    ctx.save();
    ctx.translate(BIRD_X, this.game.y + bob);
    ctx.rotate(this.phase() === 'ready' ? 0 : angle);
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.blue;
    ctx.beginPath();
    ctx.moveTo(BIRD_RADIUS - 2, -3);
    ctx.lineTo(BIRD_RADIUS + 8, 1);
    ctx.lineTo(BIRD_RADIUS - 2, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.sheet;
    ctx.beginPath();
    ctx.arc(4, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.ink;
    ctx.beginPath();
    ctx.arc(5, -4, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.sheet;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, 1);
    ctx.quadraticCurveTo(-2, this.game.vy < 0 ? -6 : 7, 3, 2);
    ctx.stroke();
    ctx.restore();

    // Floor line.
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, height - 1.5);
    ctx.lineTo(width, height - 1.5);
    ctx.stroke();
  }

  private drawPipe(ctx: CanvasRenderingContext2D, p: Palette, x: number, y: number, h: number): void {
    if (h <= 0) {
      return;
    }
    ctx.fillStyle = p.pipeFill;
    ctx.strokeStyle = p.redPen;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x, y, PIPE_WIDTH, h, 4);
    ctx.fill();
    ctx.stroke();
  }
}
