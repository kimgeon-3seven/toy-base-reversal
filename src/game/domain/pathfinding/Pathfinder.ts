import type { GridMap } from '../grid/GridMap';
import type { GridPosition } from '../grid/GridPosition';

export interface Pathfinder {
  findPath(
    map: GridMap,
    start: GridPosition,
    blockedPositionKeys: ReadonlySet<string>,
    destination?: GridPosition,
  ): readonly GridPosition[] | null;
}
