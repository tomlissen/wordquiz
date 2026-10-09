import { MatchOptions } from '../core/model/settings.model';
import { similarity } from './diff';

export interface MatchResult {
  correct: boolean;
  /** The accepted answer closest to the input; used for feedback and bonus points. */
  closest: string;
  /** 0..1 similarity between normalized input and the closest accepted answer. */
  similarity: number;
}

const PUNCTUATION = /[\p{P}\p{S}]/gu;
const DIGITS = /\p{Nd}+/gu;
const COMBINING_MARKS = /\p{M}/gu;

/** Applies the Controle options. Without options only whitespace is normalized. */
export function normalize(value: string, opts: MatchOptions): string {
  let s = value;
  if (opts.ignoreNumbers) {
    s = s.replace(DIGITS, ' ');
  }
  if (opts.ignorePunctuation) {
    s = s.replace(PUNCTUATION, ' ');
  }
  if (opts.ignoreAccents) {
    s = s.normalize('NFD').replace(COMBINING_MARKS, '').normalize('NFC');
  }
  if (opts.ignoreCase) {
    s = s.toLocaleLowerCase();
  }
  s = s.replace(/\s+/g, ' ').trim();
  if (opts.anyWordOrder) {
    s = s.split(' ').sort().join(' ');
  }
  return s;
}

export function checkAnswer(input: string, accepted: string[], opts: MatchOptions): MatchResult {
  const given = normalize(input, opts);
  let best: MatchResult = { correct: false, closest: accepted[0] ?? '', similarity: -1 };
  for (const answer of accepted) {
    const expected = normalize(answer, opts);
    if (given === expected) {
      return { correct: true, closest: answer, similarity: 1 };
    }
    const sim = similarity(given, expected);
    if (sim > best.similarity) {
      best = { correct: false, closest: answer, similarity: sim };
    }
  }
  return { ...best, similarity: Math.max(0, best.similarity) };
}

/**
 * For "The English Teacher": is what has been typed so far still the start of
 * some accepted answer? Word order and trailing whitespace are not relaxed
 * here, since the check runs per keystroke.
 */
export function isPrefixOfAnswer(typed: string, accepted: string[], opts: MatchOptions): boolean {
  const prefixOpts = { ...opts, anyWordOrder: false };
  const given = normalizeKeepTrailingSpace(typed, prefixOpts);
  return accepted.some((a) => normalizeKeepTrailingSpace(a, prefixOpts).startsWith(given));
}

function normalizeKeepTrailingSpace(value: string, opts: MatchOptions): string {
  const trailing = /\s$/.test(value) ? ' ' : '';
  return normalize(value, opts) + trailing;
}
