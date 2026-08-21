export interface FirstRunGuideRepository {
  isCompleted(): boolean;
  markCompleted(): void;
}
