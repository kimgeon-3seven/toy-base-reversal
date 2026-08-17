import { describe, expect, it } from 'vitest';
import { TieredCoreLeakDamagePolicy } from './CoreLeakDamagePolicy';

describe('TieredCoreLeakDamagePolicy', () => {
  it('maps each unit cost to independently configurable core damage', () => {
    const policy = new TieredCoreLeakDamagePolicy({ 2: 6, 3: 12, 4: 24, 5: 36 });

    expect(policy.damageForCost(2)).toBe(6);
    expect(policy.damageForCost(3)).toBe(12);
    expect(policy.damageForCost(4)).toBe(24);
    expect(policy.damageForCost(5)).toBe(36);
  });

  it('rejects a unit cost without a configured damage tier', () => {
    const policy = new TieredCoreLeakDamagePolicy({ 2: 6 });

    expect(() => policy.damageForCost(3)).toThrow(
      'Core leak damage is not configured for unit cost 3',
    );
  });
});
