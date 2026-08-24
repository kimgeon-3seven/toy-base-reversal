import { describe, expect, it } from 'vitest';
import { GridPosition } from '../grid/GridPosition';
import { AttackUnit } from './AttackUnit';

describe('AttackUnit movement presentation state', () => {
  it('reports domain movement until movement is cancelled', () => {
    const unit = new AttackUnit('unit', 'tank', new GridPosition(0, 0), {
      maxHealth: 100,
      movementSpeed: 1,
      attackDamage: 10,
      attackRange: 1,
      attackIntervalMs: 1_000,
    });

    expect(unit.isMoving).toBe(false);
    unit.advanceToward(new GridPosition(1, 0), 100);
    expect(unit.isMoving).toBe(true);
    unit.cancelMovement();
    expect(unit.isMoving).toBe(false);
  });
});
