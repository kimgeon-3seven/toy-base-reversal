import type { UnitArchetype } from '../../domain/combat/CombatArchetype';

export interface CombatantVisualSizePolicy {
  displaySizeFor(archetype: UnitArchetype): number;
}

const DISPLAY_SIZE_BY_ARCHETYPE: Readonly<Record<UnitArchetype, number>> = {
  tank: 68,
  swarm: 64,
  ranger: 70,
};

export class ReadableCombatantVisualSizePolicy
implements CombatantVisualSizePolicy {
  public displaySizeFor(archetype: UnitArchetype): number {
    return DISPLAY_SIZE_BY_ARCHETYPE[archetype];
  }
}
