import { REWARD_EVERY } from '../core/model/settings.model';

/**
 * How many game breaks are owed: one per `every` correct answers. Based on the
 * running total, so an answer turned correct afterwards can earn a break too.
 */
export function rewardsDue(correct: number, alreadyGiven: number, every = REWARD_EVERY): number {
  return Math.max(0, Math.floor(correct / every) - alreadyGiven);
}
