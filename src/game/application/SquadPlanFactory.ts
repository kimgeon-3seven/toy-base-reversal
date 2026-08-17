import type { AttackUnitKind, SquadPlan } from '../domain/attack/SquadPlan';
import { SquadPlan as MutableSquadPlan } from '../domain/attack/SquadPlan';
import type { SortiePointPolicy } from '../domain/attack/SortiePointPolicy';

export interface SquadPresetStrategy {
  apply(plan: SquadPlan, roundNumber: number): void;
}

export interface UnitAvailabilityPolicy {
  availableUnits(roundNumber: number): readonly AttackUnitKind[];
}

export interface SquadPlanSettings {
  readonly laneCount: number;
  readonly simultaneousCapacityPerLane: number;
  readonly spawnIntervalMs: number;
}

export class BalancedSquadPreset implements SquadPresetStrategy {
  public constructor(
    private readonly unitAvailability: UnitAvailabilityPolicy,
  ) {}

  public apply(plan: SquadPlan, roundNumber: number): void {
    const availableUnits = this.unitAvailability.availableUnits(roundNumber);
    if (availableUnits.length === 0) {
      throw new Error('A squad preset requires at least one available unit.');
    }

    for (let laneIndex = 0; laneIndex < plan.lanes.length; laneIndex += 1) {
      const primary =
        availableUnits[laneIndex % availableUnits.length] ?? availableUnits[0];
      if (primary === undefined) {
        throw new Error('A squad preset requires an available primary unit.');
      }
      plan.addUnit(laneIndex, primary);
      if (roundNumber < 2) continue;

      const secondary =
        availableUnits[(laneIndex + 1) % availableUnits.length] ?? primary;
      plan.addUnit(laneIndex, secondary);
    }
    plan.setCommanderLane(Math.min(1, plan.lanes.length - 1));
  }
}

export class SquadPlanFactory {
  public constructor(
    private readonly sortiePointPolicy: SortiePointPolicy,
    private readonly presetStrategy: SquadPresetStrategy,
    private readonly settings: SquadPlanSettings,
  ) {
    if (
      !Number.isInteger(settings.laneCount) ||
      settings.laneCount <= 0 ||
      !Number.isInteger(settings.simultaneousCapacityPerLane) ||
      settings.simultaneousCapacityPerLane <= 0 ||
      !Number.isFinite(settings.spawnIntervalMs) ||
      settings.spawnIntervalMs <= 0
    ) {
      throw new Error('Squad plan settings must be positive values.');
    }
  }

  public create(roundNumber: number, applyPreset = true): SquadPlan {
    const plan = new MutableSquadPlan(
      this.sortiePointPolicy.pointsForRound(roundNumber),
      this.settings.simultaneousCapacityPerLane,
      this.settings.laneCount,
      this.settings.spawnIntervalMs,
    );
    if (applyPreset) this.presetStrategy.apply(plan, roundNumber);
    return plan;
  }
}
