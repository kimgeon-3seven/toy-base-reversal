import { describe, expect, it } from 'vitest';
import { GridMap } from '../grid/GridMap';
import { GridPosition } from '../grid/GridPosition';
import { BreadthFirstPathfinder } from './BreadthFirstPathfinder';

describe('BreadthFirstPathfinder', () => {
  it('finds a four-directional route around blocked cells', () => {
    const entry = new GridPosition(0, 1);
    const core = new GridPosition(4, 1);
    const map = new GridMap(5, 3, [entry], core);
    const blocked = new Set(['2,0', '2,1']);

    const path = new BreadthFirstPathfinder().findPath(map, entry, blocked);

    expect(path).not.toBeNull();
    expect(path?.at(0)?.equals(entry)).toBe(true);
    expect(path?.at(-1)?.equals(core)).toBe(true);
    expect(path?.some((position) => position.key === '2,2')).toBe(true);
  });

  it('returns null when every route is blocked', () => {
    const entry = new GridPosition(0, 1);
    const core = new GridPosition(4, 1);
    const map = new GridMap(5, 3, [entry], core);
    const blocked = new Set(['2,0', '2,1', '2,2']);

    const path = new BreadthFirstPathfinder().findPath(map, entry, blocked);

    expect(path).toBeNull();
  });
});
