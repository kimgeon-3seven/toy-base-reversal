import { describe, expect, it } from 'vitest';
import type {
  PageActivityListener,
  PageActivityMonitor,
} from '../ports/PageActivityMonitor';
import { PageActivityCoordinator } from './PageActivityCoordinator';

class FakePageActivityMonitor implements PageActivityMonitor {
  public isActive = true;
  public subscribeCount = 0;
  public unsubscribeCount = 0;
  private listener: PageActivityListener | null = null;

  public subscribe(listener: PageActivityListener): () => void {
    this.subscribeCount += 1;
    this.listener = listener;
    return () => {
      this.unsubscribeCount += 1;
      this.listener = null;
    };
  }

  public publish(active: boolean): void {
    this.isActive = active;
    this.listener?.(active);
  }
}

describe('PageActivityCoordinator', () => {
  it('routes activity changes and starts only one subscription', () => {
    const monitor = new FakePageActivityMonitor();
    const events: string[] = [];
    const coordinator = new PageActivityCoordinator(monitor, {
      deactivate: () => events.push('inactive'),
      activate: () => events.push('active'),
    });

    coordinator.start();
    coordinator.start();
    monitor.publish(false);
    monitor.publish(true);

    expect(monitor.subscribeCount).toBe(1);
    expect(events).toEqual(['inactive', 'active']);
  });

  it('applies an initially inactive state and removes its listener on stop', () => {
    const monitor = new FakePageActivityMonitor();
    monitor.isActive = false;
    let inactiveCount = 0;
    const coordinator = new PageActivityCoordinator(monitor, {
      deactivate: () => {
        inactiveCount += 1;
      },
      activate: () => undefined,
    });

    coordinator.start();
    coordinator.stop();
    monitor.publish(false);

    expect(inactiveCount).toBe(1);
    expect(monitor.unsubscribeCount).toBe(1);
  });
});
