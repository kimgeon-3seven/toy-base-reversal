import { GridPosition } from '../grid/GridPosition';
import type { TowerArchetype } from '../combat/CombatArchetype';

export type StructureKind = 'tower' | 'obstacle';

export class DefenseStructure {
  private currentHealth: number;
  private currentMaxHealth: number;
  private currentUpgradeLevel: number;

  public constructor(
    public readonly id: string,
    public readonly kind: StructureKind,
    private currentPosition: GridPosition,
    maxHealth: number,
    public readonly towerArchetype: TowerArchetype | null =
      kind === 'tower' ? 'popgun' : null,
    upgradeLevel = 1,
  ) {
    if (maxHealth <= 0) {
      throw new Error('A structure must have positive health.');
    }
    if (
      (kind === 'tower' && towerArchetype === null) ||
      (kind === 'obstacle' && towerArchetype !== null)
    ) {
      throw new Error('Tower archetype must match the structure kind.');
    }
    if (
      !Number.isInteger(upgradeLevel) ||
      upgradeLevel < 1 ||
      (kind === 'obstacle' && upgradeLevel !== 1)
    ) {
      throw new Error('Structure upgrade level is invalid.');
    }

    this.currentMaxHealth = maxHealth;
    this.currentHealth = maxHealth;
    this.currentUpgradeLevel = upgradeLevel;
  }

  public get position(): GridPosition {
    return this.currentPosition;
  }

  public get health(): number {
    return this.currentHealth;
  }

  public get maxHealth(): number {
    return this.currentMaxHealth;
  }

  public get upgradeLevel(): number {
    return this.currentUpgradeLevel;
  }

  public moveTo(position: GridPosition): void {
    this.currentPosition = position;
  }

  public takeDamage(amount: number): void {
    if (amount < 0) {
      throw new Error('Damage cannot be negative.');
    }

    this.currentHealth = Math.max(0, this.currentHealth - amount);
  }

  public restore(): void {
    this.currentHealth = this.maxHealth;
  }

  public upgradeToNextLevel(maxHealthMultiplier: number): void {
    if (this.kind !== 'tower' || maxHealthMultiplier <= 1) {
      throw new Error('Only a tower can receive a valid upgrade.');
    }
    this.currentUpgradeLevel += 1;
    this.currentMaxHealth = Math.round(
      this.currentMaxHealth * maxHealthMultiplier,
    );
    this.currentHealth = this.currentMaxHealth;
  }

  public clone(): DefenseStructure {
    return new DefenseStructure(
      this.id,
      this.kind,
      new GridPosition(this.position.column, this.position.row),
      this.maxHealth,
      this.towerArchetype,
      this.upgradeLevel,
    );
  }
}
