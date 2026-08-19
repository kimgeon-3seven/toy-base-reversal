import {
  TutorialSequence,
  type TutorialStep,
} from '../application/TutorialSequence';

const PROTOTYPE_TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    title: '내가 만든 기지를 지킨다',
    body:
      '30초 동안 타워와 블록 벽을 배치하세요. 적이 길을 완전히 잃는 배치는 불가능하며, 살아서 도착한 적은 비용에 비례한 피해를 코어에 줍니다.',
    objective: '목표: 코어가 파괴되기 전에 모든 적을 막으세요.',
  },
  {
    title: '세 가지 상성만 기억한다',
    body:
      '팝건 포탑 → 고무줄 사수\n블록 박격포 → 태엽 군단\n태엽 관통포 → 방패병\n\n화살표 방향의 적에게 더 강합니다.',
    objective: '팁: 첫 라운드에는 팝건 포탑과 방패병만 등장합니다.',
  },
  {
    title: '내 방어선을 내가 돌파한다',
    body:
      '방어 성공 후 30초 동안 부대를 편성합니다. 일반 유닛은 자동 전투하고, 지휘관은 WASD로 직접 이동합니다. Q는 주변 부대의 집중 공격, E는 반경 안 타워 교란입니다.',
    objective: '목표: 지휘관을 살리면서 적 코어를 파괴하세요.',
  },
];

export function createPrototypeTutorial(): TutorialSequence {
  return new TutorialSequence(PROTOTYPE_TUTORIAL_STEPS);
}
