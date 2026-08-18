import type { AttackCombatConfig } from '../domain/attack/AttackCombat';
import {
  challengeRoundFor,
  CHALLENGE_CORE_HEALTH_PER_ROUND,
} from './ChallengeModeConfig';
import { createPrototypeTowerUpgradePolicy } from './TowerUpgradeConfig';

export const ATTACK_PREPARATION_DURATION_MS = 30_000;

export const NORMAL_MODE_CORE_HEALTH_BY_ROUND = [
  650,
  650,
  1_500,
  1_600,
  2_900,
] as const;

export const NORMAL_MODE_ATTACK_TIME_TARGETS_MS = [
  { minimum: 25_000, maximum: 40_000 },
  { minimum: 30_000, maximum: 50_000 },
  { minimum: 40_000, maximum: 60_000 },
  { minimum: 50_000, maximum: 70_000 },
  { minimum: 60_000, maximum: 85_000 },
] as const;

export const PROTOTYPE_ATTACK_COMBAT_CONFIG: AttackCombatConfig = {
  coreMaxHealth: 170,
  timeLimitMs: 90_000,
  towerUpgradePolicy: createPrototypeTowerUpgradePolicy(),
  unitStats: {
    tank: {
      maxHealth: 125,
      movementSpeed: 1.15,
      attackDamage: 19,
      attackRange: 1.15,
      attackIntervalMs: 720,
    },
    swarm: {
      maxHealth: 38,
      movementSpeed: 2.05,
      attackDamage: 8,
      attackRange: 1.1,
      attackIntervalMs: 440,
    },
    ranger: {
      maxHealth: 62,
      movementSpeed: 1.5,
      attackDamage: 13,
      attackRange: 3.1,
      attackIntervalMs: 610,
    },
  },
  towers: {
    popgun: {
      rangeInCells: 3.35,
      damage: 8,
      attackIntervalMs: 340,
      splashRadiusInCells: 0,
    },
    mortar: {
      rangeInCells: 3.85,
      damage: 18,
      attackIntervalMs: 1_080,
      splashRadiusInCells: 1.25,
    },
    piercer: {
      rangeInCells: 4.1,
      damage: 30,
      attackIntervalMs: 1_450,
      splashRadiusInCells: 0,
    },
  },
  commander: {
    maxHealth: 145,
    attackDamage: 8,
    attackRange: 2.4,
    attackIntervalMs: 650,
  },
  focusFireCommandRadius: 3,
  focusFireCooldownMs: 7_000,
  disruptDurationMs: 3_200,
  disruptCooldownMs: 6_500,
  disruptRange: 4.2,
};

export function createPrototypeAttackCombatConfig(
  roundNumber = 1,
): AttackCombatConfig {
  const difficultyStep = Math.max(0, roundNumber - 1);
  const normalRoundIndex = Math.min(
    difficultyStep,
    NORMAL_MODE_CORE_HEALTH_BY_ROUND.length - 1,
  );
  const normalRoundCoreHealth =
    NORMAL_MODE_CORE_HEALTH_BY_ROUND[
      normalRoundIndex
    ];
  const challengeDifficultyStep = challengeRoundFor(roundNumber);
  return {
    ...PROTOTYPE_ATTACK_COMBAT_CONFIG,
    coreMaxHealth:
      (normalRoundCoreHealth ?? PROTOTYPE_ATTACK_COMBAT_CONFIG.coreMaxHealth) +
      challengeDifficultyStep * CHALLENGE_CORE_HEALTH_PER_ROUND,
    unitStats: {
      tank: { ...PROTOTYPE_ATTACK_COMBAT_CONFIG.unitStats.tank },
      swarm: { ...PROTOTYPE_ATTACK_COMBAT_CONFIG.unitStats.swarm },
      ranger: { ...PROTOTYPE_ATTACK_COMBAT_CONFIG.unitStats.ranger },
    },
    towers: {
      popgun: {
        ...PROTOTYPE_ATTACK_COMBAT_CONFIG.towers.popgun,
        damage:
          PROTOTYPE_ATTACK_COMBAT_CONFIG.towers.popgun.damage +
          Math.floor(difficultyStep / 2),
      },
      mortar: {
        ...PROTOTYPE_ATTACK_COMBAT_CONFIG.towers.mortar,
        damage:
          PROTOTYPE_ATTACK_COMBAT_CONFIG.towers.mortar.damage +
          Math.floor(difficultyStep / 2),
      },
      piercer: {
        ...PROTOTYPE_ATTACK_COMBAT_CONFIG.towers.piercer,
        damage:
          PROTOTYPE_ATTACK_COMBAT_CONFIG.towers.piercer.damage +
          Math.floor(difficultyStep / 2),
      },
    },
    commander: { ...PROTOTYPE_ATTACK_COMBAT_CONFIG.commander },
  };
}
