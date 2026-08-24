import { UNIT_NAMES } from '../../config/ContentConfig';
import {
  attackUnitCost,
  type AttackUnitKind,
} from '../../domain/attack/SquadPlan';

const UNIT_ORDER: readonly AttackUnitKind[] = ['tank', 'swarm', 'ranger'];

export interface AttackLaneTooltipPresentation {
  readonly title: string;
  readonly composition: string;
  readonly hint: string;
  readonly canAddSelectedUnit: boolean;
}

export class AttackLaneTooltipPresenter {
  public present(
    laneIndex: number,
    lane: readonly AttackUnitKind[],
    selectedUnit: AttackUnitKind,
    remainingPoints: number,
  ): AttackLaneTooltipPresentation {
    const selectedCost = attackUnitCost(selectedUnit);
    const canAddSelectedUnit = remainingPoints >= selectedCost;
    const composition = UNIT_ORDER.map((unit) => ({
      unit,
      count: lane.filter((candidate) => candidate === unit).length,
    }))
      .filter(({ count }) => count > 0)
      .map(({ unit, count }) => `${UNIT_NAMES[unit]} ${count}`)
      .join(' · ');

    return {
      title: `${laneIndex + 1}번 진입로 · 편성 ${lane.length}명`,
      composition:
        composition.length === 0 ? '아직 배치된 유닛이 없습니다.' : composition,
      hint: canAddSelectedUnit
        ? `좌클릭 ${UNIT_NAMES[selectedUnit]} 추가 (${selectedCost}P) · 우클릭 제거`
        : `출격 포인트 부족 (${remainingPoints}/${selectedCost}P) · 우클릭 제거`,
      canAddSelectedUnit,
    };
  }
}
