export class GridPosition {
  public constructor(
    public readonly column: number,
    public readonly row: number,
  ) {
    if (!Number.isInteger(column) || !Number.isInteger(row)) {
      throw new Error('Grid coordinates must be integers.');
    }
  }

  public get key(): string {
    return `${this.column},${this.row}`;
  }

  public equals(other: GridPosition): boolean {
    return this.column === other.column && this.row === other.row;
  }
}
