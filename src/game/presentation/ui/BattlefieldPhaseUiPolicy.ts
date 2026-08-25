export type BattlefieldPhase =
  | 'tutorial'
  | 'preparation'
  | 'combat'
  | 'result'
  | 'role-reversal'
  | 'attack-preparation'
  | 'attack-combat'
  | 'attack-result'
  | 'campaign-complete';

export interface BattlefieldPhaseUiLayout {
  readonly showMissionSummary: boolean;
  readonly showDefenseDeck: boolean;
  readonly showAttackDeck: boolean;
  readonly showCommanderAbilities: boolean;
  readonly statusY: number;
  readonly controls: string;
}

const PASSIVE_LAYOUT: BattlefieldPhaseUiLayout = {
  showMissionSummary: false,
  showDefenseDeck: false,
  showAttackDeck: false,
  showCommanderAbilities: false,
  statusY: 748,
  controls: 'Esc · 닫기 또는 계속하기',
};

export class BattlefieldPhaseUiPolicy {
  public resolve(phase: BattlefieldPhase): BattlefieldPhaseUiLayout {
    switch (phase) {
      case 'preparation':
        return {
          showMissionSummary: true,
          showDefenseDeck: true,
          showAttackDeck: false,
          showCommanderAbilities: false,
          statusY: 674,
          controls:
            '마우스 · 시설 배치/선택/재배치\n1~4 · 시설 선택  |  U · 강화\nCtrl+Z/Y · 실행 취소/다시 실행  |  Space · 방어 시작',
        };
      case 'combat':
        return {
          showMissionSummary: true,
          showDefenseDeck: false,
          showAttackDeck: false,
          showCommanderAbilities: false,
          statusY: 744,
          controls: '방어 전투는 자동으로 진행됩니다.\nEsc · 일시정지',
        };
      case 'attack-preparation':
        return {
          showMissionSummary: true,
          showDefenseDeck: false,
          showAttackDeck: true,
          showCommanderAbilities: false,
          statusY: 602,
          controls:
            '1~3 · 유닛 선택  |  진입로 클릭 · 유닛 추가\n우클릭 · 마지막 제거  |  P · 추천 편성\nSpace · 공격 시작',
        };
      case 'attack-combat':
        return {
          showMissionSummary: true,
          showDefenseDeck: false,
          showAttackDeck: false,
          showCommanderAbilities: true,
          statusY: 744,
          controls:
            'WASD · 지휘관 이동\nQ · 집중 공격  |  E · 교란\nEsc · 대상 선택 취소/일시정지',
        };
      case 'role-reversal':
        return {
          ...PASSIVE_LAYOUT,
          controls: 'Enter · 공격 준비로 바로 진행  |  Esc · 일시정지',
        };
      case 'tutorial':
        return {
          ...PASSIVE_LAYOUT,
          controls: 'Enter · 시작  |  Tab · 순위표  |  N · 닉네임',
        };
      case 'result':
      case 'attack-result':
        return {
          ...PASSIVE_LAYOUT,
          controls: '화면 버튼 · 다음 단계/재도전  |  Enter/R · 단축키',
        };
      case 'campaign-complete':
        return {
          ...PASSIVE_LAYOUT,
          controls: '화면 버튼 · 챌린지/일반 모드 선택  |  Enter/R · 단축키',
        };
    }
  }
}
