import type Phaser from 'phaser';

export type UiButtonFeedbackTone = 'click' | 'confirm' | 'silent';

export const UI_BUTTON_FEEDBACK_EVENT = 'toy-ui-button-feedback';

export function emitUiButtonFeedback(
  scene: Phaser.Scene,
  tone: UiButtonFeedbackTone,
): void {
  if (tone === 'silent') return;
  scene.events.emit(UI_BUTTON_FEEDBACK_EVENT, tone);
}
