import { describe, expect, it } from 'vitest';
import { GridMap } from '../grid/GridMap';
import { GridPosition } from '../grid/GridPosition';
import { BreadthFirstPathfinder } from '../pathfinding/BreadthFirstPathfinder';
import { DefenseStructure } from '../structures/DefenseStructure';
import { Battlefield } from './Battlefield';

function createNarrowBattlefield(): Battlefield {
  return new Battlefield(
    new GridMap(
      5,
      3,
      [new GridPosition(0, 1)],
      new GridPosition(4, 1),
    ),
    new BreadthFirstPathfinder(),
  );
}

function obstacle(id: string, column: number, row: number): DefenseStructure {
  return new DefenseStructure(
    id,
    'obstacle',
    new GridPosition(column, row),
    100,
  );
}

describe('Battlefield', () => {
  it('rejects placement on entry and core cells', () => {
    const battlefield = createNarrowBattlefield();

    expect(battlefield.place(obstacle('entry', 0, 1))).toEqual({
      success: false,
      reason: 'reserved-cell',
    });
    expect(battlefield.place(obstacle('core', 4, 1))).toEqual({
      success: false,
      reason: 'reserved-cell',
    });
  });

  it('rejects the final placement that would block every path', () => {
    const battlefield = createNarrowBattlefield();
    battlefield.place(obstacle('top', 2, 0));
    battlefield.place(obstacle('middle', 2, 1));

    const result = battlefield.place(obstacle('bottom', 2, 2));

    expect(result).toEqual({ success: false, reason: 'path-blocked' });
    expect(battlefield.structures).toHaveLength(2);
  });

  it('restores the original position after an invalid move', () => {
    const battlefield = createNarrowBattlefield();
    battlefield.place(obstacle('top', 2, 0));
    battlefield.place(obstacle('middle', 2, 1));
    battlefield.place(obstacle('movable', 1, 0));

    const result = battlefield.move('movable', new GridPosition(2, 2));

    expect(result).toEqual({ success: false, reason: 'path-blocked' });
    expect(battlefield.findStructureAt(new GridPosition(1, 0))?.id).toBe(
      'movable',
    );
  });

  it('reopens a cell when a structure is destroyed', () => {
    const battlefield = createNarrowBattlefield();
    battlefield.place(obstacle('target', 2, 1));

    battlefield.destroy('target');

    expect(battlefield.findStructureAt(new GridPosition(2, 1))).toBeNull();
    expect(battlefield.pathsFromEveryEntry()[0]).not.toHaveLength(0);
  });

  it('restores a saved design with full structure health', () => {
    const battlefield = createNarrowBattlefield();
    const structure = obstacle('saved', 2, 1);
    battlefield.place(structure);
    const blueprint = battlefield.captureBlueprint();
    structure.takeDamage(75);
    battlefield.move('saved', new GridPosition(1, 0));

    battlefield.restoreBlueprint(blueprint);

    const restored = battlefield.findStructureAt(new GridPosition(2, 1));
    expect(restored?.health).toBe(100);
    expect(restored?.id).toBe('saved');
  });
});
