import { describe, expect, it } from 'vitest';
import { DirectionalAnimationCatalog } from './DirectionalAnimationCatalog';

describe('DirectionalAnimationCatalog', () => {
  const catalog = new DirectionalAnimationCatalog();

  it('maps screen-space degrees to the eight generated direction rows', () => {
    expect(catalog.directionForDegrees(-90)).toBe('north');
    expect(catalog.directionForDegrees(-45)).toBe('northeast');
    expect(catalog.directionForDegrees(0)).toBe('east');
    expect(catalog.directionForDegrees(90)).toBe('south');
    expect(catalog.directionForDegrees(180)).toBe('west');
    expect(catalog.directionForDegrees(-135)).toBe('northwest');
  });

  it('enables the pilot only for the attacking shield unit', () => {
    expect(catalog.profileForAttackUnit('tank')?.id).toBe('shield');
    expect(catalog.profileForAttackUnit('swarm')).toBeNull();
    expect(catalog.profileForAttackUnit('ranger')).toBeNull();
  });

  it('uses the first walk frame as the idle pose', () => {
    expect(catalog.idleFrame('north')).toBe(0);
    expect(catalog.idleFrame('south')).toBe(16);
    expect(catalog.idleFrame('northwest')).toBe(28);
  });
});
