import { Card, isComplete, KNOWN_STREAK, QuizItem } from '../core/model/quiz.model';
import { Direction, Order, TestSettings } from '../core/model/settings.model';
import { Rng, shuffle } from './random';

/** Vragenlijst: picks the items that take part in the test. */
export function selectItems(allItems: QuizItem[], settings: TestSettings, rng: Rng): QuizItem[] {
  const items = allItems.filter(isComplete);
  const n = Math.max(1, settings.selectionCount);
  switch (settings.selection) {
    case 'all':
      return items;
    case 'everWrong':
      return items.filter((i) => i.stats.errors > 0);
    case 'checked':
      return items.filter((i) => i.checked);
    case 'hardest':
      return hardestItems(items, n);
    case 'sample': {
      const picked = new Set(shuffle(items, rng).slice(0, n));
      return items.filter((i) => picked.has(i));
    }
    case 'new':
      return items.filter((i) => i.stats.testCount === 0);
    case 'skipKnown':
      return items.filter((i) => i.stats.consecutiveCorrect < KNOWN_STREAK);
  }
}

/** Items with errors, ranked by error rate and then by number of errors. Keeps list order. */
export function hardestItems(items: QuizItem[], n: number): QuizItem[] {
  const errorRate = (i: QuizItem) => i.stats.errors / Math.max(1, i.stats.testCount);
  const ranked = items
    .filter((i) => i.stats.errors > 0)
    .sort((a, b) => errorRate(b) - errorRate(a) || b.stats.errors - a.stats.errors)
    .slice(0, n);
  const picked = new Set(ranked);
  return items.filter((i) => picked.has(i));
}

/** Vraagstelling: turns items into directional cards. "both" asks all forward cards first. */
export function buildCards(items: QuizItem[], direction: Direction): Card[] {
  const forward = items.map((i) => toCard(i, false));
  const reverse = items.map((i) => toCard(i, true));
  switch (direction) {
    case 'forward':
      return forward;
    case 'reverse':
      return reverse;
    case 'both':
      return [...forward, ...reverse];
  }
}

export function toCard(item: QuizItem, reversed: boolean): Card {
  return {
    key: `${item.id}:${reversed ? 'r' : 'f'}`,
    itemId: item.id,
    reversed,
    prompts: reversed ? item.answers : item.questions,
    accepted: reversed ? item.questions : item.answers,
    remark: item.remark,
  };
}

/** Volgorde. */
export function orderCards(cards: Card[], order: Order, rng: Rng): Card[] {
  switch (order) {
    case 'asEntered':
      return [...cards];
    case 'reversed':
      return [...cards].reverse();
    case 'shuffled':
      return shuffle(cards, rng);
  }
}

export function prepareCards(items: QuizItem[], settings: TestSettings, rng: Rng): Card[] {
  const selected = selectItems(items, settings, rng);
  return orderCards(buildCards(selected, settings.direction), settings.order, rng);
}
