import type { TowerArchetype } from '../combat/CombatArchetype';
import type { DefenseStructure } from './DefenseStructure';

export interface TowerUpgradePolicy {
  readonly maxLevel: number;
  nextUpgradeCost(structure: DefenseStructure): number | null;
  totalUpgradeInvestment(structure: DefenseStructure): number;
  damageMultiplier(structure: DefenseStructure): number;
  maxHealthMultiplierForNextLevel(structure: DefenseStructure): number;
}

export interface TowerUpgradeSettings {
  readonly maxLevel: number;
  readonly costs: Readonly<Record<TowerArchetype, number>>;
  readonly damageMultiplierPerLevel: number;
  readonly maxHealthMultiplierPerLevel: number;
}

export class FixedTowerUpgradePolicy implements TowerUpgradePolicy {
  public readonly maxLevel: number;

  public constructor(private readonly settings: TowerUpgradeSettings) {
    this.maxLevel = settings.maxLevel;
    if (
      !Number.isInteger(settings.maxLevel) ||
      settings.maxLevel < 2 ||
      Object.values(settings.costs).some(
        (cost) => !Number.isInteger(cost) || cost <= 0,
      ) ||
      settings.damageMultiplierPerLevel <= 1 ||
      settings.maxHealthMultiplierPerLevel <= 1
    ) {
      throw new Error('Tower upgrade settings are invalid.');
    }
  }

  public nextUpgradeCost(structure: DefenseStructure): number | null {
    const archetype = this.towerArchetypeOf(structure);
    if (archetype === null || structure.upgradeLevel >= this.maxLevel) {
      return null;
    }
    return this.settings.costs[archetype];
  }

  public totalUpgradeInvestment(structure: DefenseStructure): number {
    const archetype = this.towerArchetypeOf(structure);
    if (archetype === null) return 0;
    return this.settings.costs[archetype] * (structure.upgradeLevel - 1);
  }

  public damageMultiplier(structure: DefenseStructure): number {
    if (this.towerArchetypeOf(structure) === null) return 1;
    return Math.pow(
      this.settings.damageMultiplierPerLevel,
      structure.upgradeLevel - 1,
    );
  }

  public maxHealthMultiplierForNextLevel(
    structure: DefenseStructure,
  ): number {
    return this.nextUpgradeCost(structure) === null
      ? 1
      : this.settings.maxHealthMultiplierPerLevel;
  }

  private towerArchetypeOf(
    structure: DefenseStructure,
  ): TowerArchetype | null {
    return structure.kind === 'tower' ? structure.towerArchetype : null;
  }
}
