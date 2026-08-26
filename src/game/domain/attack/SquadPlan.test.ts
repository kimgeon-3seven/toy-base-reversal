import { describe, expect, it } from 'vitest';
import { SquadPlan } from './SquadPlan';

describe('SquadPlan', () => {
  it('keeps the commander fixed at the second lane', () => {
    const plan = new SquadPlan(12, 2, 3);

    plan.addUnit(0, 'tank');
    plan.addUnit(2, 'ranger');

    expect(plan.commanderLane).toBe(1);
  });

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

  it('uses the configured queue interval and refunds every unit when cleared', () => {
    const plan = new SquadPlan(12, 2, 1, 750);
    plan.addUnit(0, 'tank');
    plan.addUnit(0, 'ranger');
    plan.addUnit(0, 'swarm');

    expect(plan.buildSpawnSchedule().map((spawn) => spawn.delayMs)).toEqual([
      0, 120, 750,
    ]);
    expect(plan.clearUnits()).toBe(9);
    expect(plan.remainingSortiePoints).toBe(12);
    expect(plan.unitCount).toBe(0);
  });

  it('restores lane order, remaining points, and spawn settings', () => {
    const original = new SquadPlan(18, 2, 3, 750);
    original.addUnit(0, 'tank');
    original.addUnit(0, 'ranger');
    original.addUnit(2, 'swarm');

    const restored = SquadPlan.restore(original.snapshot);

    expect(restored.lanes).toEqual([
      ['tank', 'ranger'],
      [],
      ['swarm'],
    ]);
    expect(restored.remainingBudget).toBe(original.remainingBudget);
    expect(restored.buildSpawnSchedule()).toEqual(
      original.buildSpawnSchedule(),
    );
  });

  it('rejects a saved formation that exceeds its sortie budget', () => {
    expect(() =>
      SquadPlan.restore({
        totalBudget: 3,
        simultaneousCapacityPerLane: 2,
        spawnIntervalMs: 900,
        lanes: [['tank', 'tank']],
      }),
    ).toThrow('invalid unit plan');
  });
});
