import { describe, expect, it } from 'vitest';
import { BrowserFullscreenGateway } from './BrowserFullscreenGateway';

class FakeFullscreenDocument extends EventTarget {
  public fullscreenEnabled = true;
  public fullscreenElement: FakeFullscreenTarget | null = null;

  public async exitFullscreen(): Promise<void> {
    this.fullscreenElement = null;
    this.dispatchEvent(new Event('fullscreenchange'));
  }
}

class FakeFullscreenTarget {
  public constructor(private readonly documentRef: FakeFullscreenDocument) {}

  public async requestFullscreen(): Promise<void> {
    this.documentRef.fullscreenElement = this;
    this.documentRef.dispatchEvent(new Event('fullscreenchange'));
  }
}

describe('BrowserFullscreenGateway', () => {
  it('enters, reports and exits fullscreen through one target', async () => {
    const documentRef = new FakeFullscreenDocument();
    const target = new FakeFullscreenTarget(documentRef);
    const gateway = new BrowserFullscreenGateway(
      documentRef as unknown as Document,
      target as unknown as HTMLElement,
    );
    const states: boolean[] = [];
    gateway.onChange((active) => states.push(active));

    expect(gateway.supported).toBe(true);
    expect(await gateway.enter()).toBe(true);
    expect(await gateway.toggle()).toBe(false);
    expect(states).toEqual([true, false]);
  });

  it('gracefully reports unsupported fullscreen', async () => {
    const documentRef = new FakeFullscreenDocument();
    documentRef.fullscreenEnabled = false;
    const target = new FakeFullscreenTarget(documentRef);
    const gateway = new BrowserFullscreenGateway(
      documentRef as unknown as Document,
      target as unknown as HTMLElement,
    );

    expect(gateway.supported).toBe(false);
    expect(await gateway.enter()).toBe(false);
  });
});
