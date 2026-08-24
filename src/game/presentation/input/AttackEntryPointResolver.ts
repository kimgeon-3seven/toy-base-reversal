import type { GridPosition } from '../../domain/grid/GridPosition';

export class AttackEntryPointResolver {
  public constructor(
    private readonly entryPoints: readonly GridPosition[],
  ) {}

  public laneIndexAt(position: GridPosition | null): number | null {
    if (position === null) return null;
    const laneIndex = this.entryPoints.findIndex((entry) =>
      entry.equals(position),
    );
    return laneIndex < 0 ? null : laneIndex;
  }
}
