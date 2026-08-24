import { describe, expect, it } from 'vitest';
import { GridPosition } from '../grid/GridPosition';
import { DefenseEnemy } from './DefenseEnemy';

describe('DefenseEnemy movement presentation state', () => {
  it('reports domain movement until movement is cancelled', () => {
    const enemy = new DefenseEnemy('enemy', new GridPosition(0, 0), {
      cost: 4,
      maxHealth: 100,
      movementSpeed: 1,
      attackDamage: 10,
      attackIntervalMs: 1_000,
      attackRange: 1,
      archetype: 'tank',
    });

    expect(enemy.isMoving).toBe(false);
    enemy.advanceToward(new GridPosition(1, 0), 100);
    expect(enemy.isMoving).toBe(true);
    enemy.cancelMovement();
    expect(enemy.isMoving).toBe(false);
  });
});
