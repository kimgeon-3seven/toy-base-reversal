import type { TowerArchetype } from '../domain/combat/CombatArchetype';

export type InitialDefensePlacement =
  | {
      readonly kind: 'tower';
      readonly towerArchetype: TowerArchetype;
      readonly column: number;
      readonly row: number;
    }
  | {
      readonly kind: 'obstacle';
      readonly column: number;
      readonly row: number;
    };

export const INITIAL_DEFENSE_PLACEMENTS: readonly InitialDefensePlacement[] = [
  { kind: 'tower', towerArchetype: 'popgun', column: 7, row: 4 },
  { kind: 'tower', towerArchetype: 'popgun', column: 11, row: 8 },
  { kind: 'tower', towerArchetype: 'popgun', column: 16, row: 4 },
  { kind: 'obstacle', column: 13, row: 6 },
];
