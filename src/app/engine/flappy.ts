import { Rng } from './random';

/** Flappy Bird in logical units on a fixed field; drawing and timing live in the component. */
export const FIELD = { width: 480, height: 320 };
/** The strip of ground at the bottom; the bird crashes on top of it. */
export const GROUND_HEIGHT = 44;
/** The height the bird can fly in, from the top of the field to the ground. */
export const PLAY_HEIGHT = FIELD.height - GROUND_HEIGHT;

export const BIRD_X = 110;
export const BIRD_RADIUS = 11;
/** px/s² and px/s; positive y is down. */
export const GRAVITY = 1300;
export const FLAP_VELOCITY = -390;
export const MAX_FALL_SPEED = 600;

export const PIPE_WIDTH = 52;
/** Gap and speed at the start; both get harder with every point, up to MAX_LEVEL points. */
export const PIPE_GAP = 112;
export const PIPE_SPEED = 140;
/** Pipes stay this far apart, so faster pipes also come more often. */
export const PIPE_SPACING = 210;
export const MAX_LEVEL = 12;
/** Per point: the gap shrinks by this many px and the speed goes up by this fraction. */
export const GAP_SHRINK = 2;
export const SPEED_UP = 0.04;
/** Keeps gaps away from the very top and bottom. */
export const GAP_MARGIN = 40;

/** A long frame (tab in the background) is simulated as at most this much time. */
export const MAX_STEP_MS = 50;

export interface Pipe {
  x: number;
  /** Top of the gap. */
  gapY: number;
  /** Height of the gap, fixed when the pipe appears. */
  gap: number;
  passed: boolean;
}

export class FlappyGame {
  y = PLAY_HEIGHT / 2;
  vy = 0;
  pipes: Pipe[] = [];
  score = 0;
  crashed = false;
  elapsedMs = 0;
  /** Distance the pipes have moved since the last one appeared. */
  private sinceSpawn = 0;

  constructor(private readonly rng: Rng) {}

  flap(): void {
    if (!this.crashed) {
      this.vy = FLAP_VELOCITY;
    }
  }

  step(dtMs: number): void {
    if (this.crashed || dtMs <= 0) {
      return;
    }
    const dtMsCapped = Math.min(dtMs, MAX_STEP_MS);
    const dt = dtMsCapped / 1000;
    this.elapsedMs += dtMsCapped;

    this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL_SPEED);
    this.y += this.vy * dt;

    const move = this.speed * dt;
    this.sinceSpawn += move;
    if (this.pipes.length === 0 || this.sinceSpawn >= PIPE_SPACING) {
      this.spawnPipe();
    }
    for (const pipe of this.pipes) {
      pipe.x -= move;
      if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X - BIRD_RADIUS) {
        pipe.passed = true;
        this.score++;
      }
    }
    this.pipes = this.pipes.filter((p) => p.x + PIPE_WIDTH > 0);

    if (this.hitsBounds() || this.pipes.some((p) => this.hitsPipe(p))) {
      this.crashed = true;
    }
  }

  /** How far the pipes move per second; goes up with the score. */
  get speed(): number {
    return PIPE_SPEED * (1 + this.level * SPEED_UP);
  }

  private get level(): number {
    return Math.min(this.score, MAX_LEVEL);
  }

  private spawnPipe(): void {
    this.sinceSpawn = 0;
    const gap = PIPE_GAP - this.level * GAP_SHRINK;
    const range = PLAY_HEIGHT - 2 * GAP_MARGIN - gap;
    this.pipes.push({ x: FIELD.width, gapY: GAP_MARGIN + this.rng() * range, gap, passed: false });
  }

  private hitsBounds(): boolean {
    return this.y - BIRD_RADIUS <= 0 || this.y + BIRD_RADIUS >= PLAY_HEIGHT;
  }

  /** Circle against the two pipe rectangles. */
  private hitsPipe(pipe: Pipe): boolean {
    const nearestX = Math.max(pipe.x, Math.min(BIRD_X, pipe.x + PIPE_WIDTH));
    const dx = BIRD_X - nearestX;
    if (Math.abs(dx) > BIRD_RADIUS) {
      return false;
    }
    const reach = Math.sqrt(BIRD_RADIUS * BIRD_RADIUS - dx * dx);
    return this.y - reach < pipe.gapY || this.y + reach > pipe.gapY + pipe.gap;
  }
}
