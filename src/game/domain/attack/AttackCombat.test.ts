import { describe, expect, it } from 'vitest';
import { Battlefield } from '../battlefield/Battlefield';
import { GridMap } from '../grid/GridMap';
import { GridPosition } from '../grid/GridPosition';
import { BreadthFirstPathfinder } from '../pathfinding/BreadthFirstPathfinder';
import { DefenseStructure } from '../structures/DefenseStructure';
import {
  AttackCombat,
  type AttackCombatConfig,
} from './AttackCombat';
import { SquadPlan } from './SquadPlan';

const config: AttackCombatConfig = {
  coreMaxHealth: 60,
  timeLimitMs: 10_000,
  unitStats: {
    tank: {
      maxHealth: 100,
      movementSpeed: 2,
      attackDamage: 30,
      attackRange: 1.1,
      attackIntervalMs: 100,
    },
    ranger: {
      maxHealth: 50,
      movementSpeed: 2,
      attackDamage: 10,
      attackRange: 3,
      attackIntervalMs: 100,
    },
  },
  tower: {
    rangeInCells: 3,
    damage: 50,
    attackIntervalMs: 100,
  },
  commander: {
    maxHealth: 100,
    attackDamage: 2,
    attackRange: 1,
    attackIntervalMs: 1_000,
  },
  rallyDurationMs: 500,
  rallyCooldownMs: 2_000,
  disruptDurationMs: 1_000,
  disruptCooldownMs: 2_000,
  disruptRange: 4,
};

function battlefield(): Battlefield {
  return new Battlefield(
    new GridMap(
      4,
      3,
      [new GridPosition(0, 1)],
      new GridPosition(3, 1),
    ),
    new BreadthFirstPathfinder(),
  );
}

describe('AttackCombat', () => {
  it('wins when automatic units destroy the core', () => {
    const field = battlefield();
    const plan = new SquadPlan(10, 2, 1);
    plan.addUnit(0, 'tank');
    const combat = new AttackCombat(field, plan, config);

    combat.update(3_000);

    expect(combat.coreHealth).toBe(0);
    expect(combat.state).toBe('won');
  });

  it('loses immediately when the commander is defeated', () => {
    const field = battlefield();
    field.place(
      new DefenseStructure('tower', 'tower', new GridPosition(1, 0), 500),
    );
    const combat = new AttackCombat(field, new SquadPlan(10, 2, 1), config);

    combat.update(300);

    expect(combat.commander.health).toBe(0);
    expect(combat.state).toBe('lost');
    expect(combat.failureReason).toBe('commander-defeated');
  });

  it('temporarily disables the nearest tower with disrupt', () => {
    const field = battlefield();
    field.place(
      new DefenseStructure('tower', 'tower', new GridPosition(1, 0), 500),
    );
    const combat = new AttackCombat(field, new SquadPlan(10, 2, 1), config);

    expect(combat.activateDisrupt()).toBe('tower');
    combat.update(500);

    expect(combat.commander.health).toBe(100);
    expect(combat.isTowerDisabled('tower')).toBe(true);
  });

  it('activates rally with a cooldown', () => {
    const combat = new AttackCombat(
      battlefield(),
      new SquadPlan(10, 2, 1),
      config,
    );

    expect(combat.activateRally()).toBe(true);
    expect(combat.activateRally()).toBe(false);
    expect(combat.isRallyActive).toBe(true);
    combat.update(600);
    expect(combat.isRallyActive).toBe(false);
  });
});
