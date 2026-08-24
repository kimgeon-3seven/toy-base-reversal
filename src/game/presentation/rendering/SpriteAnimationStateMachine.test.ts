import { describe, expect, it } from 'vitest';
import { SpriteAnimationStateMachine } from './SpriteAnimationStateMachine';

describe('SpriteAnimationStateMachine', () => {
  it('prioritizes attack until its presentation window expires', () => {
    const machine = new SpriteAnimationStateMachine();
    machine.setMoving(true, 100, 48);
    machine.beginAttack(100, 320);

    expect(machine.resolve(300)).toBe('attack');
    expect(machine.resolve(420)).toBe('walk');
    machine.setMoving(false, 420, 48);
    expect(machine.resolve(467)).toBe('walk');
    expect(machine.resolve(468)).toBe('idle');
  });

  it('never shortens an active attack window', () => {
    const machine = new SpriteAnimationStateMachine();
    machine.beginAttack(100, 400);
    machine.beginAttack(200, 100);

    expect(machine.resolve(499)).toBe('attack');
    expect(machine.resolve(500)).toBe('idle');
  });

  it('bridges only short gaps reported by the domain movement state', () => {
    const machine = new SpriteAnimationStateMachine();
    machine.setMoving(true, 100, 48);

    expect(machine.resolve(100)).toBe('walk');
    machine.setMoving(false, 150, 48);
    expect(machine.resolve(197)).toBe('walk');
    expect(machine.resolve(198)).toBe('idle');

    machine.setMoving(true, 200, 48);
    expect(machine.resolve(200)).toBe('walk');
  });
});
