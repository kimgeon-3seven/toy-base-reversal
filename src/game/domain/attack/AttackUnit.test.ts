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

  it('finishes an active grid step without needing a new pathfinding target', () => {
    const unit = new AttackUnit('unit', 'tank', new GridPosition(0, 0), {
      maxHealth: 100,
      movementSpeed: 1,
      attackDamage: 10,
      attackRange: 1,
      attackIntervalMs: 1_000,
    });

    unit.advanceToward(new GridPosition(1, 0), 400);
    expect(unit.renderColumn).toBeCloseTo(0.4);

    expect(unit.continueActiveMovement(600)).toBe(true);
    expect(unit.position).toEqual(new GridPosition(1, 0));
    expect(unit.renderColumn).toBe(1);
    expect(unit.isMoving).toBe(false);
    expect(unit.continueActiveMovement(100)).toBe(false);
  });
});
