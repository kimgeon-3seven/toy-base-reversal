import { describe, expect, it } from 'vitest';
import {
  LinearSortiePointPolicy,
  StagedCappedSortiePointPolicy,
} from './SortiePointPolicy';

describe('LinearSortiePointPolicy', () => {
  it('grants fresh points from the approved normal-round curve', () => {
    const policy = new LinearSortiePointPolicy(24, 3);

    expect([1, 2, 3, 4, 5].map((round) => policy.pointsForRound(round))).toEqual(
      [24, 27, 30, 33, 36],
    );
  });

  it('rejects invalid policy values and round numbers', () => {
    expect(() => new LinearSortiePointPolicy(0, 3)).toThrow();
    expect(() => new LinearSortiePointPolicy(24, -1)).toThrow();
    expect(() => new LinearSortiePointPolicy(24, 3).pointsForRound(0)).toThrow();
  });

  it('uses a separate capped growth curve after normal mode', () => {
    const policy = new StagedCappedSortiePointPolicy(24, 3, 5, 2, 48);

    expect([1, 5, 6, 7, 10, 11, 20].map((round) =>
      policy.pointsForRound(round),
    )).toEqual([24, 36, 38, 40, 46, 48, 48]);
  });

  it('rejects a cap below the final normal-mode allowance', () => {
    expect(
      () => new StagedCappedSortiePointPolicy(24, 3, 5, 2, 35),
    ).toThrow();
  });
});
