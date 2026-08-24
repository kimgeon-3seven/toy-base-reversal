import { describe, expect, it } from 'vitest';
import { BattlefieldPhaseUiPolicy } from './BattlefieldPhaseUiPolicy';

describe('BattlefieldPhaseUiPolicy', () => {
  const policy = new BattlefieldPhaseUiPolicy();

  it('shows editing controls only during defense preparation', () => {
    expect(policy.resolve('preparation')).toMatchObject({
      showMissionSummary: true,
      showDefenseDeck: true,
      showAttackDeck: false,
      showCommanderAbilities: false,
    });
    expect(policy.resolve('combat').showDefenseDeck).toBe(false);
  });

  it('shows the formation deck only while preparing an attack', () => {
    expect(policy.resolve('attack-preparation')).toMatchObject({
      showMissionSummary: true,
      showDefenseDeck: false,
      showAttackDeck: true,
      showCommanderAbilities: false,
    });
  });

  it('keeps only commander abilities during attack combat', () => {
    expect(policy.resolve('attack-combat')).toMatchObject({
      showMissionSummary: true,
      showDefenseDeck: false,
      showAttackDeck: false,
      showCommanderAbilities: true,
    });
    expect(policy.resolve('attack-combat').controls).toContain('WASD');
  });

  it('hides persistent panels while a dedicated overlay is visible', () => {
    for (const phase of [
      'tutorial',
      'result',
      'role-reversal',
      'attack-result',
      'campaign-complete',
    ] as const) {
      expect(policy.resolve(phase).showMissionSummary).toBe(false);
    }
  });
});
