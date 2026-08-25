import { describe, expect, it } from 'vitest';
import { ResultExperiencePresenter } from './ResultExperiencePresentation';

describe('ResultExperiencePresenter', () => {
  const presenter = new ResultExperiencePresenter();

  it('turns each attack failure into a direct cause and recovery hint', () => {
    expect(presenter.presentAttackFailure('commander-defeated')).toMatchObject({
      title: '지휘관이 쓰러졌습니다',
      cause: '실패 원인 · 지휘관 전투 불능',
    });
    expect(presenter.presentAttackFailure('squad-defeated').title).toBe(
      '공격 부대가 전멸했습니다',
    );
    expect(presenter.presentAttackFailure('time-limit').title).toBe(
      '시간 안에 돌파하지 못했습니다',
    );
  });

  it('compares normal clear time with the previous personal best', () => {
    expect(presenter.compareNormalRecord(90_000, 100_000, true)).toBe(
      '신기록 · 이전보다 10.0초 단축',
    );
    expect(presenter.compareNormalRecord(110_000, 100_000, false)).toBe(
      '개인 최고보다 10.0초 느림',
    );
  });

  it('prioritizes challenge round before time', () => {
    expect(
      presenter.compareChallengeRecord(
        4,
        60_000,
        { round: 3, attackTimeMs: 40_000 },
        true,
      ),
    ).toBe('신기록 · 최고 라운드 3R → 4R');
    expect(
      presenter.compareChallengeRecord(
        3,
        45_000,
        { round: 3, attackTimeMs: 40_000 },
        false,
      ),
    ).toBe('같은 라운드 최고보다 5.0초 느림');
  });
});
