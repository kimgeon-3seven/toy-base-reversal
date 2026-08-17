import type { TowerArchetype } from '../domain/combat/CombatArchetype';
import {
  FixedTowerUpgradePolicy,
  type TowerUpgradePolicy,
} from '../domain/structures/TowerUpgradePolicy';

export const MAX_TOWER_LEVEL = 2;
export const TOWER_UPGRADE_COSTS: Readonly<
  Record<TowerArchetype, number>
> = {
  popgun: 2,
  mortar: 3,
  piercer: 4,
};
export const TOWER_UPGRADE_DAMAGE_MULTIPLIER = 1.3;
export const TOWER_UPGRADE_HEALTH_MULTIPLIER = 1.2;

export function createPrototypeTowerUpgradePolicy(): TowerUpgradePolicy {
  return new FixedTowerUpgradePolicy({
    maxLevel: MAX_TOWER_LEVEL,
    costs: TOWER_UPGRADE_COSTS,
    damageMultiplierPerLevel: TOWER_UPGRADE_DAMAGE_MULTIPLIER,
    maxHealthMultiplierPerLevel: TOWER_UPGRADE_HEALTH_MULTIPLIER,
  });
}
