import { describe, expect, it } from 'vitest';
import { IMAGE_ASSETS } from '../assets/GameAssets';
import { SpriteFacingProfile } from './SpriteFacingProfile';

describe('SpriteFacingProfile', () => {
  const profile = new SpriteFacingProfile();

  it('treats the popgun source sprite as naturally facing right', () => {
    expect(profile.naturalFacingDegrees(IMAGE_ASSETS.towerPopgun)).toBe(0);
  });

  it('preserves the source orientation of the other known sprites', () => {
    expect(profile.naturalFacingDegrees(IMAGE_ASSETS.attackerTank)).toBe(0);
    expect(profile.naturalFacingDegrees(IMAGE_ASSETS.towerMortar)).toBe(-90);
    expect(profile.naturalFacingDegrees(IMAGE_ASSETS.commander)).toBe(-90);
  });
});
