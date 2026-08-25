import type { FullscreenGateway } from '../../ports/FullscreenGateway';

export class BrowserFullscreenGateway implements FullscreenGateway {
  public constructor(
    private readonly documentRef: Document,
    private readonly target: HTMLElement,
  ) {}

  public get supported(): boolean {
    return (
      this.documentRef.fullscreenEnabled &&
      typeof this.target.requestFullscreen === 'function'
    );
  }

  public get active(): boolean {
    return this.documentRef.fullscreenElement === this.target;
  }

  public async enter(): Promise<boolean> {
    if (!this.supported) return false;
    if (!this.active) await this.target.requestFullscreen();
    return this.active;
  }

  public async toggle(): Promise<boolean> {
    if (!this.supported) return false;
    if (this.active) {
      await this.documentRef.exitFullscreen();
      return false;
    }
    return this.enter();
  }

  public onChange(listener: (active: boolean) => void): () => void {
    const handleChange = (): void => listener(this.active);
    this.documentRef.addEventListener('fullscreenchange', handleChange);
    return () =>
      this.documentRef.removeEventListener('fullscreenchange', handleChange);
  }
}
