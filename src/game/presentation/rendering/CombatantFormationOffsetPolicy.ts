import type { UnitArchetype } from '../../domain/combat/CombatArchetype';

export interface CombatantFormationOffset {
  readonly x: number;
  readonly y: number;
}

export interface CombatantFormationOffsetPolicy {
  offsetFor(
    archetype: UnitArchetype,
    combatantId: string,
  ): CombatantFormationOffset;
}

const NO_OFFSET: CombatantFormationOffset = Object.freeze({ x: 0, y: 0 });

export class SwarmFormationOffsetPolicy
implements CombatantFormationOffsetPolicy {
  public constructor(private readonly spacingPixels = 4) {
    if (!Number.isFinite(spacingPixels) || spacingPixels < 0) {
      throw new Error('Formation spacing must be a non-negative number.');
    }
  }

  public offsetFor(
    archetype: UnitArchetype,
    combatantId: string,
  ): CombatantFormationOffset {
    if (archetype !== 'swarm' || this.spacingPixels === 0) return NO_OFFSET;
    const sequence = this.sequenceFor(combatantId);
    return {
      x: 0,
      y: sequence % 2 === 0 ? -this.spacingPixels : this.spacingPixels,
    };
  }

  private sequenceFor(combatantId: string): number {
    const suffix = combatantId.match(/(\d+)$/)?.[1];
    if (suffix !== undefined) return Number.parseInt(suffix, 10);
    return [...combatantId].reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    );
  }
}
