import { BIRD_RADIUS, FIELD, GROUND_HEIGHT, PIPE_WIDTH, PLAY_HEIGHT } from '../../../engine/flappy';

/** Canvas drawing for the Flappy Bird break, in the colours of the original game. */
export const COLORS = {
  skyTop: '#4ec0ca',
  skyBottom: '#bfeaf0',
  cloud: '#ffffff',
  skyline: '#a6dfd0',
  skylineWindow: '#d4f1e9',
  bush: '#86d07e',
  pipe: '#73bf2e',
  pipeLight: '#9ce659',
  pipeDark: '#558c22',
  pipeOutline: '#2d5a12',
  sand: '#ded895',
  sandStripe: '#d2c97b',
  grass: '#5ee270',
  grassDark: '#3fae4f',
  outline: '#543847',
  bird: '#f8d32a',
  birdBelly: '#fbe68a',
  wing: '#fff7d1',
  beak: '#f37a1f',
  beakLow: '#e05a13',
  cheek: '#f2754b',
  white: '#ffffff',
} as const;

const CAP_OVERHANG = 6;
const CAP_HEIGHT = 22;
const CLOUD_TILE = 240;
const SKYLINE_TILE = 200;
const STRIPE_SPACING = 16;

/** Sky, clouds and skyline; `scroll` is how far the world has moved, in px. */
export function drawBackground(ctx: CanvasRenderingContext2D, scroll: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, PLAY_HEIGHT);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, PLAY_HEIGHT);

  ctx.fillStyle = COLORS.cloud;
  for (let x = -mod(scroll * 0.15, CLOUD_TILE); x < FIELD.width; x += CLOUD_TILE) {
    cloud(ctx, x + 40, 60, 1);
    cloud(ctx, x + 170, 105, 0.7);
  }

  // All buildings first, so a tile's buildings never cover the bushes of the tile before it.
  const skylineStart = -mod(scroll * 0.4, SKYLINE_TILE);
  for (let x = skylineStart; x < FIELD.width; x += SKYLINE_TILE) {
    buildings(ctx, x);
  }
  for (let x = skylineStart; x < FIELD.width; x += SKYLINE_TILE) {
    bushes(ctx, x);
  }
}

export function drawPipe(ctx: CanvasRenderingContext2D, x: number, gapTop: number, gapBottom: number): void {
  // Top pipe hangs down to the gap, bottom pipe stands up from the ground.
  pipeBody(ctx, x, -2, gapTop + 2);
  pipeCap(ctx, x, gapTop - CAP_HEIGHT);
  pipeBody(ctx, x, gapBottom, PLAY_HEIGHT - gapBottom);
  pipeCap(ctx, x, gapBottom);
}

export function drawGround(ctx: CanvasRenderingContext2D, scroll: number): void {
  const top = PLAY_HEIGHT;
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(0, top, FIELD.width, GROUND_HEIGHT);

  // Diagonal stripes on the grass band move with the pipes.
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, top, FIELD.width, 12);
  ctx.fillStyle = COLORS.grassDark;
  for (let x = -mod(scroll, STRIPE_SPACING) - STRIPE_SPACING; x < FIELD.width; x += STRIPE_SPACING) {
    ctx.beginPath();
    ctx.moveTo(x, top + 12);
    ctx.lineTo(x + 8, top + 12);
    ctx.lineTo(x + 14, top + 3);
    ctx.lineTo(x + 6, top + 3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = COLORS.sandStripe;
  ctx.fillRect(0, top + 12, FIELD.width, 3);

  line(ctx, COLORS.outline, 2, 0, top + 1, FIELD.width, top + 1);
}

/**
 * The bird at the origin of a context already moved and rotated into place.
 * `wingPhase` runs from 0 to 1 through one wing beat.
 */
export function drawBird(ctx: CanvasRenderingContext2D, wingPhase: number): void {
  const r = BIRD_RADIUS + 2;
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.outline;

  // Body, slightly wider than tall, with a paler belly.
  ctx.fillStyle = COLORS.bird;
  ctx.beginPath();
  ctx.ellipse(0, 0, r + 2, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.birdBelly;
  ctx.beginPath();
  ctx.ellipse(-1, 5, r - 2, r - 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, r + 2, r, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Eye.
  ctx.fillStyle = COLORS.white;
  ctx.beginPath();
  ctx.arc(6, -5, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.outline;
  ctx.beginPath();
  ctx.arc(8, -5, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Cheek and a two-part beak.
  ctx.fillStyle = COLORS.cheek;
  ctx.beginPath();
  ctx.ellipse(2, 4, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.beak;
  ctx.beginPath();
  ctx.roundRect(r - 3, -2, 12, 5, 2.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.beakLow;
  ctx.beginPath();
  ctx.roundRect(r - 4, 3, 10, 4, 2);
  ctx.fill();
  ctx.stroke();

  // Wing: up, level, down.
  const frame = Math.floor(wingPhase * 3) % 3;
  const tipY = [-7, 1, 8][frame];
  ctx.fillStyle = COLORS.wing;
  ctx.beginPath();
  ctx.moveTo(-r + 2, 0);
  ctx.quadraticCurveTo(-r - 4, tipY, -r + 4, tipY + 2);
  ctx.quadraticCurveTo(-2, tipY + 3, -1, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** The score in big white outlined figures at the top, as in the original. */
export function drawScore(ctx: CanvasRenderingContext2D, score: number, font: string): void {
  ctx.font = `800 40px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = COLORS.outline;
  ctx.strokeText(String(score), FIELD.width / 2, 14);
  ctx.fillStyle = COLORS.white;
  ctx.fillText(String(score), FIELD.width / 2, 14);
}

function pipeBody(ctx: CanvasRenderingContext2D, x: number, y: number, h: number): void {
  if (h <= 0) {
    return;
  }
  ctx.fillStyle = COLORS.pipe;
  ctx.fillRect(x, y, PIPE_WIDTH, h);
  ctx.fillStyle = COLORS.pipeLight;
  ctx.fillRect(x + 6, y, 8, h);
  ctx.fillStyle = COLORS.pipeDark;
  ctx.fillRect(x + PIPE_WIDTH - 12, y, 6, h);
  ctx.strokeStyle = COLORS.pipeOutline;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, PIPE_WIDTH, h);
}

function pipeCap(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const left = x - CAP_OVERHANG;
  const width = PIPE_WIDTH + 2 * CAP_OVERHANG;
  ctx.fillStyle = COLORS.pipe;
  ctx.fillRect(left, y, width, CAP_HEIGHT);
  ctx.fillStyle = COLORS.pipeLight;
  ctx.fillRect(left + 6, y + 2, 9, CAP_HEIGHT - 4);
  ctx.fillStyle = COLORS.pipeDark;
  ctx.fillRect(left + width - 13, y + 2, 7, CAP_HEIGHT - 4);
  ctx.strokeStyle = COLORS.pipeOutline;
  ctx.lineWidth = 2;
  ctx.strokeRect(left, y, width, CAP_HEIGHT);
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.arc(x, y, 18 * size, 0, Math.PI * 2);
  ctx.arc(x + 22 * size, y - 8 * size, 22 * size, 0, Math.PI * 2);
  ctx.arc(x + 46 * size, y, 17 * size, 0, Math.PI * 2);
  ctx.rect(x, y, 46 * size, 17 * size);
  ctx.fill();
}

/** One tile of buildings with lit windows. */
function buildings(ctx: CanvasRenderingContext2D, x: number): void {
  const base = PLAY_HEIGHT;
  const blocks = [
    [0, 26, 70],
    [28, 34, 100],
    [64, 24, 60],
    [90, 30, 85],
    [122, 40, 115],
    [164, 36, 75],
  ];
  for (const [bx, w, h] of blocks) {
    ctx.fillStyle = COLORS.skyline;
    ctx.fillRect(x + bx, base - h, w, h);
    ctx.fillStyle = COLORS.skylineWindow;
    for (let wy = base - h + 8; wy < base - 30; wy += 12) {
      for (let wx = bx + 5; wx < bx + w - 6; wx += 9) {
        ctx.fillRect(x + wx, wy, 4, 5);
      }
    }
  }
}

/** One tile of bushes along the ground; the first bush of the next tile closes the row. */
function bushes(ctx: CanvasRenderingContext2D, x: number): void {
  const base = PLAY_HEIGHT;
  ctx.fillStyle = COLORS.bush;
  ctx.beginPath();
  for (let bx = 0; bx < SKYLINE_TILE; bx += 25) {
    ctx.moveTo(x + bx, base - 6);
    ctx.arc(x + bx, base - 6, 18 + ((bx / 25) % 3) * 4, Math.PI, 0);
  }
  ctx.rect(x, base - 6, SKYLINE_TILE, 6);
  ctx.fill();
}

function line(ctx: CanvasRenderingContext2D, color: string, width: number, x1: number, y1: number, x2: number, y2: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
