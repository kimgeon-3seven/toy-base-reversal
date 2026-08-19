import { describe, expect, it } from 'vitest';
import { TutorialSequence, type TutorialStep } from './TutorialSequence';

const STEPS: readonly TutorialStep[] = [
  { title: '방어', body: '설계합니다.', objective: '코어를 지키세요.' },
  { title: '공격', body: '역공합니다.', objective: '코어를 파괴하세요.' },
];

describe('TutorialSequence', () => {
  it('exposes tutorial steps in order', () => {
    const tutorial = new TutorialSequence(STEPS);

    expect(tutorial.currentStep).toBe(STEPS[0]);
    expect(tutorial.currentStepNumber).toBe(1);
    expect(tutorial.stepCount).toBe(2);
    expect(tutorial.advance()).toBe(false);
    expect(tutorial.currentStep).toBe(STEPS[1]);
    expect(tutorial.advance()).toBe(true);
    expect(tutorial.currentStep).toBeNull();
  });

  it('can skip the remaining tutorial', () => {
    const tutorial = new TutorialSequence(STEPS);

    tutorial.skip();

    expect(tutorial.isComplete).toBe(true);
    expect(tutorial.currentStep).toBeNull();
  });

  it('rejects an empty tutorial', () => {
    expect(() => new TutorialSequence([])).toThrow(
      'Tutorial sequence requires at least one step.',
    );
  });
});
