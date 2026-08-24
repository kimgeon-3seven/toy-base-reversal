import { describe, expect, it } from 'vitest';
import { GridPosition } from '../../domain/grid/GridPosition';
import { AttackEntryPointResolver } from './AttackEntryPointResolver';

describe('AttackEntryPointResolver', () => {
  const resolver = new AttackEntryPointResolver([
    new GridPosition(0, 2),
    new GridPosition(0, 6),
    new GridPosition(0, 9),
  ]);

  it('maps every battlefield entry point to its lane', () => {
    expect(resolver.laneIndexAt(new GridPosition(0, 2))).toBe(0);
    expect(resolver.laneIndexAt(new GridPosition(0, 6))).toBe(1);
    expect(resolver.laneIndexAt(new GridPosition(0, 9))).toBe(2);
  });

  it('rejects non-entry cells and an absent pointer position', () => {
    expect(resolver.laneIndexAt(new GridPosition(1, 2))).toBeNull();
    expect(resolver.laneIndexAt(null)).toBeNull();
  });
});
