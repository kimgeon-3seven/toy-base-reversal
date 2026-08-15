import { describe, expect, it } from 'vitest';
import { SquadPlan } from './SquadPlan';

describe('SquadPlan', () => {
  it('spends and refunds the shared attack budget', () => {
    const plan = new SquadPlan(7, 2);

    expect(plan.addUnit(0, 'tank')).toBe(true);
    expect(plan.addUnit(0, 'ranger')).toBe(true);
    expect(plan.remainingBudget).toBe(0);
    expect(plan.addUnit(1, 'ranger')).toBe(false);

    expect(plan.removeLastUnit(0)).toBe('ranger');
    expect(plan.remainingBudget).toBe(3);
  });

  it('delays units that exceed a lane simultaneous capacity', () => {
    const plan = new SquadPlan(20, 2);
    plan.addUnit(0, 'tank');
    plan.addUnit(0, 'ranger');
    plan.addUnit(0, 'tank');

    const schedule = plan.buildSpawnSchedule(900);

    expect(schedule.map((spawn) => spawn.delayMs)).toEqual([0, 120, 900]);
  });
});
