export type UnitArchetype = 'tank' | 'swarm' | 'ranger';
export type TowerArchetype = 'popgun' | 'mortar' | 'piercer';

const TOWER_COUNTERS: Readonly<Record<TowerArchetype, UnitArchetype>> = {
  popgun: 'ranger',
  mortar: 'swarm',
  piercer: 'tank',
};

const UNIT_COUNTERS: Readonly<Record<UnitArchetype, TowerArchetype>> = {
  tank: 'popgun',
  swarm: 'piercer',
  ranger: 'mortar',
};

export const FAVORED_DAMAGE_MULTIPLIER = 1.65;

export function towerDamageMultiplier(
  tower: TowerArchetype,
  target: UnitArchetype,
): number {
  return TOWER_COUNTERS[tower] === target ? FAVORED_DAMAGE_MULTIPLIER : 1;
}

export function unitDamageMultiplier(
  unit: UnitArchetype,
  targetTower: TowerArchetype | null,
): number {
  return targetTower !== null && UNIT_COUNTERS[unit] === targetTower
    ? FAVORED_DAMAGE_MULTIPLIER
    : 1;
}

export function towerCounterTarget(tower: TowerArchetype): UnitArchetype {
  return TOWER_COUNTERS[tower];
}

export function unitCounterTarget(unit: UnitArchetype): TowerArchetype {
  return UNIT_COUNTERS[unit];
}
