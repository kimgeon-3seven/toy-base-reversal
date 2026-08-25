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
    title: '빛나는 칸만 확인하세요',
    body: '기본 방어선은 완성됐습니다. 팝건 1개 또는 블록 벽 2개를 놓고 방어 시작을 누르세요.',
  },
  'defense-combat': {
    label: '2/4 · 방어',
    title: '첫 웨이브는 짧게 진행됩니다',
    body: '타워는 자동 공격합니다. 코어가 살아남으면 곧바로 역할이 뒤집힙니다.',
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
