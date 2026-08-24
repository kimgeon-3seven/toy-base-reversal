import { describe, expect, it } from 'vitest';
import { SpriteAnimationStateMachine } from './SpriteAnimationStateMachine';

describe('SpriteAnimationStateMachine', () => {
  it('prioritizes attack until its presentation window expires', () => {
    const machine = new SpriteAnimationStateMachine();
    machine.beginAttack(100, 320);

    expect(machine.resolve(300, true)).toBe('attack');
    expect(machine.resolve(420, true)).toBe('walk');
    expect(machine.resolve(420, false)).toBe('idle');
  });

  it('never shortens an active attack window', () => {
    const machine = new SpriteAnimationStateMachine();
    machine.beginAttack(100, 400);
    machine.beginAttack(200, 100);

    expect(machine.resolve(499, false)).toBe('attack');
    expect(machine.resolve(500, false)).toBe('idle');
  });
});
