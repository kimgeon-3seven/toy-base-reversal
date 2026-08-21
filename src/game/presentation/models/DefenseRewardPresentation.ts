import type { DefenseRoundResult } from '../../domain/rounds/RoundSession';

export type DefensePerformanceGrade = 'S' | 'A' | 'B' | 'C';

export interface DefenseRewardPresentation {
  readonly grade: DefensePerformanceGrade;
  readonly headline: string;
  readonly breakdown: string;
  readonly strategyMessage: string;
}

export class DefenseRewardPresenter {
  public present(result: DefenseRoundResult): DefenseRewardPresentation {
    const performanceScore = result.sortieReward.killRate * 0.6 +
      result.sortieReward.coreHealthRate * 0.4;
    const grade = this.gradeFor(performanceScore);
    return {
      grade,
      headline: `방어 등급 ${grade} · 출격 포인트 ${result.sortieReward.totalPoints}`,
      breakdown: `기본 ${result.sortieReward.basePoints} + 처치 ${result.sortieReward.killBonus} + 코어 ${result.sortieReward.coreHealthBonus}`,
      strategyMessage:
        result.sortieReward.killBonus >= result.sortieReward.coreHealthBonus
          ? '적을 많이 줄여 공격 부대 규모를 키웠습니다.'
          : '코어를 온전히 지켜 공격 선택지를 넓혔습니다.',
    };
  }

  private gradeFor(score: number): DefensePerformanceGrade {
    if (score >= 0.9) return 'S';
    if (score >= 0.72) return 'A';
    if (score >= 0.5) return 'B';
    return 'C';
  }
}
