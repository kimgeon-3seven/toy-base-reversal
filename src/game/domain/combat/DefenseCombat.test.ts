import { describe, expect, it } from 'vitest';
import { Battlefield } from '../battlefield/Battlefield';
import { GridMap } from '../grid/GridMap';
import { GridPosition } from '../grid/GridPosition';
import { BreadthFirstPathfinder } from '../pathfinding/BreadthFirstPathfinder';
import { DefenseStructure } from '../structures/DefenseStructure';
import {
  DefenseCombat,
  type DefenseCombatConfig,
} from './DefenseCombat';
import type { DefenseEnemyStats } from './DefenseEnemy';
import { DefenseWave } from './DefenseWave';

const defaultConfig: DefenseCombatConfig = {
  coreMaxHealth: 100,
  tower: {
    rangeInCells: 2.5,
    damage: 10,
    attackIntervalMs: 100,
  },
};

const durableEnemy: DefenseEnemyStats = {
  maxHealth: 100,
  movementSpeed: 2,
  attackDamage: 20,
  attackIntervalMs: 100,
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

  it('loses the defense when enemies reduce core health to zero', () => {
    const battlefield = createBattlefield(3, 3);
    const crushingEnemy: DefenseEnemyStats = {
      ...durableEnemy,
      movementSpeed: 4,
      attackDamage: 50,
    };
    const combat = new DefenseCombat(
      battlefield,
      new DefenseWave([
        { delayMs: 0, entryIndex: 0, stats: crushingEnemy },
      ]),
      defaultConfig,
    );

    combat.update(2_000);

    expect(combat.coreHealth).toBe(0);
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
});
