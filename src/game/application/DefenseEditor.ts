import type { Battlefield } from '../domain/battlefield/Battlefield';
import type { BattlefieldResult } from '../domain/battlefield/BattlefieldResult';
import type { DefenseBlueprint } from '../domain/battlefield/DefenseBlueprint';
import type { GridPosition } from '../domain/grid/GridPosition';
import {
  DefenseStructure,
  type StructureKind,
} from '../domain/structures/DefenseStructure';

const STRUCTURE_HEALTH: Readonly<Record<StructureKind, number>> = {
  tower: 100,
  obstacle: 180,
};

export class DefenseEditor {
  private nextStructureSequence = 1;
  private savedBlueprint: DefenseBlueprint | null = null;

  public constructor(public readonly battlefield: Battlefield) {}

  public place(kind: StructureKind, position: GridPosition): BattlefieldResult {
    const structure = new DefenseStructure(
      `structure-${this.nextStructureSequence}`,
      kind,
      position,
      STRUCTURE_HEALTH[kind],
    );

    const result = this.battlefield.place(structure);
    if (result.success) {
      this.nextStructureSequence += 1;
    }

    return result;
  }

  public move(structureId: string, position: GridPosition): BattlefieldResult {
    return this.battlefield.move(structureId, position);
  }

  public sell(structureId: string): BattlefieldResult {
    return this.battlefield.sell(structureId);
  }

  public destroy(structureId: string): BattlefieldResult {
    return this.battlefield.destroy(structureId);
  }

  public saveBlueprint(): void {
    this.savedBlueprint = this.battlefield.captureBlueprint();
  }

  public restoreBlueprint(): boolean {
    if (this.savedBlueprint === null) {
      return false;
    }

    this.battlefield.restoreBlueprint(this.savedBlueprint);
    return true;
  }
}
