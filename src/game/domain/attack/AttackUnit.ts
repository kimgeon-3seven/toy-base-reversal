import type { GridPosition } from '../grid/GridPosition';
import type { AttackUnitKind } from './SquadPlan';

export interface AttackUnitStats {
  readonly maxHealth: number;
  readonly movementSpeed: number;
  readonly attackDamage: number;
  readonly attackRange: number;
  readonly attackIntervalMs: number;
}

export class AttackUnit {
  private currentHealth: number;
  private currentPosition: GridPosition;
  private nextPosition: GridPosition | null = null;
  private movementProgress = 0;
  private attackCooldownRemainingMs = 0;

  public constructor(
    public readonly id: string,
    public readonly kind: AttackUnitKind,
    startPosition: GridPosition,
    public readonly stats: AttackUnitStats,
  ) {
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

  public get isMoving(): boolean {
    return this.nextPosition !== null;
  }

  public get renderColumn(): number {
    return this.interpolate(this.currentPosition.column, this.nextPosition?.column);
  }

  public get renderRow(): number {
    return this.interpolate(this.currentPosition.row, this.nextPosition?.row);
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

  public takeDamage(amount: number): void {
    this.currentHealth = Math.max(0, this.currentHealth - Math.max(0, amount));
  }

  public advanceToward(target: GridPosition, deltaMs: number, speedMultiplier = 1): void {
    this.nextPosition = target;
    this.movementProgress +=
      (this.stats.movementSpeed * speedMultiplier * deltaMs) / 1000;
    if (this.movementProgress >= 1) {
      this.currentPosition = target;
      this.movementProgress -= 1;
      this.nextPosition = null;
    }
  }

  public cancelMovement(): void {
    this.nextPosition = null;
    this.movementProgress = 0;
  }

  private interpolate(start: number, end: number | undefined): number {
    return end === undefined
      ? start
      : start + (end - start) * this.movementProgress;
  }
}
