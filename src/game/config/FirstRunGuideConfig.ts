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
    label: '1/4 · 설계',
    title: '기지는 이미 준비됐습니다',
    body: '타워를 하나 확인한 뒤 [Space]로 방어를 시작하세요.',
  },
  'defense-combat': {
    label: '2/4 · 방어',
    title: '새는 진입로를 확인하세요',
    body: '코어에 도착한 적은 비용에 따라 누수 피해를 줍니다.',
  },
  'attack-preparation': {
    label: '4/4 · 공략 준비',
    title: '추천 부대가 준비됐습니다',
    body: '타워 상성을 확인하고 [Space]로 자신의 기지를 공격하세요.',
  },
  'attack-movement': {
    label: '지휘관 · 1/3',
    title: 'WASD로 지휘관 이동',
    body: '일반 유닛은 자동 전투합니다. 지휘관을 한 칸 움직여 보세요.',
  },
  'attack-focus': {
    label: '지휘관 · 2/3',
    title: 'Q로 집중 공격',
    body: 'Q를 누른 뒤 타워를 클릭하면 주변 부대가 목표를 바꿉니다.',
  },
  'attack-disrupt': {
    label: '지휘관 · 3/3',
    title: 'E로 타워 교란',
    body: 'E를 누른 뒤 반경 안 타워를 클릭해 잠시 무력화하세요.',
  },
};

export function firstRunGuidePromptFor(
  stage: FirstRunGuideStage,
): FirstRunGuidePrompt | null {
  return CONTEXTUAL_PROMPTS[stage] ?? null;
}
