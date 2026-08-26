import { describe, expect, it } from 'vitest';
import { ReadableCombatantVisualSizePolicy } from './CombatantVisualSizePolicy';

describe('ReadableCombatantVisualSizePolicy', () => {
  const policy = new ReadableCombatantVisualSizePolicy();

  it('keeps the approved shield size unchanged', () => {
    expect(policy.displaySizeFor('tank')).toBe(68);
  });

  it('enlarges footwork-dependent units for web-game readability', () => {
    expect(policy.displaySizeFor('swarm')).toBe(64);
    expect(policy.displaySizeFor('ranger')).toBe(70);
  });
});
