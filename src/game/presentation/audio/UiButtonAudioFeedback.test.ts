import { describe, expect, it, vi } from 'vitest';
import {
  UiButtonAudioFeedback,
  type UiButtonFeedbackSource,
  type UiButtonSoundPlayer,
} from './UiButtonAudioFeedback';

class FakeFeedbackSource implements UiButtonFeedbackSource {
  private listener: ((tone: 'click' | 'confirm') => void) | null = null;

  public subscribe(listener: (tone: 'click' | 'confirm') => void): () => void {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  public emit(tone: 'click' | 'confirm'): void {
    this.listener?.(tone);
  }
}

describe('UiButtonAudioFeedback', () => {
  it('routes button tones to the shared UI sound player', () => {
    const source = new FakeFeedbackSource();
    const playUi = vi.fn<UiButtonSoundPlayer['playUi']>();
    const feedback = new UiButtonAudioFeedback(source, { playUi }, () => 100);

    feedback.start();
    source.emit('confirm');

    expect(playUi).toHaveBeenCalledWith('confirm');
  });

  it('limits rapid button sounds without blocking a later click', () => {
    const source = new FakeFeedbackSource();
    const playUi = vi.fn<UiButtonSoundPlayer['playUi']>();
    let now = 0;
    const feedback = new UiButtonAudioFeedback(source, { playUi }, () => now, 70);

    feedback.start();
    source.emit('click');
    now = 20;
    source.emit('confirm');
    now = 71;
    source.emit('click');

    expect(playUi.mock.calls).toEqual([['click'], ['click']]);
  });

  it('subscribes once and releases the source when stopped', () => {
    const source = new FakeFeedbackSource();
    const playUi = vi.fn<UiButtonSoundPlayer['playUi']>();
    const feedback = new UiButtonAudioFeedback(source, { playUi });

    feedback.start();
    feedback.start();
    source.emit('click');
    feedback.stop();
    source.emit('confirm');

    expect(playUi).toHaveBeenCalledTimes(1);
  });
});
