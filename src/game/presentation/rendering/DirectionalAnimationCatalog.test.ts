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

  it('resolves reusable animation profiles by combat archetype', () => {
    expect(catalog.profileForUnit('tank')?.id).toBe('shield');
    expect(catalog.profileForUnit('swarm')?.id).toBe('windup');
    expect(catalog.profileForUnit('ranger')?.id).toBe('ranger');
  });

  it('uses all four generated walk frames for the wind-up unit', () => {
    expect(catalog.profileForUnit('swarm')?.walkFrameOffsets).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it('uses all four generated walk frames for the rubber-band ranger', () => {
    expect(catalog.profileForUnit('ranger')?.walkFrameOffsets).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it('uses the first walk frame as the idle pose', () => {
    expect(catalog.idleFrame('north')).toBe(0);
    expect(catalog.idleFrame('south')).toBe(16);
    expect(catalog.idleFrame('northwest')).toBe(28);
  });
});
