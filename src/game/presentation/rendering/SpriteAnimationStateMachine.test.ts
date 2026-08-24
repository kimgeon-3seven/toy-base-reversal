import { describe, expect, it } from 'vitest';
import { SpriteAnimationStateMachine } from './SpriteAnimationStateMachine';

describe('SpriteAnimationStateMachine', () => {
  it('prioritizes attack until its presentation window expires', () => {
    const machine = new SpriteAnimationStateMachine();
    machine.observeMovement(100, 500);
    machine.beginAttack(100, 320);

    expect(machine.resolve(300)).toBe('attack');
    expect(machine.resolve(420)).toBe('walk');
    expect(machine.resolve(600)).toBe('idle');
  });

  it('never shortens an active attack window', () => {
    const machine = new SpriteAnimationStateMachine();
    machine.beginAttack(100, 400);
    machine.beginAttack(200, 100);

    expect(machine.resolve(499)).toBe('attack');
    expect(machine.resolve(500)).toBe('idle');
  });

  it('keeps walking briefly across small movement gaps', () => {
    const machine = new SpriteAnimationStateMachine();
    machine.observeMovement(100, 140);

    expect(machine.resolve(100)).toBe('walk');
    expect(machine.resolve(239)).toBe('walk');
    expect(machine.resolve(240)).toBe('idle');
  });
});
