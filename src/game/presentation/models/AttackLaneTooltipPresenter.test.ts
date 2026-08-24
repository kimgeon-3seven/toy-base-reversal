import { describe, expect, it } from 'vitest';
import { AttackLaneTooltipPresenter } from './AttackLaneTooltipPresenter';

describe('AttackLaneTooltipPresenter', () => {
  const presenter = new AttackLaneTooltipPresenter();

  it('summarizes the hovered lane by unit type', () => {
    const result = presenter.present(
      1,
      ['tank', 'swarm', 'tank', 'ranger'],
      'swarm',
      8,
    );

    expect(result.title).toBe('2번 진입로 · 편성 4명');
    expect(result.composition).toContain('2');
    expect(result.composition).toContain('1');
    expect(result.canAddSelectedUnit).toBe(true);
    expect(result.hint).toContain('좌클릭');
  });

  it('explains when the selected unit cannot be added', () => {
    const result = presenter.present(0, [], 'tank', 0);

    expect(result.composition).toBe('아직 배치된 유닛이 없습니다.');
    expect(result.canAddSelectedUnit).toBe(false);
    expect(result.hint).toContain('출격 포인트 부족');
  });
});
