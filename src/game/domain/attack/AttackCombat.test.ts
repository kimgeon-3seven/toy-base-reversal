import { describe, expect, it } from 'vitest';
import { Battlefield } from '../battlefield/Battlefield';
import { GridMap } from '../grid/GridMap';
import { GridPosition } from '../grid/GridPosition';
import { BreadthFirstPathfinder } from '../pathfinding/BreadthFirstPathfinder';
import { DefenseStructure } from '../structures/DefenseStructure';
import { FixedTowerUpgradePolicy } from '../structures/TowerUpgradePolicy';
import {
  AttackCombat,
  type AttackCombatConfig,
} from './AttackCombat';
import { SquadPlan } from './SquadPlan';

const config: AttackCombatConfig = {
  coreMaxHealth: 60,
  timeLimitMs: 10_000,
  towerUpgradePolicy: new FixedTowerUpgradePolicy({
    maxLevel: 2,
    costs: { popgun: 2, mortar: 3, piercer: 4 },
    damageMultiplierPerLevel: 1.3,
    maxHealthMultiplierPerLevel: 1.2,
  }),
  unitStats: {
    tank: {
      maxHealth: 100,
      movementSpeed: 2,
      attackDamage: 30,
      attackRange: 1.1,
      attackIntervalMs: 100,
    },
    swarm: {
      maxHealth: 30,
      movementSpeed: 2,
      attackDamage: 8,
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
  towers: {
    popgun: {
      rangeInCells: 3,
      damage: 50,
      attackIntervalMs: 100,
      splashRadiusInCells: 0,
    },
    mortar: {
      rangeInCells: 3,
      damage: 50,
      attackIntervalMs: 100,
      splashRadiusInCells: 1,
    },
    piercer: {
      rangeInCells: 3,
      damage: 50,
      attackIntervalMs: 100,
      splashRadiusInCells: 0,
    },
  },
  commander: {
    maxHealth: 100,
    attackDamage: 2,
    attackRange: 1,
    attackIntervalMs: 1_000,
  },
  focusFireCommandRadius: 3,
  focusFireCooldownMs: 2_000,
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
    const combat = new AttackCombat(field, new SquadPlan(10, 2, 1), {
      ...config,
      towers: {
        ...config.towers,
        popgun: { ...config.towers.popgun, damage: 100 },
      },
    });

    combat.update(300);

    expect(combat.commander.health).toBe(0);
    expect(combat.state).toBe('lost');
    expect(combat.failureReason).toBe('commander-defeated');
  });

  it('loses immediately when every ordinary unit and queued reinforcement is gone', () => {
    const field = battlefield();
    field.place(
      new DefenseStructure('tower', 'tower', new GridPosition(1, 0), 500),
    );
    const plan = new SquadPlan(4, 2, 1);
    plan.addUnit(0, 'tank');
    const combat = new AttackCombat(field, plan, {
      ...config,
      towers: {
        ...config.towers,
        popgun: { ...config.towers.popgun, damage: 200 },
      },
    });

    combat.update(50);

    expect(combat.commander.isAlive).toBe(true);
    expect(combat.units).toHaveLength(0);
    expect(combat.state).toBe('lost');
    expect(combat.failureReason).toBe('squad-defeated');
  });

  it('applies the same tower upgrade damage multiplier during the counterattack', () => {
    const field = battlefield();
    const tower = new DefenseStructure(
      'tower',
      'tower',
      new GridPosition(1, 0),
      500,
    );
    tower.upgradeToNextLevel(1.2);
    field.place(tower);
    const plan = new SquadPlan(4, 2, 1);
    plan.addUnit(0, 'tank');
    const combat = new AttackCombat(field, plan, config);

    combat.update(50);

    expect(combat.units[0]?.health).toBe(35);
  });

  it('disrupts the player-selected tower instead of the nearest tower', () => {
    const field = battlefield();
    field.place(
      new DefenseStructure('nearest', 'tower', new GridPosition(1, 0), 500),
    );
    field.place(
      new DefenseStructure('selected', 'tower', new GridPosition(2, 2), 500),
    );
    const combat = new AttackCombat(field, new SquadPlan(10, 2, 1), config);

    expect(combat.issueDisrupt('selected')).toEqual({
      success: true,
      targetTowerId: 'selected',
    });

    expect(combat.isTowerDisabled('nearest')).toBe(false);
    expect(combat.isTowerDisabled('selected')).toBe(true);
    expect(combat.disruptRemainingMs('selected')).toBe(1_000);
  });

  it('rejects an out-of-range disrupt target without consuming cooldown', () => {
    const field = new Battlefield(
      new GridMap(
        8,
        3,
        [new GridPosition(0, 1)],
        new GridPosition(7, 1),
      ),
      new BreadthFirstPathfinder(),
    );
    field.place(
      new DefenseStructure('distant', 'tower', new GridPosition(6, 0), 500),
    );
    const combat = new AttackCombat(field, new SquadPlan(10, 2, 1), config);

    expect(combat.issueDisrupt('distant')).toEqual({
      success: false,
      reason: 'out-of-range',
    });
    expect(combat.canIssueDisrupt).toBe(true);
    expect(combat.disruptCooldownRemainingMs).toBe(0);
  });

  it('freezes a disrupted tower attack cooldown until the effect ends', () => {
    const field = battlefield();
    field.place(
      new DefenseStructure('tower', 'tower', new GridPosition(1, 0), 500),
    );
    const plan = new SquadPlan(10, 2, 1);
    plan.addUnit(0, 'tank');
    const combat = new AttackCombat(field, plan, {
      ...config,
      towers: {
        ...config.towers,
        popgun: {
          ...config.towers.popgun,
          damage: 10,
          attackIntervalMs: 1_000,
        },
      },
    });
    combat.update(1);
    const targetUnit = combat.units[0];
    expect(targetUnit?.health).toBe(90);

    expect(combat.issueDisrupt('tower').success).toBe(true);
    combat.update(1_000);
    expect(targetUnit?.health).toBe(90);
    expect(combat.isTowerDisabled('tower')).toBe(false);

    combat.update(900);
    expect(targetUnit?.health).toBe(90);
    combat.update(50);
    expect(targetUnit?.health).toBe(80);
  });

  it('snapshots only currently spawned nearby units for focus fire', () => {
    const field = battlefield();
    field.place(
      new DefenseStructure('target', 'tower', new GridPosition(2, 0), 500),
    );
    const plan = new SquadPlan(12, 1, 1);
    plan.addUnit(0, 'tank');
    plan.addUnit(0, 'tank');
    const combat = new AttackCombat(field, plan, {
      ...config,
      towers: {
        ...config.towers,
        popgun: { ...config.towers.popgun, damage: 1 },
      },
    });
    combat.update(1);

    const result = combat.issueFocusFire('target');

    expect(result).toEqual({
      success: true,
      targetTowerId: 'target',
      unitCount: 1,
    });
    expect(combat.focusedUnitCount).toBe(1);
    expect(combat.issueFocusFire('target')).toEqual({
      success: false,
      reason: 'cooldown',
    });

    combat.update(1_000);
    expect(combat.units).toHaveLength(2);
    expect(combat.focusedUnitCount).toBeLessThanOrEqual(1);
  });

  it('rejects focus fire without nearby units and does not consume cooldown', () => {
    const field = battlefield();
    field.place(
      new DefenseStructure('target', 'tower', new GridPosition(2, 0), 500),
    );
    const combat = new AttackCombat(field, new SquadPlan(10, 2, 1), config);

    expect(combat.issueFocusFire('target')).toEqual({
      success: false,
      reason: 'no-nearby-units',
    });
    expect(combat.canIssueFocusFire).toBe(true);
  });

  it('keeps selected units locked on the chosen tower until it is destroyed', () => {
    const field = new Battlefield(
      new GridMap(
        6,
        3,
        [new GridPosition(0, 1)],
        new GridPosition(5, 1),
      ),
      new BreadthFirstPathfinder(),
    );
    const closerTower = new DefenseStructure(
      'closer',
      'tower',
      new GridPosition(1, 0),
      500,
    );
    const chosenTower = new DefenseStructure(
      'chosen',
      'tower',
      new GridPosition(3, 2),
      60,
    );
    field.place(closerTower);
    field.place(chosenTower);
    const plan = new SquadPlan(10, 2, 1);
    plan.addUnit(0, 'tank');
    const combat = new AttackCombat(field, plan, {
      ...config,
      towers: {
        ...config.towers,
        popgun: { ...config.towers.popgun, damage: 1 },
      },
    });
    combat.update(1);

    expect(combat.issueFocusFire('chosen').success).toBe(true);
    combat.update(2_500);

    expect(closerTower.health).toBe(500);
    expect(field.structures.some((structure) => structure.id === 'chosen')).toBe(
      false,
    );
    expect(combat.focusTargetId).toBeNull();
    expect(combat.focusedUnitCount).toBe(0);
  });

  it('publishes projectile and core-hit events once for presentation feedback', () => {
    const field = battlefield();
    const plan = new SquadPlan(10, 2, 1);
    plan.addUnit(0, 'tank');
    const combat = new AttackCombat(field, plan, config);

    combat.update(3_000);

    expect(combat.drainEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'attack', style: 'unit' }),
        expect.objectContaining({ type: 'core-hit' }),
      ]),
    );
    expect(combat.drainEvents()).toEqual([]);
  });
});
