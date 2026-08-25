export interface WebEntryReadyActions {
  readonly start: () => void;
  readonly startFullscreen: () => void;
}

export interface WebEntryGameActions {
  readonly toggleFullscreen: () => void;
}

export interface WebEntryView {
  showLoading(progress: number): void;
  showReady(
    fullscreenSupported: boolean,
    actions: WebEntryReadyActions,
  ): void;
  showStarting(): void;
  showGame(
    fullscreenSupported: boolean,
    actions: WebEntryGameActions,
  ): void;
  showFailure(message: string, retry: () => void): void;
  updateFullscreen(active: boolean): void;
}
