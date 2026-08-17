export interface CoreLeakDamagePolicy {
  damageForCost(unitCost: number): number;
}

export class TieredCoreLeakDamagePolicy implements CoreLeakDamagePolicy {
  private readonly damageByCost: ReadonlyMap<number, number>;

  public constructor(damageByCost: Readonly<Record<number, number>>) {
    const entries = Object.entries(damageByCost).map(([cost, damage]) => [
      Number(cost),
      damage,
    ] as const);
    if (
      entries.length === 0 ||
      entries.some(
        ([cost, damage]) =>
          !Number.isInteger(cost) || cost <= 0 || !Number.isFinite(damage) || damage <= 0,
      )
    ) {
      throw new Error('Core leak damage tiers must use positive costs and damage.');
    }

    this.damageByCost = new Map(entries);
  }

  public damageForCost(unitCost: number): number {
    const damage = this.damageByCost.get(unitCost);
    if (damage === undefined) {
      throw new Error(`Core leak damage is not configured for unit cost ${unitCost}.`);
    }
    return damage;
  }
}
