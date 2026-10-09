import { Rng } from './random';

/** Flappy Bird in logical units on a fixed field; drawing and timing live in the component. */
export const FIELD = { width: 480, height: 320 };

export const BIRD_X = 110;
export const BIRD_RADIUS = 11;
/** px/s² and px/s; positive y is down. */
export const GRAVITY = 1300;
export const FLAP_VELOCITY = -390;
export const MAX_FALL_SPEED = 600;

export const PIPE_WIDTH = 52;
export const PIPE_GAP = 112;
export const PIPE_SPEED = 140;
export const PIPE_INTERVAL_MS = 1500;
/** Keeps gaps away from the very top and bottom. */
export const GAP_MARGIN = 40;

/** A long frame (tab in the background) is simulated as at most this much time. */
export const MAX_STEP_MS = 50;

export interface Pipe {
  x: number;
  /** Top of the gap. */
  gapY: number;
  passed: boolean;
}

export class FlappyGame {
  y = FIELD.height / 2;
  vy = 0;
  pipes: Pipe[] = [];
  score = 0;
  crashed = false;
  elapsedMs = 0;
  private sinceSpawnMs = 0;

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

    this.sinceSpawnMs += dtMsCapped;
    if (this.pipes.length === 0 || this.sinceSpawnMs >= PIPE_INTERVAL_MS) {
      this.spawnPipe();
    }
    for (const pipe of this.pipes) {
      pipe.x -= PIPE_SPEED * dt;
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

  private spawnPipe(): void {
    this.sinceSpawnMs = 0;
    const range = FIELD.height - 2 * GAP_MARGIN - PIPE_GAP;
    this.pipes.push({ x: FIELD.width, gapY: GAP_MARGIN + this.rng() * range, passed: false });
  }

  private hitsBounds(): boolean {
    return this.y - BIRD_RADIUS <= 0 || this.y + BIRD_RADIUS >= FIELD.height;
  }

  /** Circle against the two pipe rectangles. */
  private hitsPipe(pipe: Pipe): boolean {
    const nearestX = Math.max(pipe.x, Math.min(BIRD_X, pipe.x + PIPE_WIDTH));
    const dx = BIRD_X - nearestX;
    if (Math.abs(dx) > BIRD_RADIUS) {
      return false;
    }
    const reach = Math.sqrt(BIRD_RADIUS * BIRD_RADIUS - dx * dx);
    return this.y - reach < pipe.gapY || this.y + reach > pipe.gapY + PIPE_GAP;
  }
}
