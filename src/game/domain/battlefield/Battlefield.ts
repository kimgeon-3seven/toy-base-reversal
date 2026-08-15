import type { GridMap } from '../grid/GridMap';
import type { GridPosition } from '../grid/GridPosition';
import type { Pathfinder } from '../pathfinding/Pathfinder';
import { DefenseBlueprint } from './DefenseBlueprint';
import type { BattlefieldResult } from './BattlefieldResult';
import type { DefenseStructure } from '../structures/DefenseStructure';

export class Battlefield {
  private readonly structuresById = new Map<string, DefenseStructure>();

  public constructor(
    public readonly map: GridMap,
    private readonly pathfinder: Pathfinder,
  ) {}

  public get structures(): readonly DefenseStructure[] {
    return [...this.structuresById.values()];
  }

  public place(structure: DefenseStructure): BattlefieldResult {
    const positionFailure = this.validateTargetPosition(structure.position);
    if (positionFailure !== null) {
      return { success: false, reason: positionFailure };
    }

    this.structuresById.set(structure.id, structure);
    if (!this.allEntryPointsHavePaths()) {
      this.structuresById.delete(structure.id);
      return { success: false, reason: 'path-blocked' };
    }

    return { success: true, structure };
  }

  public move(structureId: string, target: GridPosition): BattlefieldResult {
    const structure = this.structuresById.get(structureId);
    if (structure === undefined) {
      return { success: false, reason: 'structure-not-found' };
    }

    const originalPosition = structure.position;
    this.structuresById.delete(structureId);
    const positionFailure = this.validateTargetPosition(target);
    this.structuresById.set(structureId, structure);

    if (positionFailure !== null) {
      return { success: false, reason: positionFailure };
    }

    structure.moveTo(target);
    if (!this.allEntryPointsHavePaths()) {
      structure.moveTo(originalPosition);
      return { success: false, reason: 'path-blocked' };
    }

    return { success: true, structure };
  }

  public sell(structureId: string): BattlefieldResult {
    const structure = this.structuresById.get(structureId);
    if (structure === undefined) {
      return { success: false, reason: 'structure-not-found' };
    }

    this.structuresById.delete(structureId);
    return { success: true, structure };
  }

  public destroy(structureId: string): BattlefieldResult {
    return this.sell(structureId);
  }

  public findStructureAt(position: GridPosition): DefenseStructure | null {
    return (
      this.structures.find((structure) => structure.position.equals(position)) ??
      null
    );
  }

  public pathsFromEveryEntry(): readonly (readonly GridPosition[])[] {
    const blockedKeys = this.blockedPositionKeys();
    return this.map.entryPoints.map(
      (entryPoint) =>
        this.pathfinder.findPath(this.map, entryPoint, blockedKeys) ?? [],
    );
  }

  public findPathFrom(position: GridPosition): readonly GridPosition[] | null {
    return this.pathfinder.findPath(
      this.map,
      position,
      this.blockedPositionKeys(),
    );
  }

  public walkableNeighborsOf(position: GridPosition): readonly GridPosition[] {
    return this.map
      .neighborsOf(position)
      .filter((neighbor) => this.findStructureAt(neighbor) === null);
  }

  public captureBlueprint(): DefenseBlueprint {
    return DefenseBlueprint.capture(this.structures);
  }

  public restoreBlueprint(blueprint: DefenseBlueprint): void {
    this.structuresById.clear();
    for (const structure of blueprint.restoreStructures()) {
      this.structuresById.set(structure.id, structure);
    }

    if (!this.allEntryPointsHavePaths()) {
      this.structuresById.clear();
      throw new Error('Cannot restore an invalid defense blueprint.');
    }
  }

  private validateTargetPosition(
    position: GridPosition,
  ): 'outside-map' | 'reserved-cell' | 'occupied-cell' | null {
    if (!this.map.contains(position)) {
      return 'outside-map';
    }

    if (this.map.isReserved(position)) {
      return 'reserved-cell';
    }

    if (this.findStructureAt(position) !== null) {
      return 'occupied-cell';
    }

    return null;
  }

  private allEntryPointsHavePaths(): boolean {
    const blockedKeys = this.blockedPositionKeys();
    return this.map.entryPoints.every(
      (entryPoint) =>
        this.pathfinder.findPath(this.map, entryPoint, blockedKeys) !== null,
    );
  }

  private blockedPositionKeys(): ReadonlySet<string> {
    return new Set(
      this.structures.map((structure) => structure.position.key),
    );
  }
}
