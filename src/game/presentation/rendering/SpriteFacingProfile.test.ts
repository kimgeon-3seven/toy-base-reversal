import { describe, expect, it } from 'vitest';
import { IMAGE_ASSETS } from '../assets/GameAssets';
import { SpriteFacingProfile } from './SpriteFacingProfile';

describe('SpriteFacingProfile', () => {
  const profile = new SpriteFacingProfile();

  it('treats the popgun source sprite as naturally facing right', () => {
    expect(profile.naturalFacingDegrees(IMAGE_ASSETS.towerPopgun)).toBe(0);
  });

  it('uses the authored right-facing direction of the toy set', () => {
    expect(profile.naturalFacingDegrees(IMAGE_ASSETS.attackerTank)).toBe(0);
    expect(profile.naturalFacingDegrees(IMAGE_ASSETS.attackerSwarm)).toBe(0);
    expect(profile.naturalFacingDegrees(IMAGE_ASSETS.defenderRanger)).toBe(0);
    expect(profile.naturalFacingDegrees(IMAGE_ASSETS.commander)).toBe(0);
    expect(profile.naturalFacingDegrees(IMAGE_ASSETS.towerMortar)).toBe(0);
    expect(profile.naturalFacingDegrees(IMAGE_ASSETS.towerPiercer)).toBe(0);
    expect(profile.naturalFacingDegrees(IMAGE_ASSETS.obstacle)).toBe(0);
  });
});
