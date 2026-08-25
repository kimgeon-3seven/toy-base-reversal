export interface FullscreenGateway {
  readonly supported: boolean;
  readonly active: boolean;
  enter(): Promise<boolean>;
  toggle(): Promise<boolean>;
  onChange(listener: (active: boolean) => void): () => void;
}
