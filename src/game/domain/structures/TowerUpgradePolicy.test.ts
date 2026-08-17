import { describe, expect, it } from 'vitest';
import { GridPosition } from '../grid/GridPosition';
import { DefenseStructure } from './DefenseStructure';
import { FixedTowerUpgradePolicy } from './TowerUpgradePolicy';

function createPolicy(): FixedTowerUpgradePolicy {
  return new FixedTowerUpgradePolicy({
    maxLevel: 2,
    costs: { popgun: 2, mortar: 3, piercer: 4 },
    damageMultiplierPerLevel: 1.3,
    maxHealthMultiplierPerLevel: 1.2,
  });
}

describe('FixedTowerUpgradePolicy', () => {
  it('provides archetype costs and level-two combat multipliers', () => {
    const policy = createPolicy();
    const tower = new DefenseStructure(
      'tower',
      'tower',
      new GridPosition(1, 1),
      100,
      'popgun',
    );

    expect(policy.nextUpgradeCost(tower)).toBe(2);
    expect(policy.damageMultiplier(tower)).toBe(1);
    tower.upgradeToNextLevel(policy.maxHealthMultiplierForNextLevel(tower));

    expect(tower.maxHealth).toBe(120);
    expect(policy.damageMultiplier(tower)).toBeCloseTo(1.3);
    expect(policy.totalUpgradeInvestment(tower)).toBe(2);
    expect(policy.nextUpgradeCost(tower)).toBeNull();
  });

  it('does not upgrade or charge an obstacle', () => {
    const policy = createPolicy();
    const obstacle = new DefenseStructure(
      'wall',
      'obstacle',
      new GridPosition(1, 1),
      180,
    );

    expect(policy.nextUpgradeCost(obstacle)).toBeNull();
    expect(policy.totalUpgradeInvestment(obstacle)).toBe(0);
    expect(policy.damageMultiplier(obstacle)).toBe(1);
  });
});
