import { describe, expect, it } from 'vitest';
import { FacingDirectionResolver } from './FacingDirectionResolver';

describe('FacingDirectionResolver', () => {
  const resolver = new FacingDirectionResolver();

  it('resolves screen-space vectors into eight directions', () => {
    expect(resolver.eightWayDegrees(1, 0)).toBe(0);
    expect(resolver.eightWayDegrees(1, 1)).toBe(45);
    expect(resolver.eightWayDegrees(0, 1)).toBe(90);
    expect(resolver.eightWayDegrees(-1, -1)).toBe(-135);
    expect(resolver.eightWayDegrees(0, -1)).toBe(-90);
  });

  it('keeps the current facing when there is no movement', () => {
    expect(resolver.eightWayDegrees(0, 0)).toBeNull();
  });

  it('accounts for the source image natural facing', () => {
    expect(resolver.spriteRotationDegrees(0, -90)).toBe(90);
    expect(resolver.spriteRotationDegrees(0, 180)).toBe(-180);
  });

  it('takes the shortest bounded turn across the angle boundary', () => {
    expect(resolver.approachDegrees(170, -170, 8)).toBe(178);
    expect(resolver.approachDegrees(-170, 170, 8)).toBe(-178);
  });
});
