import type { GridMap } from '../grid/GridMap';
import type { GridPosition } from '../grid/GridPosition';
import type { Pathfinder } from './Pathfinder';

export class BreadthFirstPathfinder implements Pathfinder {
  public findPath(
    map: GridMap,
    start: GridPosition,
    blockedPositionKeys: ReadonlySet<string>,
  ): readonly GridPosition[] | null {
    if (!map.contains(start) || blockedPositionKeys.has(start.key)) {
      return null;
    }

    const frontier: GridPosition[] = [start];
    const visited = new Set<string>([start.key]);
    const cameFrom = new Map<string, GridPosition>();
    let frontierIndex = 0;

    while (frontierIndex < frontier.length) {
      const current = frontier[frontierIndex];
      frontierIndex += 1;

      if (current === undefined) {
        break;
      }

      if (current.equals(map.corePosition)) {
        return this.reconstructPath(current, cameFrom);
      }

      for (const neighbor of map.neighborsOf(current)) {
        if (
          visited.has(neighbor.key) ||
          blockedPositionKeys.has(neighbor.key)
        ) {
          continue;
        }

        visited.add(neighbor.key);
        cameFrom.set(neighbor.key, current);
        frontier.push(neighbor);
      }
    }

    return null;
  }

  private reconstructPath(
    destination: GridPosition,
    cameFrom: ReadonlyMap<string, GridPosition>,
  ): readonly GridPosition[] {
    const reversedPath: GridPosition[] = [destination];
    let current = destination;

    while (cameFrom.has(current.key)) {
      const previous = cameFrom.get(current.key);
      if (previous === undefined) {
        break;
      }

      reversedPath.push(previous);
      current = previous;
    }

    return reversedPath.reverse();
  }
}
