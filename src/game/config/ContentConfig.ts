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

export const TOWER_COUNTER_TARGETS: Readonly<
  Record<TowerArchetype, UnitArchetype>
> = {
  popgun: 'ranger',
  mortar: 'swarm',
  piercer: 'tank',
};

export const UNIT_COUNTER_TARGETS: Readonly<
  Record<UnitArchetype, TowerArchetype>
> = {
  tank: 'popgun',
  swarm: 'piercer',
  ranger: 'mortar',
};

export function towerCounterSummary(tower: TowerArchetype): string {
  return `${TOWER_NAMES[tower]} → ${UNIT_NAMES[TOWER_COUNTER_TARGETS[tower]]}`;
}

export function unitCounterSummary(unit: UnitArchetype): string {
  return `${UNIT_NAMES[unit]} → ${TOWER_NAMES[UNIT_COUNTER_TARGETS[unit]]}`;
}

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
