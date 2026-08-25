export interface WebEntryLaunchActions {
  readonly activateAudio: () => Promise<void>;
  readonly launch: () => void;
}

export interface WebEntryFlow {
  loading(progress?: number): void;
  reportProgress(progress: number): void;
  ready(actions: WebEntryLaunchActions): void;
  failed(message: string, retry: () => void): void;
}
