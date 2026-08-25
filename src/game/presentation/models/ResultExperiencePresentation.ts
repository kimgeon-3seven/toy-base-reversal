import type { AttackFailureReason } from '../../domain/attack/AttackCombat';

export interface AttackFailurePresentation {
  readonly title: string;
  readonly cause: string;
  readonly recovery: string;
}

export class ResultExperiencePresenter {
  public presentAttackFailure(
    failureReason: AttackFailureReason,
  ): AttackFailurePresentation {
    if (failureReason === 'commander-defeated') {
      return {
        title: '지휘관이 쓰러졌습니다',
        cause: '실패 원인 · 지휘관 전투 불능',
        recovery: '일반 유닛 뒤에서 이동하고 Q와 E로 안전한 돌파구를 만드세요.',
      };
    }
    if (failureReason === 'squad-defeated') {
      return {
        title: '공격 부대가 전멸했습니다',
        cause: '실패 원인 · 일반 부대 전멸',
        recovery: '타워 상성에 맞는 유닛을 고르고 병력을 여러 진입로에 나눠보세요.',
      };
    }
    return {
      title: '시간 안에 돌파하지 못했습니다',
      cause: '실패 원인 · 제한시간 초과',
      recovery: '집중 공격으로 핵심 타워를 먼저 제거한 뒤 코어로 진격하세요.',
    };
  }

  public compareNormalRecord(
    currentTimeMs: number,
    previousBestTimeMs: number | null,
    isNewBest: boolean,
  ): string {
    if (isNewBest && previousBestTimeMs === null) return '첫 완주 기록을 저장했습니다.';
    if (isNewBest && previousBestTimeMs !== null) {
      return `신기록 · 이전보다 ${this.seconds(previousBestTimeMs - currentTimeMs)}초 단축`;
    }
    if (previousBestTimeMs === null) return '개인 최고 기록과 비교할 수 없습니다.';
    return `개인 최고보다 ${this.seconds(currentTimeMs - previousBestTimeMs)}초 느림`;
  }

  public compareChallengeRecord(
    round: number,
    attackTimeMs: number,
    previous: { readonly round: number; readonly attackTimeMs: number } | null,
    isNewBest: boolean,
  ): string {
    if (previous === null && isNewBest) return '첫 챌린지 기록을 저장했습니다.';
    if (!isNewBest && previous !== null && round < previous.round) {
      return `개인 최고까지 ${previous.round - round}라운드 남음`;
    }
    if (!isNewBest && previous !== null && round === previous.round) {
      return `같은 라운드 최고보다 ${this.seconds(attackTimeMs - previous.attackTimeMs)}초 느림`;
    }
    if (isNewBest && previous !== null && round > previous.round) {
      return `신기록 · 최고 라운드 ${previous.round}R → ${round}R`;
    }
    if (isNewBest && previous !== null) {
      return `신기록 · 같은 라운드에서 ${this.seconds(previous.attackTimeMs - attackTimeMs)}초 단축`;
    }
    return `개인 최고 ${previous?.round ?? round}R`;
  }

  private seconds(durationMs: number): string {
    return Math.max(0, durationMs / 1_000).toFixed(1);
  }
}
