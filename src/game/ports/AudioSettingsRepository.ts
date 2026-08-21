export interface AudioSettingsSnapshot {
  readonly musicVolume: number;
  readonly effectsVolume: number;
  readonly muted: boolean;
}

export interface AudioSettingsRepository {
  load(): AudioSettingsSnapshot | null;
  save(settings: AudioSettingsSnapshot): void;
}
