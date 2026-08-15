import { GridPosition } from '../grid/GridPosition';

export type StructureKind = 'tower' | 'obstacle';

export class DefenseStructure {
  private currentHealth: number;

  public constructor(
    public readonly id: string,
    public readonly kind: StructureKind,
    private currentPosition: GridPosition,
    public readonly maxHealth: number,
  ) {
    if (maxHealth <= 0) {
      throw new Error('A structure must have positive health.');
    }

    this.currentHealth = maxHealth;
  }

  public get position(): GridPosition {
    return this.currentPosition;
  }

  public get health(): number {
    return this.currentHealth;
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

  public clone(): DefenseStructure {
    return new DefenseStructure(
      this.id,
      this.kind,
      new GridPosition(this.position.column, this.position.row),
      this.maxHealth,
    );
  }
}
