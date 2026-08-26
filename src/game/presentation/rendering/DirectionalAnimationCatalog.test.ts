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

  it('keeps the already approved shield walk cycle unchanged', () => {
    expect(catalog.profileForUnit('tank')?.walkFrameOffsets).toEqual([
      0, 1, 2, 1,
    ]);
  });

  it('uses the full six-frame ping-pong sheet for the wind-up unit', () => {
    expect(catalog.profileForUnit('swarm')?.walkFrameOffsets).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(catalog.profileForUnit('swarm')?.walkFrameColumns).toBe(6);
  });

  it('uses the full six-frame ping-pong sheet for the rubber-band ranger', () => {
    expect(catalog.profileForUnit('ranger')?.walkFrameOffsets).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(catalog.profileForUnit('ranger')?.walkFrameColumns).toBe(6);
  });

  it('uses each profile column count when resolving idle poses', () => {
    const shield = catalog.profileForUnit('tank');
    const windup = catalog.profileForUnit('swarm');
    expect(shield).not.toBeNull();
    expect(windup).not.toBeNull();
    if (shield === null || windup === null) return;

    expect(catalog.idleFrame(shield, 'north')).toBe(0);
    expect(catalog.idleFrame(shield, 'south')).toBe(16);
    expect(catalog.idleFrame(shield, 'northwest')).toBe(28);
    expect(catalog.idleFrame(windup, 'south')).toBe(24);
    expect(catalog.idleFrame(windup, 'northwest')).toBe(42);
  });
});
