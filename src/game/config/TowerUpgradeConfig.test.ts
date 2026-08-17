import { describe, expect, it } from 'vitest';
import { GridPosition } from '../domain/grid/GridPosition';
import { DefenseStructure } from '../domain/structures/DefenseStructure';
import {
  createPrototypeTowerUpgradePolicy,
  MAX_TOWER_LEVEL,
  TOWER_UPGRADE_COSTS,
  TOWER_UPGRADE_DAMAGE_MULTIPLIER,
  TOWER_UPGRADE_HEALTH_MULTIPLIER,
} from './TowerUpgradeConfig';

describe('TowerUpgradeConfig', () => {
  it('matches the approved prototype upgrade rules', () => {
    expect(MAX_TOWER_LEVEL).toBe(2);
    expect(TOWER_UPGRADE_COSTS).toEqual({
      popgun: 2,
      mortar: 3,
      piercer: 4,
    });
    expect(TOWER_UPGRADE_DAMAGE_MULTIPLIER).toBe(1.3);
    expect(TOWER_UPGRADE_HEALTH_MULTIPLIER).toBe(1.2);
  });

  it('creates a policy that stops a tower at level two', () => {
    const policy = createPrototypeTowerUpgradePolicy();
    const tower = new DefenseStructure(
      'tower',
      'tower',
      new GridPosition(1, 1),
      115,
      'mortar',
    );

    expect(policy.nextUpgradeCost(tower)).toBe(3);
    tower.upgradeToNextLevel(policy.maxHealthMultiplierForNextLevel(tower));
    expect(policy.nextUpgradeCost(tower)).toBeNull();
    expect(tower.maxHealth).toBe(138);
  });
});
