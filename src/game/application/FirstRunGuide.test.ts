import { describe, expect, it } from 'vitest';
import { FirstRunGuide } from './FirstRunGuide';

describe('FirstRunGuide', () => {
  it('guides a first-time player through contextual attack controls', () => {
    const guide = new FirstRunGuide(true);

    guide.beginDefensePreparation();
    expect(guide.stage).toBe('defense-preparation');
    guide.beginDefenseCombat();
    expect(guide.stage).toBe('defense-combat');
    guide.beginRoleReversal();
    expect(guide.stage).toBe('role-reversal');
    guide.beginAttackPreparation();
    expect(guide.stage).toBe('attack-preparation');
    guide.beginAttackCombat();
    expect(guide.stage).toBe('attack-movement');
    guide.recordCommanderMovement();
    expect(guide.stage).toBe('attack-focus');
    guide.recordFocusFire();
    expect(guide.stage).toBe('attack-disrupt');
    guide.recordDisruption();
    expect(guide.stage).toBe('complete');
  });

  it('does not show detailed combat prompts to a returning player', () => {
    const guide = new FirstRunGuide(false);

    guide.beginAttackCombat();

    expect(guide.isDetailed).toBe(false);
    expect(guide.stage).toBe('complete');
  });

  it('can replay the detailed guide without changing persisted progress', () => {
    const guide = new FirstRunGuide(false);
    guide.complete();

    guide.restartDetailed();

    expect(guide.isDetailed).toBe(true);
    expect(guide.stage).toBe('opening');
  });
});
