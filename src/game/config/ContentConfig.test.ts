import { describe, expect, it } from 'vitest';
import {
  availableTowerArchetypes,
  availableUnitArchetypes,
  isTowerAvailable,
  isUnitAvailable,
} from './ContentConfig';

describe('content unlock progression', () => {
  it('introduces one tower and unit archetype per early round', () => {
    expect(availableTowerArchetypes(1)).toEqual(['popgun']);
    expect(availableTowerArchetypes(2)).toEqual(['popgun', 'mortar']);
    expect(availableTowerArchetypes(3)).toEqual([
      'popgun',
      'mortar',
      'piercer',
    ]);

    expect(availableUnitArchetypes(1)).toEqual(['tank']);
    expect(availableUnitArchetypes(2)).toEqual(['tank', 'swarm']);
    expect(availableUnitArchetypes(3)).toEqual(['tank', 'swarm', 'ranger']);
  });

  it('keeps later content locked until its teaching round', () => {
    expect(isTowerAvailable('piercer', 2)).toBe(false);
    expect(isTowerAvailable('piercer', 3)).toBe(true);
    expect(isUnitAvailable('ranger', 2)).toBe(false);
    expect(isUnitAvailable('ranger', 3)).toBe(true);
  });
});
