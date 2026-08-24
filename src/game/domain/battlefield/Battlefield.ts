import type { GridMap } from '../grid/GridMap';
import type { GridPosition } from '../grid/GridPosition';
import type { Pathfinder } from '../pathfinding/Pathfinder';
import { DefenseBlueprint } from './DefenseBlueprint';
import type { BattlefieldResult } from './BattlefieldResult';
import type { BattlefieldFailureReason } from './BattlefieldResult';
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
    const positionFailure = this.previewPlacement(structure.position);
    if (positionFailure !== null) {
      return { success: false, reason: positionFailure };
    }

    this.structuresById.set(structure.id, structure);
    return { success: true, structure };
  }

  public move(structureId: string, target: GridPosition): BattlefieldResult {
    const structure = this.structuresById.get(structureId);
    if (structure === undefined) {
      return { success: false, reason: 'structure-not-found' };
    }

    const positionFailure = this.previewPlacement(target, structureId);
    if (positionFailure !== null) {
      return { success: false, reason: positionFailure };
    }

    structure.moveTo(target);
    return { success: true, structure };
  }

  public previewPlacement(
    position: GridPosition,
    movingStructureId: string | null = null,
  ): Exclude<BattlefieldFailureReason, 'structure-not-found'> | null {
    const positionFailure = this.validateTargetPosition(
      position,
      movingStructureId,
    );
    if (positionFailure !== null) return positionFailure;

    const blockedKeys = this.blockedPositionKeys(movingStructureId);
    blockedKeys.add(position.key);
    const hasEveryPath = this.map.entryPoints.every(
      (entryPoint) =>
        this.pathfinder.findPath(this.map, entryPoint, blockedKeys) !== null,
    );
    return hasEveryPath ? null : 'path-blocked';
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

  public findPathToAdjacent(
    position: GridPosition,
    target: GridPosition,
  ): readonly GridPosition[] | null {
    const blockedKeys = this.blockedPositionKeys();
    const candidatePaths = this.map
      .neighborsOf(target)
      .filter((neighbor) => !blockedKeys.has(neighbor.key))
      .map((destination) =>
        this.pathfinder.findPath(
          this.map,
          position,
          blockedKeys,
          destination,
        ),
      )
      .filter((path): path is readonly GridPosition[] => path !== null)
      .sort((left, right) => left.length - right.length);

    return candidatePaths[0] ?? null;
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
    movingStructureId: string | null = null,
  ): 'outside-map' | 'reserved-cell' | 'occupied-cell' | null {
    if (!this.map.contains(position)) {
      return 'outside-map';
    }

    if (this.map.isReserved(position)) {
      return 'reserved-cell';
    }

    const occupant = this.findStructureAt(position);
    if (occupant !== null && occupant.id !== movingStructureId) {
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

  private blockedPositionKeys(
    ignoredStructureId: string | null = null,
  ): Set<string> {
    return new Set(
      this.structures
        .filter((structure) => structure.id !== ignoredStructureId)
        .map((structure) => structure.position.key),
    );
  }
}
