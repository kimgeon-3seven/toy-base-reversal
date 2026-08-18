import { describe, expect, it } from 'vitest';
import {
  createPrototypeSquadPlan,
  sortiePointsForRound,
  SQUAD_SPAWN_INTERVAL_MS,
} from './AttackSquadConfig';

describe('AttackSquadConfig', () => {
  it('uses the approved sortie point curve for all normal rounds', () => {
    expect([1, 2, 3, 4, 5].map(sortiePointsForRound)).toEqual([
      24, 27, 30, 33, 36,
    ]);
  });

  it('creates a refundable recommended squad with the configured queue delay', () => {
    const plan = createPrototypeSquadPlan(3);

    expect(plan.unitCount).toBe(6);
    expect(plan.spawnIntervalMs).toBe(SQUAD_SPAWN_INTERVAL_MS);
    plan.clearUnits();
    expect(plan.remainingSortiePoints).toBe(plan.totalSortiePoints);
  });

  it('grows more slowly in challenge mode and caps browser load', () => {
    expect([5, 6, 7, 10, 11, 20].map(sortiePointsForRound)).toEqual([
      36, 38, 40, 46, 48, 48,
    ]);
  });
});
