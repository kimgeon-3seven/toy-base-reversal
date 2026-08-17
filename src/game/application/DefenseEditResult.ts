import type {
  BattlefieldFailureReason,
  BattlefieldResult,
} from '../domain/battlefield/BattlefieldResult';
import type { DefenseStructure } from '../domain/structures/DefenseStructure';

export type DefenseEditFailureReason =
  | BattlefieldFailureReason
  | 'insufficient-funds'
  | 'not-upgradable'
  | 'max-level';

export type DefenseEditResult =
  | Extract<BattlefieldResult, { readonly success: true }>
  | {
      readonly success: false;
      readonly reason: DefenseEditFailureReason;
    };

export interface DefenseSaleReceipt {
  readonly structure: DefenseStructure;
  readonly refund: number;
}

export type DefenseSaleResult =
  | { readonly success: true; readonly receipt: DefenseSaleReceipt }
  | {
      readonly success: false;
      readonly reason: BattlefieldFailureReason;
    };

export interface DefenseUpgradeReceipt {
  readonly structure: DefenseStructure;
  readonly cost: number;
  readonly level: number;
}

export type DefenseUpgradeResult =
  | { readonly success: true; readonly receipt: DefenseUpgradeReceipt }
  | {
      readonly success: false;
      readonly reason:
        | 'structure-not-found'
        | 'not-upgradable'
        | 'max-level'
        | 'insufficient-funds';
    };
