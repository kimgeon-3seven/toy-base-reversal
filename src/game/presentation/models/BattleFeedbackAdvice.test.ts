import { describe, expect, it } from 'vitest';
import { BattleFeedbackAdvisor } from './BattleFeedbackAdvice';

describe('BattleFeedbackAdvisor', () => {
  const advisor = new BattleFeedbackAdvisor();

  it('explains heavy leaks after a defense loss', () => {
    expect(
      advisor.forDefense({
        won: false,
        defeatedEnemies: 4,
        breachedEnemies: 4,
        remainingCoreHealth: 0,
        coreMaxHealth: 120,
        survivingStructures: 2,
        startingStructures: 4,
      }),
    ).toContain('누수');
  });

  it('connects core preservation to the next attack reward', () => {
    expect(
      advisor.forDefense({
        won: true,
        defeatedEnemies: 7,
        breachedEnemies: 1,
        remainingCoreHealth: 40,
        coreMaxHealth: 120,
        survivingStructures: 4,
        startingStructures: 4,
      }),
    ).toContain('공격 부대');
  });

  it('gives a commander-specific correction', () => {
    expect(advisor.forAttack(false, 'commander-defeated')).toContain('일반 유닛 뒤');
  });

  it('recommends focus fire after a timeout', () => {
    expect(advisor.forAttack(false, 'time-limit')).toContain('집중 공격');
  });
});
