import type {
  TowerArchetype,
  UnitArchetype,
} from '../domain/combat/CombatArchetype';

export const TOWER_NAMES: Readonly<Record<TowerArchetype, string>> = {
  popgun: '팝건 포탑',
  mortar: '블록 박격포',
  piercer: '태엽 관통포',
};

export const UNIT_NAMES: Readonly<Record<UnitArchetype, string>> = {
  tank: '방패병',
  swarm: '태엽 군단',
  ranger: '고무줄 사수',
};

export function availableTowerArchetypes(
  roundNumber: number,
): readonly TowerArchetype[] {
  if (roundNumber <= 1) return ['popgun'];
  if (roundNumber === 2) return ['popgun', 'mortar'];
  return ['popgun', 'mortar', 'piercer'];
}

export function availableUnitArchetypes(
  roundNumber: number,
): readonly UnitArchetype[] {
  if (roundNumber <= 1) return ['tank'];
  if (roundNumber === 2) return ['tank', 'swarm'];
  return ['tank', 'swarm', 'ranger'];
}

export function isTowerAvailable(
  tower: TowerArchetype,
  roundNumber: number,
): boolean {
  return availableTowerArchetypes(roundNumber).includes(tower);
}

export function isUnitAvailable(
  unit: UnitArchetype,
  roundNumber: number,
): boolean {
  return availableUnitArchetypes(roundNumber).includes(unit);
}
