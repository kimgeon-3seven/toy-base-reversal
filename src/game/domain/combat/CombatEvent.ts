export interface CombatPoint {
  readonly column: number;
  readonly row: number;
}

export type CombatAttackStyle =
  | 'popgun'
  | 'mortar'
  | 'piercer'
  | 'unit'
  | 'commander';

export type CombatHitEffectiveness = 'normal' | 'favored';

export type CombatEvent =
  | {
      readonly type: 'attack';
      readonly style: CombatAttackStyle;
      readonly source: CombatPoint;
      readonly target: CombatPoint;
      readonly damage: number;
      readonly effectiveness: CombatHitEffectiveness;
    }
  | {
      readonly type: 'destroyed';
      readonly targetKind: 'unit' | 'structure';
      readonly position: CombatPoint;
    }
  | {
      readonly type: 'core-hit';
      readonly position: CombatPoint;
      readonly damage: number;
    };
