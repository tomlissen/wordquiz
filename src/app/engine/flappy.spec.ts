import {
  BIRD_RADIUS,
  BIRD_X,
  FlappyGame,
  MAX_LEVEL,
  MAX_STEP_MS,
  PIPE_GAP,
  PIPE_SPEED,
  PIPE_WIDTH,
  PLAY_HEIGHT,
  SPEED_UP,
} from './flappy';
import { seededRng } from './random';

/** Runs the game in 16ms frames, flapping whenever the bird drops below `targetY`. */
function fly(game: FlappyGame, ms: number, targetY: () => number): void {
  for (let t = 0; t < ms && !game.crashed; t += 16) {
    if (game.y > targetY() && game.vy > 0) {
      game.flap();
    }
    game.step(16);
  }
}

describe('FlappyGame', () => {
  it('falls under gravity and goes up after a flap', () => {
    const game = new FlappyGame(seededRng(1));
    const start = game.y;
    game.step(100);
    expect(game.y).toBeGreaterThan(start);
    const before = game.y;
    game.flap();
    game.step(50);
    expect(game.y).toBeLessThan(before);
  });

  it('crashes on the floor and on the ceiling', () => {
    const floor = new FlappyGame(seededRng(1));
    for (let i = 0; i < 200 && !floor.crashed; i++) floor.step(16);
    expect(floor.crashed).toBe(true);
    expect(floor.y + BIRD_RADIUS).toBeGreaterThanOrEqual(PLAY_HEIGHT);

    const ceiling = new FlappyGame(seededRng(1));
    for (let i = 0; i < 200 && !ceiling.crashed; i++) {
      ceiling.flap();
      ceiling.step(16);
    }
    expect(ceiling.crashed).toBe(true);
    expect(ceiling.y - BIRD_RADIUS).toBeLessThanOrEqual(0);
  });

  it('crashes into a pipe but flies through the gap', () => {
    const wall = new FlappyGame(() => 0); // gap at the very top
    fly(wall, 10_000, () => PLAY_HEIGHT - 40); // hug the bottom
    expect(wall.crashed).toBe(true);
    expect(wall.score).toBe(0);

    const pilot = new FlappyGame(seededRng(7));
    // Aim for the middle of the gap of the next pipe that isn't behind the bird yet.
    const nextGapCenter = () => {
      const next = pilot.pipes.find((p) => p.x + PIPE_WIDTH >= BIRD_X - BIRD_RADIUS);
      return next ? next.gapY + next.gap / 2 + 12 : PLAY_HEIGHT / 2;
    };
    fly(pilot, 10_000, nextGapCenter);
    expect(pilot.crashed).toBe(false);
    expect(pilot.score).toBeGreaterThanOrEqual(4);
  });

  it('scores exactly one point per pipe passed', () => {
    const game = new FlappyGame(() => 0.5);
    const gapCenter = PLAY_HEIGHT / 2; // centred gaps stay centred as they shrink
    fly(game, 4_000, () => gapCenter + 12);
    expect(game.crashed).toBe(false);
    const passed = game.score;
    expect(passed).toBeGreaterThan(0);
    expect(game.pipes.filter((p) => p.passed).length).toBeLessThanOrEqual(passed);
  });

  it('gets faster with narrower gaps as the score goes up, up to a limit', () => {
    const game = new FlappyGame(() => 0.5);
    expect(game.speed).toBe(PIPE_SPEED);
    fly(game, 6_000, () => PLAY_HEIGHT / 2 + 12); // long enough for a pipe to appear after a point
    expect(game.crashed).toBe(false);
    expect(game.score).toBeGreaterThan(1);
    expect(game.speed).toBeGreaterThan(PIPE_SPEED);
    expect(game.pipes.at(-1)!.gap).toBeLessThan(PIPE_GAP);

    game.score = 100;
    expect(game.speed).toBeCloseTo(PIPE_SPEED * (1 + MAX_LEVEL * SPEED_UP));
  });

  it('gives the same gaps for the same seed', () => {
    const a = new FlappyGame(seededRng(42));
    const b = new FlappyGame(seededRng(42));
    a.step(16);
    b.step(16);
    expect(a.pipes.map((p) => p.gapY)).toEqual(b.pipes.map((p) => p.gapY));
  });

  it('caps long frames', () => {
    const game = new FlappyGame(seededRng(1));
    game.step(5_000);
    expect(game.elapsedMs).toBe(MAX_STEP_MS);
    expect(game.crashed).toBe(false);
  });
});
