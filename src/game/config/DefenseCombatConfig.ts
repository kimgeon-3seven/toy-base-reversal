import type { DefenseCombatConfig } from '../domain/combat/DefenseCombat';
import type { DefenseEnemyStats } from '../domain/combat/DefenseEnemy';
import { DefenseWave } from '../domain/combat/DefenseWave';

export const PREPARATION_DURATION_MS = 30_000;

export const PROTOTYPE_ENEMY_STATS: DefenseEnemyStats = {
  maxHealth: 54,
  movementSpeed: 1.8,
  attackDamage: 16,
  attackIntervalMs: 850,
};

export const PROTOTYPE_DEFENSE_COMBAT_CONFIG: DefenseCombatConfig = {
  coreMaxHealth: 120,
  tower: {
    rangeInCells: 3.15,
    damage: 14,
    attackIntervalMs: 520,
  },
};

export function createPrototypeDefenseCombatConfig(): DefenseCombatConfig {
  return {
    coreMaxHealth: PROTOTYPE_DEFENSE_COMBAT_CONFIG.coreMaxHealth,
    tower: { ...PROTOTYPE_DEFENSE_COMBAT_CONFIG.tower },
  };
}

export function createPrototypeDefenseWave(roundNumber = 1): DefenseWave {
  const difficultyStep = Math.max(0, roundNumber - 1);
  const waveCount = 3 + Math.floor(difficultyStep / 3);
  const enemyStats: DefenseEnemyStats = {
    ...PROTOTYPE_ENEMY_STATS,
    maxHealth: PROTOTYPE_ENEMY_STATS.maxHealth + difficultyStep * 2,
    movementSpeed: PROTOTYPE_ENEMY_STATS.movementSpeed + difficultyStep * 0.02,
    attackDamage:
      PROTOTYPE_ENEMY_STATS.attackDamage + Math.floor(difficultyStep / 2),
  };
  const spawns = [];
  for (let waveIndex = 0; waveIndex < waveCount; waveIndex += 1) {
    for (let entryIndex = 0; entryIndex < 3; entryIndex += 1) {
      spawns.push({
        delayMs: waveIndex * 1_650 + entryIndex * 240,
        entryIndex,
        stats: enemyStats,
      });
    }
  }

  return new DefenseWave(spawns);
}
