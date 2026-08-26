import { GridPosition } from '../grid/GridPosition';
import {
  DefenseStructure,
  type StructureKind,
} from '../structures/DefenseStructure';
import type { TowerArchetype } from '../combat/CombatArchetype';

export interface DefenseStructureSnapshot {
  readonly id: string;
  readonly kind: StructureKind;
  readonly column: number;
  readonly row: number;
  readonly maxHealth: number;
  readonly towerArchetype: TowerArchetype | null;
  readonly upgradeLevel: number;
}

export interface DefenseBlueprintSnapshot {
  readonly structures: readonly DefenseStructureSnapshot[];
}

export class DefenseBlueprint {
  private constructor(
    private readonly snapshots: readonly DefenseStructureSnapshot[],
  ) {}

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
        towerArchetype: structure.towerArchetype,
        upgradeLevel: structure.upgradeLevel,
      })),
    );
  }

  public static restore(snapshot: DefenseBlueprintSnapshot): DefenseBlueprint {
    if (!Array.isArray(snapshot.structures)) {
      throw new Error('A defense blueprint requires a structure list.');
    }

    const ids = new Set<string>();
    const structures = snapshot.structures.map((structure) => {
      if (
        typeof structure.id !== 'string' ||
        structure.id.length === 0 ||
        ids.has(structure.id) ||
        (structure.kind !== 'tower' && structure.kind !== 'obstacle') ||
        !Number.isInteger(structure.column) ||
        !Number.isInteger(structure.row) ||
        !Number.isFinite(structure.maxHealth) ||
        structure.maxHealth <= 0 ||
        !Number.isInteger(structure.upgradeLevel) ||
        structure.upgradeLevel < 1 ||
        (structure.kind === 'tower' &&
          structure.towerArchetype !== 'popgun' &&
          structure.towerArchetype !== 'mortar' &&
          structure.towerArchetype !== 'piercer') ||
        (structure.kind === 'obstacle' &&
          (structure.towerArchetype !== null || structure.upgradeLevel !== 1))
      ) {
        throw new Error('Defense blueprint contains an invalid structure.');
      }
      ids.add(structure.id);
      return { ...structure };
    });

    return new DefenseBlueprint(structures);
  }

  public get snapshot(): DefenseBlueprintSnapshot {
    return {
      structures: this.snapshots.map((structure) => ({ ...structure })),
    };
  }

  public restoreStructures(): readonly DefenseStructure[] {
    return this.snapshots.map(
      (snapshot) =>
        new DefenseStructure(
          snapshot.id,
          snapshot.kind,
          new GridPosition(snapshot.column, snapshot.row),
          snapshot.maxHealth,
          snapshot.towerArchetype,
          snapshot.upgradeLevel,
        ),
    );
  }
}
