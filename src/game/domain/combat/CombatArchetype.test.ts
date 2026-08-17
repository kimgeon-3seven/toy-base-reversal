import { describe, expect, it } from 'vitest';
import {
  FAVORED_DAMAGE_MULTIPLIER,
  towerDamageMultiplier,
  unitDamageMultiplier,
} from './CombatArchetype';

describe('combat archetype affinities', () => {
  it('applies the three readable tower counters', () => {
    expect(towerDamageMultiplier('popgun', 'ranger')).toBe(
      FAVORED_DAMAGE_MULTIPLIER,
    );
    expect(towerDamageMultiplier('mortar', 'swarm')).toBe(
      FAVORED_DAMAGE_MULTIPLIER,
    );
    expect(towerDamageMultiplier('piercer', 'tank')).toBe(
      FAVORED_DAMAGE_MULTIPLIER,
    );
    expect(towerDamageMultiplier('popgun', 'tank')).toBe(1);
  });

  it('mirrors the counters when the same units attack the defense', () => {
    expect(unitDamageMultiplier('tank', 'popgun')).toBe(
      FAVORED_DAMAGE_MULTIPLIER,
    );
    expect(unitDamageMultiplier('ranger', 'mortar')).toBe(
      FAVORED_DAMAGE_MULTIPLIER,
    );
    expect(unitDamageMultiplier('swarm', 'piercer')).toBe(
      FAVORED_DAMAGE_MULTIPLIER,
    );
    expect(unitDamageMultiplier('swarm', null)).toBe(1);
  });
});
