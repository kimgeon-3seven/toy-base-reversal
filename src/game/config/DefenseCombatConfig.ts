import type { DefenseCombatConfig } from '../domain/combat/DefenseCombat';
import type { DefenseEnemyStats } from '../domain/combat/DefenseEnemy';
import { DefenseWave } from '../domain/combat/DefenseWave';
import type { UnitArchetype } from '../domain/combat/CombatArchetype';
import { TieredCoreLeakDamagePolicy } from '../domain/combat/CoreLeakDamagePolicy';
import { unitCost } from '../domain/combat/UnitEconomy';
import { availableUnitArchetypes } from './ContentConfig';
import { createPrototypeTowerUpgradePolicy } from './TowerUpgradeConfig';

export const PREPARATION_DURATION_MS = 30_000;
export const NORMAL_MODE_WAVE_COUNT_BY_ROUND = [3, 4, 5, 6, 7] as const;
export const ENEMY_HEALTH_BONUS_PER_ROUND = 4;
export const ENEMY_DAMAGE_BONUS_INTERVAL_ROUNDS = 2;

const BASE_ENEMY_STATS: Readonly<Record<UnitArchetype, DefenseEnemyStats>> = {
  tank: {
    archetype: 'tank',
    cost: unitCost('tank'),
    maxHealth: 90,
    movementSpeed: 1.08,
    attackDamage: 20,
    attackIntervalMs: 950,
    attackRange: 1.1,
  },
  swarm: {
    archetype: 'swarm',
    cost: unitCost('swarm'),
    maxHealth: 32,
    movementSpeed: 2.05,
    attackDamage: 8,
    attackIntervalMs: 620,
    attackRange: 1.1,
  },
  ranger: {
    archetype: 'ranger',
    cost: unitCost('ranger'),
    maxHealth: 48,
    movementSpeed: 1.52,
    attackDamage: 12,
    attackIntervalMs: 820,
    attackRange: 2.65,
  },
};

export const PROTOTYPE_DEFENSE_COMBAT_CONFIG: DefenseCombatConfig = {
  coreMaxHealth: 120,
  coreLeakDamagePolicy: new TieredCoreLeakDamagePolicy({
    2: 6,
    3: 12,
    4: 20,
  }),
  towerUpgradePolicy: createPrototypeTowerUpgradePolicy(),
  towers: {
    popgun: {
      rangeInCells: 3.35,
      damage: 9,
      attackIntervalMs: 310,
      splashRadiusInCells: 0,
    },
    mortar: {
      rangeInCells: 3.85,
      damage: 20,
      attackIntervalMs: 1_050,
      splashRadiusInCells: 1.3,
    },
    piercer: {
      rangeInCells: 4.1,
      damage: 34,
      attackIntervalMs: 1_420,
      splashRadiusInCells: 0,
    },
  },
};

export function createPrototypeDefenseCombatConfig(): DefenseCombatConfig {
  return {
    coreMaxHealth: PROTOTYPE_DEFENSE_COMBAT_CONFIG.coreMaxHealth,
    coreLeakDamagePolicy: PROTOTYPE_DEFENSE_COMBAT_CONFIG.coreLeakDamagePolicy,
    towerUpgradePolicy: PROTOTYPE_DEFENSE_COMBAT_CONFIG.towerUpgradePolicy,
    towers: {
      popgun: { ...PROTOTYPE_DEFENSE_COMBAT_CONFIG.towers.popgun },
      mortar: { ...PROTOTYPE_DEFENSE_COMBAT_CONFIG.towers.mortar },
      piercer: { ...PROTOTYPE_DEFENSE_COMBAT_CONFIG.towers.piercer },
    },
  };
}

export function createPrototypeDefenseWave(roundNumber = 1): DefenseWave {
  const difficultyStep = Math.max(0, roundNumber - 1);
  const normalRoundIndex = Math.min(
    difficultyStep,
    NORMAL_MODE_WAVE_COUNT_BY_ROUND.length - 1,
  );
  const normalRoundWaveCount =
    NORMAL_MODE_WAVE_COUNT_BY_ROUND[normalRoundIndex] ?? 3;
  const waveCount =
    normalRoundWaveCount + Math.max(0, difficultyStep - normalRoundIndex);
  const availableArchetypes = availableUnitArchetypes(roundNumber);
  const spawns = [];
  for (let waveIndex = 0; waveIndex < waveCount; waveIndex += 1) {
    for (let entryIndex = 0; entryIndex < 3; entryIndex += 1) {
      const archetype =
        availableArchetypes[(waveIndex + entryIndex) % availableArchetypes.length] ??
        'tank';
      const baseStats = BASE_ENEMY_STATS[archetype];
      const copies = archetype === 'swarm' ? 2 : 1;
      for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
        spawns.push({
          delayMs:
            waveIndex * 1_750 + entryIndex * 260 + copyIndex * 180,
          entryIndex,
          stats: {
            ...baseStats,
            maxHealth:
              baseStats.maxHealth +
              difficultyStep * ENEMY_HEALTH_BONUS_PER_ROUND,
            attackDamage:
              baseStats.attackDamage +
              Math.floor(
                difficultyStep / ENEMY_DAMAGE_BONUS_INTERVAL_ROUNDS,
              ),
          },
        });
      }
    }
  }

  return new DefenseWave(spawns);
}
