import type { DefenseStructure } from '../structures/DefenseStructure';

export type BattlefieldFailureReason =
  | 'outside-map'
  | 'reserved-cell'
  | 'occupied-cell'
  | 'structure-not-found'
  | 'path-blocked';

export type BattlefieldResult =
  | { readonly success: true; readonly structure: DefenseStructure }
  | { readonly success: false; readonly reason: BattlefieldFailureReason };
