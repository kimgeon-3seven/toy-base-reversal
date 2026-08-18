import { describe, expect, it } from 'vitest';
import { challengeRoundFor } from './ChallengeModeConfig';

describe('ChallengeModeConfig', () => {
  it('maps absolute rounds to challenge round numbers', () => {
    expect([1, 5, 6, 7, 10].map(challengeRoundFor)).toEqual([0, 0, 1, 2, 5]);
  });

  it('rejects invalid absolute round numbers', () => {
    expect(() => challengeRoundFor(0)).toThrow();
    expect(() => challengeRoundFor(1.5)).toThrow();
  });
});

