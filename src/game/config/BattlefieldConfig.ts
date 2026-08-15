import { GridMap } from '../domain/grid/GridMap';
import { GridPosition } from '../domain/grid/GridPosition';

export const GRID_COLUMNS = 20;
export const GRID_ROWS = 12;
export const GRID_CELL_SIZE = 48;
export const GRID_OFFSET_X = 32;
export const GRID_OFFSET_Y = 126;

export const ENTRY_POINTS = [
  new GridPosition(0, 2),
  new GridPosition(0, 6),
  new GridPosition(0, 9),
] as const;

export const CORE_POSITION = new GridPosition(18, 6);

const CORE_BUILD_EXCLUSION = [
  CORE_POSITION,
  new GridPosition(17, 6),
  new GridPosition(18, 5),
  new GridPosition(18, 7),
  new GridPosition(19, 6),
] as const;

export function createBattlefieldMap(): GridMap {
  return new GridMap(
    GRID_COLUMNS,
    GRID_ROWS,
    ENTRY_POINTS,
    CORE_POSITION,
    CORE_BUILD_EXCLUSION,
  );
}
