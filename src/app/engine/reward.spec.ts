import { rewardsDue } from './reward';

describe('rewardsDue', () => {
  it('owes one break per 10 correct answers', () => {
    expect(rewardsDue(9, 0)).toBe(0);
    expect(rewardsDue(10, 0)).toBe(1);
    expect(rewardsDue(10, 1)).toBe(0);
    expect(rewardsDue(19, 1)).toBe(0);
    expect(rewardsDue(20, 1)).toBe(1);
    expect(rewardsDue(5, 0, 5)).toBe(1);
  });
});
