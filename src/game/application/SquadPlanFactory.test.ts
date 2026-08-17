import { describe, expect, it } from 'vitest';
import { LinearSortiePointPolicy } from '../domain/attack/SortiePointPolicy';
import {
  BalancedSquadPreset,
  SquadPlanFactory,
  type UnitAvailabilityPolicy,
} from './SquadPlanFactory';

class TestAvailability implements UnitAvailabilityPolicy {
  public availableUnits(roundNumber: number) {
    return roundNumber === 1
      ? (['tank'] as const)
      : (['tank', 'swarm', 'ranger'] as const);
  }
}

function createFactory(): SquadPlanFactory {
  return new SquadPlanFactory(
    new LinearSortiePointPolicy(24, 3),
    new BalancedSquadPreset(new TestAvailability()),
    {
      laneCount: 3,
      simultaneousCapacityPerLane: 2,
      spawnIntervalMs: 900,
    },
  );
}

describe('SquadPlanFactory', () => {
  it('creates an editable recommended preset with the fresh round budget', () => {
    const plan = createFactory().create(3);

    expect(plan.totalSortiePoints).toBe(30);
    expect(plan.lanes.map((lane) => lane.length)).toEqual([2, 2, 2]);
    expect(plan.commanderLane).toBe(1);
    expect(plan.clearUnits()).toBeGreaterThan(0);
    expect(plan.remainingSortiePoints).toBe(30);
  });

  it('can create an empty fully funded plan without applying the preset', () => {
    const plan = createFactory().create(2, false);

    expect(plan.unitCount).toBe(0);
    expect(plan.remainingSortiePoints).toBe(27);
  });
});
