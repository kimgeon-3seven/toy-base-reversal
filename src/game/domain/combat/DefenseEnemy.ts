import type { GridPosition } from '../grid/GridPosition';
import type { UnitArchetype } from './CombatArchetype';

export interface DefenseEnemyStats {
  readonly cost: number;
  readonly maxHealth: number;
  readonly movementSpeed: number;
  readonly attackDamage: number;
  readonly attackIntervalMs: number;
  readonly attackRange: number;
  readonly archetype: UnitArchetype;
}

export class DefenseEnemy {
  private currentHealth: number;
  private currentPosition: GridPosition;
  private plannedNextPosition: GridPosition | null = null;
  private movementProgress = 0;
  private attackCooldownRemainingMs = 0;

  public constructor(
    public readonly id: string,
    startPosition: GridPosition,
    public readonly stats: DefenseEnemyStats,
  ) {
    if (
      stats.maxHealth <= 0 ||
      !Number.isInteger(stats.cost) ||
      stats.cost <= 0 ||
      stats.movementSpeed <= 0 ||
      stats.attackDamage <= 0 ||
      stats.attackIntervalMs <= 0 ||
      stats.attackRange <= 0
    ) {
      throw new Error('Enemy statistics must be positive.');
    }

    this.currentPosition = startPosition;
    this.currentHealth = stats.maxHealth;
  }

  public get position(): GridPosition {
    return this.currentPosition;
  }

  public get health(): number {
    return this.currentHealth;
  }

  public get isAlive(): boolean {
    return this.currentHealth > 0;
  }

  public get healthRatio(): number {
    return this.currentHealth / this.stats.maxHealth;
  }

  public get renderColumn(): number {
    if (this.plannedNextPosition === null) {
      return this.currentPosition.column;
    }

    return PhaserMath.lerp(
      this.currentPosition.column,
      this.plannedNextPosition.column,
      this.movementProgress,
    );
  }

  public get renderRow(): number {
    if (this.plannedNextPosition === null) {
      return this.currentPosition.row;
    }

    return PhaserMath.lerp(
      this.currentPosition.row,
      this.plannedNextPosition.row,
      this.movementProgress,
    );
  }

  public takeDamage(amount: number): void {
    if (amount < 0) {
      throw new Error('Damage cannot be negative.');
    }

    this.currentHealth = Math.max(0, this.currentHealth - amount);
  }

  public updateCooldown(deltaMs: number): void {
    this.attackCooldownRemainingMs = Math.max(
      0,
      this.attackCooldownRemainingMs - deltaMs,
    );
  }

  public canAttack(): boolean {
    return this.attackCooldownRemainingMs === 0;
  }

  public consumeAttack(): void {
    this.attackCooldownRemainingMs = this.stats.attackIntervalMs;
    this.cancelMovement();
  }

  public advanceToward(target: GridPosition, deltaMs: number): boolean {
    this.plannedNextPosition = target;
    this.movementProgress += (this.stats.movementSpeed * deltaMs) / 1000;

    if (this.movementProgress < 1) {
      return false;
    }

    this.currentPosition = target;
    this.movementProgress -= 1;
    this.plannedNextPosition = null;
    return true;
  }

  public cancelMovement(): void {
    this.plannedNextPosition = null;
    this.movementProgress = 0;
  }
}

const PhaserMath = {
  lerp(start: number, end: number, amount: number): number {
    return start + (end - start) * amount;
  },
};
