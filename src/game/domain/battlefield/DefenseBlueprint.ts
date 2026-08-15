import { GridPosition } from '../grid/GridPosition';
import {
  DefenseStructure,
  type StructureKind,
} from '../structures/DefenseStructure';

interface StructureSnapshot {
  readonly id: string;
  readonly kind: StructureKind;
  readonly column: number;
  readonly row: number;
  readonly maxHealth: number;
}

export class DefenseBlueprint {
  private constructor(private readonly snapshots: readonly StructureSnapshot[]) {}

  public static capture(
    structures: readonly DefenseStructure[],
  ): DefenseBlueprint {
    return new DefenseBlueprint(
      structures.map((structure) => ({
        id: structure.id,
        kind: structure.kind,
        column: structure.position.column,
        row: structure.position.row,
        maxHealth: structure.maxHealth,
      })),
    );
  }

  public restoreStructures(): readonly DefenseStructure[] {
    return this.snapshots.map(
      (snapshot) =>
        new DefenseStructure(
          snapshot.id,
          snapshot.kind,
          new GridPosition(snapshot.column, snapshot.row),
          snapshot.maxHealth,
        ),
    );
  }
}
