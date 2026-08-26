import { describe, expect, it } from 'vitest';
import { SwarmFormationOffsetPolicy } from './CombatantFormationOffsetPolicy';

describe('SwarmFormationOffsetPolicy', () => {
  it('separates consecutive clockwork units without changing logical positions', () => {
    const policy = new SwarmFormationOffsetPolicy(4);

    expect(policy.offsetFor('swarm', 'enemy-1')).toEqual({ x: 0, y: 4 });
    expect(policy.offsetFor('swarm', 'enemy-2')).toEqual({ x: 0, y: -4 });
    expect(policy.offsetFor('swarm', 'attacker-3')).toEqual({ x: 0, y: 4 });
  });

  it('does not offset shield soldiers or rubber-band rangers', () => {
    const policy = new SwarmFormationOffsetPolicy();

    expect(policy.offsetFor('tank', 'enemy-1')).toEqual({ x: 0, y: 0 });
    expect(policy.offsetFor('ranger', 'enemy-2')).toEqual({ x: 0, y: 0 });
  });

  it('rejects invalid presentation spacing', () => {
    expect(() => new SwarmFormationOffsetPolicy(-1)).toThrow(
      'Formation spacing must be a non-negative number.',
    );
  });
});
