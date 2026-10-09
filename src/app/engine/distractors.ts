import { Card } from '../core/model/quiz.model';
import { levenshtein } from './diff';
import { Rng, shuffle } from './random';

export const MC_OPTION_COUNT = 4;

/**
 * Multiple choice options for a card: the correct answer plus wrong answers
 * taken from the other cards, either the ones that look most like the correct
 * answer ("similar") or random ones.
 */
export function multipleChoiceOptions(
  card: Card,
  pool: Card[],
  variant: 'similar' | 'random',
  rng: Rng,
): string[] {
  const correct = card.accepted[0];
  const acceptedLower = new Set(card.accepted.map((a) => a.toLocaleLowerCase()));
  const candidates = [
    ...new Set(
      pool
        .filter((c) => c.itemId !== card.itemId && c.reversed === card.reversed)
        .map((c) => c.accepted[0])
        .filter((a) => !acceptedLower.has(a.toLocaleLowerCase())),
    ),
  ];

  const wanted = MC_OPTION_COUNT - 1;
  const distractors =
    variant === 'similar'
      ? shuffle(candidates, rng)
          .map((a) => ({ a, d: levenshtein(a.toLocaleLowerCase(), correct.toLocaleLowerCase()) }))
          .sort((x, y) => x.d - y.d)
          .slice(0, wanted)
          .map((x) => x.a)
      : shuffle(candidates, rng).slice(0, wanted);

  return shuffle([correct, ...distractors], rng);
}
