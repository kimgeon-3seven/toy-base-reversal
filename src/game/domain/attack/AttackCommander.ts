import type { GridPosition } from '../grid/GridPosition';

export class AttackCommander {
  private currentHealth: number;
  private currentPosition: GridPosition;
  private attackCooldownRemainingMs = 0;
  private rallyCooldownRemainingMs = 0;
  private disruptCooldownRemainingMs = 0;

  public constructor(
    startPosition: GridPosition,
    public readonly maxHealth: number,
    public readonly attackDamage: number,
    public readonly attackRange: number,
    public readonly attackIntervalMs: number,
  ) {
    this.currentPosition = startPosition;
    this.currentHealth = maxHealth;
  }

  public get position(): GridPosition {
    return this.currentPosition;
  }

  public get health(): number {
    return this.currentHealth;
  }

  public get healthRatio(): number {
    return this.currentHealth / this.maxHealth;
  }

  public get isAlive(): boolean {
    return this.currentHealth > 0;
  }

  public get canRally(): boolean {
    return this.rallyCooldownRemainingMs === 0;
  }

  public get canDisrupt(): boolean {
    return this.disruptCooldownRemainingMs === 0;
  }

  public moveTo(position: GridPosition): void {
    this.currentPosition = position;
  }

  public takeDamage(amount: number): void {
    this.currentHealth = Math.max(0, this.currentHealth - Math.max(0, amount));
  }

  public updateCooldowns(deltaMs: number): void {
    this.attackCooldownRemainingMs = Math.max(0, this.attackCooldownRemainingMs - deltaMs);
    this.rallyCooldownRemainingMs = Math.max(0, this.rallyCooldownRemainingMs - deltaMs);
    this.disruptCooldownRemainingMs = Math.max(
      0,
      this.disruptCooldownRemainingMs - deltaMs,
    );
  }

  public canAttack(): boolean {
    return this.attackCooldownRemainingMs === 0;
  }

  public consumeAttack(): void {
    this.attackCooldownRemainingMs = this.attackIntervalMs;
  }

  public consumeRally(cooldownMs: number): boolean {
    if (!this.canRally) return false;
    this.rallyCooldownRemainingMs = cooldownMs;
    return true;
  }

  public consumeDisrupt(cooldownMs: number): boolean {
    if (!this.canDisrupt) return false;
    this.disruptCooldownRemainingMs = cooldownMs;
    return true;
  }
}
