/**
 * Character diff of a given answer against the expected one, colored per kind:
 * ok = black, wrong = red, missing = green, extra = blue.
 */
export type DiffKind = 'ok' | 'wrong' | 'missing' | 'extra';

export interface DiffPart {
  kind: DiffKind;
  /** For ok/wrong/missing: the expected character. For extra: the typed one. */
  char: string;
}

export function levenshtein(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const curr = [i];
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[y.length];
}

/** 1 for identical strings, 0 for completely different ones. */
export function similarity(a: string, b: string): number {
  const max = Math.max(Array.from(a).length, Array.from(b).length);
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
}

export function diffAnswer(expected: string, given: string): DiffPart[] {
  const e = Array.from(expected);
  const g = Array.from(given);
  // dp[i][j] = edit distance between e[0..i) and g[0..j)
  const dp: number[][] = Array.from({ length: e.length + 1 }, (_, i) =>
    Array.from({ length: g.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= e.length; i++) {
    for (let j = 1; j <= g.length; j++) {
      const cost = e[i - 1] === g[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  const parts: DiffPart[] = [];
  let i = e.length;
  let j = g.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && e[i - 1] === g[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      parts.push({ kind: 'ok', char: e[i - 1] });
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      parts.push({ kind: 'wrong', char: e[i - 1] });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      parts.push({ kind: 'missing', char: e[i - 1] });
      i--;
    } else {
      parts.push({ kind: 'extra', char: g[j - 1] });
      j--;
    }
  }
  return parts.reverse();
}
