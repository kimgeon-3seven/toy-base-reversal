import { describe, expect, it } from 'vitest';
import { GridPosition } from '../../domain/grid/GridPosition';
import { DefenseStructure } from '../../domain/structures/DefenseStructure';
import { ObstacleVisualPolicy } from './ObstacleVisualPolicy';

function obstacle(id: string, column: number, row: number): DefenseStructure {
  return new DefenseStructure(
    id,
    'obstacle',
    new GridPosition(column, row),
    100,
    null,
  );
}

describe('ObstacleVisualPolicy', () => {
  const policy = new ObstacleVisualPolicy();

  it('aligns connected barricades along their strongest axis', () => {
    const center = obstacle('center', 5, 5);
    expect(policy.resolve(center, [center, obstacle('right', 6, 5)]).rotationDegrees).toBe(0);
    expect(policy.resolve(center, [center, obstacle('down', 5, 6)]).rotationDegrees).toBe(90);
  });

  it('exposes readable visual damage states', () => {
    const wall = obstacle('wall', 5, 5);
    expect(policy.resolve(wall, [wall]).damageState).toBe('intact');
    wall.takeDamage(50);
    expect(policy.resolve(wall, [wall]).damageState).toBe('damaged');
    wall.takeDamage(30);
    expect(policy.resolve(wall, [wall]).damageState).toBe('critical');
  });
});
