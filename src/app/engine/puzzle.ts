import { Rng, shuffle } from './random';

/** "Puzzle": the answer goes through the meat grinder. Spaces are kept out of the tiles. */
export function scrambleLetters(answer: string, rng: Rng): string[] {
  const letters = Array.from(answer).filter((c) => !/\s/.test(c));
  if (new Set(letters).size < 2) {
    return letters;
  }
  for (let attempt = 0; attempt < 10; attempt++) {
    const scrambled = shuffle(letters, rng);
    if (scrambled.join('') !== letters.join('')) {
      return scrambled;
    }
  }
  return [...letters].reverse();
}
