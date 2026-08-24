import type { AttackFailureReason } from '../../domain/attack/AttackCombat';

export interface DefenseFeedbackSnapshot {
  readonly won: boolean;
  readonly defeatedEnemies: number;
  readonly breachedEnemies: number;
  readonly remainingCoreHealth: number;
  readonly coreMaxHealth: number;
  readonly survivingStructures: number;
  readonly startingStructures: number;
}

export class BattleFeedbackAdvisor {
  public forDefense(snapshot: DefenseFeedbackSnapshot): string {
    const totalEnemies = snapshot.defeatedEnemies + snapshot.breachedEnemies;
    const breachRate =
      totalEnemies === 0 ? 0 : snapshot.breachedEnemies / totalEnemies;
    const coreRate = snapshot.remainingCoreHealth / snapshot.coreMaxHealth;
    const structureRate =
      snapshot.startingStructures === 0
        ? 0
        : snapshot.survivingStructures / snapshot.startingStructures;

    if (!snapshot.won && breachRate >= 0.4) {
      return '누수가 많았습니다. 입구별 화력을 나누고 코어 앞에 마지막 저지선을 남겨보세요.';
    }
    if (!snapshot.won) {
      return '코어가 버티지 못했습니다. 손실이 컸던 진입로의 타워 상성과 위치를 먼저 바꿔보세요.';
    }
    if (coreRate < 0.5) {
      return '방어에는 성공했지만 코어 피해가 컸습니다. 누수를 줄이면 다음 공격 부대가 더 강해집니다.';
    }
    if (structureRate < 0.5) {
      return '시설 손실이 컸습니다. 장애물로 시간을 벌고 타워가 서로 엄호하도록 배치해보세요.';
    }
    if (breachRate > 0) {
      return '좋은 방어입니다. 남은 누수까지 줄이면 코어 보너스와 처치 보너스를 함께 높일 수 있습니다.';
    }
    return '완벽한 방어입니다. 이 설계가 곧 공격 라운드의 공략 대상이 됩니다.';
  }

  public forAttack(
    won: boolean,
    failureReason: AttackFailureReason,
  ): string {
    if (won) {
      return '내가 만든 방어선을 돌파했습니다. 다음 라운드에서는 더 강한 설계와 부대를 시험합니다.';
    }
    if (failureReason === 'commander-defeated') {
      return '지휘관이 먼저 쓰러졌습니다. 일반 유닛 뒤에서 이동하며 Q와 E로 돌파구를 만드세요.';
    }
    if (failureReason === 'squad-defeated') {
      return '일반 부대가 전멸했습니다. 한 진입로 도배보다 타워 상성에 맞춰 진입로를 나눠보세요.';
    }
    return '시간이 부족했습니다. 집중 공격으로 핵심 타워 하나를 빠르게 제거하고 코어로 진격하세요.';
  }
}
