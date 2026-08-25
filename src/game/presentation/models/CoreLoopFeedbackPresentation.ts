import {
  TOWER_NAMES,
  UNIT_COUNTER_TARGETS,
  UNIT_NAMES,
} from '../../config/ContentConfig';
import type { UnitArchetype } from '../../domain/combat/CombatArchetype';
import type {
  DefenseRoundResult,
  RoundResult,
} from '../../domain/rounds/RoundSession';
import type { DefenseStructure } from '../../domain/structures/DefenseStructure';
import type { DefensePerformanceGrade } from './DefenseRewardPresentation';

export interface CoreLoopProgressMetric {
  readonly label: string;
  readonly ratio: number;
  readonly detail: string;
}

export interface DefenseCoreLoopPresentation {
  readonly progress: readonly CoreLoopProgressMetric[];
  readonly bridgeMessage: string;
}

export interface AttackPreparationBrief {
  readonly defenseSummary: string;
  readonly counterSummary: string;
  readonly rewardSummary: string;
}

export interface CompletedCoreLoopPresentation {
  readonly title: string;
  readonly comparison: readonly string[];
  readonly conclusion: string;
}

export class CoreLoopFeedbackPresenter {
  public presentDefense(
    result: DefenseRoundResult,
  ): DefenseCoreLoopPresentation {
    const killPercent = this.percentage(result.sortieReward.killRate);
    const corePercent = this.percentage(result.sortieReward.coreHealthRate);
    return {
      progress: [
        {
          label: '처치율',
          ratio: result.sortieReward.killRate,
          detail: `${killPercent}% · +${result.sortieReward.killBonus}P`,
        },
        {
          label: '코어 보존',
          ratio: result.sortieReward.coreHealthRate,
          detail: `${corePercent}% · +${result.sortieReward.coreHealthBonus}P`,
        },
      ],
      bridgeMessage: `방어 성과가 공격 자원 ${result.sortieReward.totalPoints}P가 되었습니다.`,
    };
  }

  public presentAttackPreparation(
    structures: readonly DefenseStructure[],
    result: DefenseRoundResult,
    availableUnits: readonly UnitArchetype[],
  ): AttackPreparationBrief {
    const towers = structures.filter(
      (structure) => structure.kind === 'tower' && structure.towerArchetype !== null,
    );
    const towerCounts = new Map<string, number>();
    for (const tower of towers) {
      const name = TOWER_NAMES[tower.towerArchetype ?? 'popgun'];
      towerCounts.set(name, (towerCounts.get(name) ?? 0) + 1);
    }
    const obstacleCount = structures.filter(
      (structure) => structure.kind === 'obstacle',
    ).length;
    const defenseParts = [...towerCounts].map(
      ([name, count]) => `${name.replace(' 포탑', '')} ${count}`,
    );
    if (obstacleCount > 0) defenseParts.push(`블록 벽 ${obstacleCount}`);

    const counterParts = availableUnits
      .filter((unit) =>
        towers.some(
          (tower) => tower.towerArchetype === UNIT_COUNTER_TARGETS[unit],
        ),
      )
      .map(
        (unit) =>
          `${UNIT_NAMES[unit]}→${TOWER_NAMES[UNIT_COUNTER_TARGETS[unit]].replace(' 포탑', '')}`,
      );

    return {
      defenseSummary: `같은 설계 · ${defenseParts.join(' · ') || '타워 없음'}`,
      counterSummary:
        counterParts.length === 0
          ? '추천 · 지휘관으로 핵심 타워를 제거하세요'
          : `추천 · ${counterParts.join(' · ')}`,
      rewardSummary: `방어 보상 · 기본 ${result.sortieReward.basePoints} + 성과 ${result.sortieReward.killBonus + result.sortieReward.coreHealthBonus} = ${result.sortieReward.totalPoints}P`,
    };
  }

  public presentCompletion(
    result: RoundResult,
    grade: DefensePerformanceGrade,
  ): CompletedCoreLoopPresentation {
    return {
      title: '같은 설계, 양쪽 모두 승리',
      comparison: [
        `방어 ${grade}등급 · 처치 ${this.percentage(result.defense.sortieReward.killRate)}% · 코어 ${this.percentage(result.defense.sortieReward.coreHealthRate)}%`,
        `공략 ${this.seconds(result.attackTimeMs)}초 · 출격 ${result.defense.sortieReward.totalPoints}P`,
      ],
      conclusion: '내가 만든 방어선을 직접 분석하고 돌파했습니다.',
    };
  }

  private percentage(ratio: number): number {
    return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  }

  private seconds(durationMs: number): string {
    return (durationMs / 1_000).toFixed(1);
  }
}
