import type { GridPosition } from '../grid/GridPosition';

export class AttackCommander {
  private currentHealth: number;
  private currentPosition: GridPosition;
  private attackCooldownRemainingMs = 0;
  private focusFireCooldownRemainingMs = 0;
  private currentDisruptCooldownRemainingMs = 0;

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

  public get canFocusFire(): boolean {
    return this.focusFireCooldownRemainingMs === 0;
  }

  public get canDisrupt(): boolean {
    return this.currentDisruptCooldownRemainingMs === 0;
  }

  public get disruptCooldownRemainingMs(): number {
    return this.currentDisruptCooldownRemainingMs;
  }

  public moveTo(position: GridPosition): void {
    this.currentPosition = position;
  }

  public takeDamage(amount: number): void {
    this.currentHealth = Math.max(0, this.currentHealth - Math.max(0, amount));
  }

  public updateCooldowns(deltaMs: number): void {
    this.attackCooldownRemainingMs = Math.max(0, this.attackCooldownRemainingMs - deltaMs);
    this.focusFireCooldownRemainingMs = Math.max(
      0,
      this.focusFireCooldownRemainingMs - deltaMs,
    );
    this.currentDisruptCooldownRemainingMs = Math.max(
      0,
      this.currentDisruptCooldownRemainingMs - deltaMs,
    );
  }

  public canAttack(): boolean {
    return this.attackCooldownRemainingMs === 0;
  }

  public consumeAttack(): void {
    this.attackCooldownRemainingMs = this.attackIntervalMs;
  }

  public consumeFocusFire(cooldownMs: number): boolean {
    if (!this.canFocusFire) return false;
    this.focusFireCooldownRemainingMs = cooldownMs;
    return true;
  }

  public consumeDisrupt(cooldownMs: number): boolean {
    if (!this.canDisrupt) return false;
    this.currentDisruptCooldownRemainingMs = cooldownMs;
    return true;
  }
}
