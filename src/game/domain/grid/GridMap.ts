import { GridPosition } from './GridPosition';

export class GridMap {
  private readonly reservedKeys: ReadonlySet<string>;

  public constructor(
    public readonly columns: number,
    public readonly rows: number,
    public readonly entryPoints: readonly GridPosition[],
    public readonly corePosition: GridPosition,
    additionalReservedPositions: readonly GridPosition[] = [],
  ) {
    if (columns < 2 || rows < 2) {
      throw new Error('A grid map must be at least 2 × 2.');
    }

    const essentialPositions = [...entryPoints, corePosition];
    if (essentialPositions.some((position) => !this.contains(position))) {
      throw new Error('Entry points and the core must be inside the grid.');
    }

    this.reservedKeys = new Set(
      [...essentialPositions, ...additionalReservedPositions].map(
        (position) => position.key,
      ),
    );
  }

  public contains(position: GridPosition): boolean {
    return (
      position.column >= 0 &&
      position.column < this.columns &&
      position.row >= 0 &&
      position.row < this.rows
    );
  }

  public isReserved(position: GridPosition): boolean {
    return this.reservedKeys.has(position.key);
  }

  public neighborsOf(position: GridPosition): readonly GridPosition[] {
    return [
      new GridPosition(position.column + 1, position.row),
      new GridPosition(position.column - 1, position.row),
      new GridPosition(position.column, position.row + 1),
      new GridPosition(position.column, position.row - 1),
    ].filter((candidate) => this.contains(candidate));
  }
}
