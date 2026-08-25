export type PageActivityListener = (active: boolean) => void;

export interface PageActivityMonitor {
  readonly isActive: boolean;
  subscribe(listener: PageActivityListener): () => void;
}
