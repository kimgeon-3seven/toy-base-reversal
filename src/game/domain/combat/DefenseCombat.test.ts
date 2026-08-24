import { describe, expect, it } from 'vitest';
import { Battlefield } from '../battlefield/Battlefield';
import { GridMap } from '../grid/GridMap';
import { GridPosition } from '../grid/GridPosition';
import { BreadthFirstPathfinder } from '../pathfinding/BreadthFirstPathfinder';
import { DefenseStructure } from '../structures/DefenseStructure';
import { FixedTowerUpgradePolicy } from '../structures/TowerUpgradePolicy';
import {
  DefenseCombat,
  type DefenseCombatConfig,
} from './DefenseCombat';
import type { DefenseEnemyStats } from './DefenseEnemy';
import { TieredCoreLeakDamagePolicy } from './CoreLeakDamagePolicy';
import { DefenseWave } from './DefenseWave';

const defaultConfig: DefenseCombatConfig = {
  coreMaxHealth: 100,
  coreLeakDamagePolicy: new TieredCoreLeakDamagePolicy({
    2: 6,
    3: 12,
    4: 24,
  }),
  towerUpgradePolicy: new FixedTowerUpgradePolicy({
    maxLevel: 2,
    costs: { popgun: 2, mortar: 3, piercer: 4 },
    damageMultiplierPerLevel: 1.3,
    maxHealthMultiplierPerLevel: 1.2,
  }),
  towers: {
    popgun: {
      rangeInCells: 2.5,
      damage: 10,
      attackIntervalMs: 100,
      splashRadiusInCells: 0,
    },
    mortar: {
      rangeInCells: 2.5,
      damage: 10,
      attackIntervalMs: 100,
      splashRadiusInCells: 1,
    },
    piercer: {
      rangeInCells: 2.5,
      damage: 10,
      attackIntervalMs: 100,
      splashRadiusInCells: 0,
    },
  },
};

const durableEnemy: DefenseEnemyStats = {
  archetype: 'tank',
  cost: 4,
  maxHealth: 100,
  movementSpeed: 2,
  attackDamage: 20,
  attackIntervalMs: 100,
  attackRange: 1.1,
};

function createBattlefield(columns = 5, rows = 3): Battlefield {
  return new Battlefield(
    new GridMap(
      columns,
      rows,
      [new GridPosition(0, 1)],
      new GridPosition(columns - 1, 1),
    ),
    new BreadthFirstPathfinder(),
  );
}

describe('DefenseCombat', () => {
  it('lets a tower automatically defeat an enemy in range', () => {
    const battlefield = createBattlefield();
    battlefield.place(
      new DefenseStructure('tower', 'tower', new GridPosition(1, 0), 100),
    );
    const weakEnemy: DefenseEnemyStats = {
      ...durableEnemy,
      maxHealth: 20,
      attackDamage: 1,
      attackIntervalMs: 1_000,
    };
    const combat = new DefenseCombat(
      battlefield,
      new DefenseWave([{ delayMs: 0, entryIndex: 0, stats: weakEnemy }]),
      defaultConfig,
    );

    combat.update(300);

    expect(combat.killCount).toBe(1);
    expect(combat.state).toBe('won');
    expect(combat.coreHealth).toBe(100);
  });

  it('applies the tower upgrade damage multiplier during defense', () => {
    const battlefield = createBattlefield();
    const tower = new DefenseStructure(
      'tower',
      'tower',
      new GridPosition(1, 0),
      100,
    );
    tower.upgradeToNextLevel(1.2);
    battlefield.place(tower);
    const enemy: DefenseEnemyStats = {
      ...durableEnemy,
      maxHealth: 12,
      attackDamage: 1,
    };
    const combat = new DefenseCombat(
      battlefield,
      new DefenseWave([{ delayMs: 0, entryIndex: 0, stats: enemy }]),
      defaultConfig,
    );

    combat.update(50);

    expect(combat.killCount).toBe(1);
    expect(combat.state).toBe('won');
  });

  it('lets an adjacent enemy destroy a structure and reopen its cell', () => {
    const battlefield = createBattlefield();
    battlefield.place(
      new DefenseStructure(
        'wall',
        'obstacle',
        new GridPosition(2, 1),
        40,
      ),
    );
    const combat = new DefenseCombat(
      battlefield,
      new DefenseWave([{ delayMs: 0, entryIndex: 0, stats: durableEnemy }]),
      defaultConfig,
    );

    combat.update(1_200);

    expect(battlefield.findStructureAt(new GridPosition(2, 1))).toBeNull();
    expect(battlefield.findPathFrom(new GridPosition(1, 1))).not.toBeNull();
  });

  it('applies one cost-based leak hit and removes an enemy that reaches the core', () => {
    const battlefield = createBattlefield(3, 3);
    const combat = new DefenseCombat(
      battlefield,
      new DefenseWave([{ delayMs: 0, entryIndex: 0, stats: durableEnemy }]),
      defaultConfig,
    );

    combat.update(2_000);

    expect(combat.coreHealth).toBe(76);
    expect(combat.leakCount).toBe(1);
    expect(combat.leakDamage).toBe(24);
    expect(combat.killCount).toBe(0);
    expect(combat.enemies).toHaveLength(0);
    expect(combat.state).toBe('won');
  });

  it('loses the defense when cost-based leak damage reduces core health to zero', () => {
    const battlefield = createBattlefield(3, 3);
    const combat = new DefenseCombat(
      battlefield,
      new DefenseWave([
        { delayMs: 0, entryIndex: 0, stats: durableEnemy },
      ]),
      { ...defaultConfig, coreMaxHealth: 20 },
    );

    combat.update(2_000);

    expect(combat.coreHealth).toBe(0);
    expect(combat.leakCount).toBe(1);
    expect(combat.leakDamage).toBe(20);
    expect(combat.state).toBe('lost');
  });

  it('spawns enemies according to their configured delays', () => {
    const battlefield = createBattlefield();
    const combat = new DefenseCombat(
      battlefield,
      new DefenseWave([
        { delayMs: 0, entryIndex: 0, stats: durableEnemy },
        { delayMs: 1_000, entryIndex: 0, stats: durableEnemy },
      ]),
      defaultConfig,
    );

    combat.update(500);
    expect(combat.enemies).toHaveLength(1);
    expect(combat.remainingSpawnCount).toBe(1);

    combat.update(500);
    expect(combat.enemies).toHaveLength(2);
    expect(combat.remainingSpawnCount).toBe(0);
  });

  it('publishes attack and destruction events once for presentation feedback', () => {
    const field = createBattlefield();
    field.place(
      new DefenseStructure('tower', 'tower', new GridPosition(1, 0), 100),
    );
    const combat = new DefenseCombat(
      field,
      new DefenseWave([
        {
          delayMs: 0,
          entryIndex: 0,
          stats: { ...durableEnemy, maxHealth: 5 },
        },
      ]),
      defaultConfig,
    );

    combat.update(50);

    expect(combat.drainEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'attack',
          style: 'popgun',
          damage: expect.any(Number),
          effectiveness: expect.stringMatching(/normal|favored/),
        }),
        expect.objectContaining({ type: 'destroyed', targetKind: 'unit' }),
      ]),
    );
    expect(combat.drainEvents()).toEqual([]);
  });
});
