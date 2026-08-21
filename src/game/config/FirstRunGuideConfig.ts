import type { FirstRunGuideStage } from '../application/FirstRunGuide';

export interface FirstRunGuidePrompt {
  readonly label: string;
  readonly title: string;
  readonly body: string;
}

const CONTEXTUAL_PROMPTS: Partial<
  Readonly<Record<FirstRunGuideStage, FirstRunGuidePrompt>>
> = {
  'defense-preparation': {
    label: '첫 임무 · 방어',
    title: '이미 작동하는 기지입니다',
    body: '원하면 시설을 옮기고 Space로 바로 방어하세요.',
  },
  'defense-combat': {
    label: '첫 임무 · 코어 보호',
    title: '살아남은 적을 주의하세요',
    body: '코어에 도착한 적은 비용에 따라 누수 피해를 줍니다.',
  },
  'attack-preparation': {
    label: '역할 반전 · 공격',
    title: '추천 부대가 준비됐습니다',
    body: '편성을 바꾸거나 Space로 바로 자신의 기지를 공격하세요.',
  },
  'attack-movement': {
    label: '지휘관 훈련 · 1/3',
    title: 'WASD로 지휘관 이동',
    body: '일반 유닛은 자동 전투합니다. 지휘관을 한 칸 움직여 보세요.',
  },
  'attack-focus': {
    label: '지휘관 훈련 · 2/3',
    title: 'Q로 집중 공격',
    body: 'Q를 누른 뒤 타워를 클릭하면 주변 부대가 목표를 바꿉니다.',
  },
  'attack-disrupt': {
    label: '지휘관 훈련 · 3/3',
    title: 'E로 타워 교란',
    body: 'E를 누른 뒤 반경 안 타워를 클릭해 잠시 무력화하세요.',
  },
};

export function firstRunGuidePromptFor(
  stage: FirstRunGuideStage,
): FirstRunGuidePrompt | null {
  return CONTEXTUAL_PROMPTS[stage] ?? null;
}
