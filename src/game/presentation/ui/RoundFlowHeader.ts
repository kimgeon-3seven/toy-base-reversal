import type Phaser from 'phaser';
import { TOY_UI, ToyUiFactory } from './ToyUiTheme';

export type RoundFlowStep = 'build' | 'defend' | 'reverse' | 'break';

export interface RoundFlowHeaderModel {
  readonly activeStep: RoundFlowStep;
  readonly roundLabel: string;
}

interface StepView {
  readonly key: RoundFlowStep;
  readonly background: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
}

const STEP_ORDER: readonly RoundFlowStep[] = ['build', 'defend', 'reverse', 'break'];
const STEP_LABELS: Readonly<Record<RoundFlowStep, string>> = {
  build: '설계',
  defend: '방어',
  reverse: '반전',
  break: '공략',
};

export class RoundFlowHeader {
  private readonly steps: readonly StepView[];
  private readonly roundText: Phaser.GameObjects.Text;

  public constructor(scene: Phaser.Scene) {
    const ui = new ToyUiFactory(scene);
    const children: Phaser.GameObjects.GameObject[] = [
      ...ui.createPaperPanel(432, 52, { accent: TOY_UI.teal, tape: false }),
    ];
    this.roundText = scene.add
      .text(14, 26, '', {
        color: TOY_UI.ink,
        fontFamily: TOY_UI.fontFamily,
        fontSize: '13px',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    children.push(this.roundText);

    const stepViews: StepView[] = [];
    STEP_ORDER.forEach((key, index) => {
      const x = 126 + index * 75;
      const background = ui.createChip(x, 26, 68, 32, TOY_UI.paperDark);
      const label = scene.add
        .text(x, 26, STEP_LABELS[key], {
          color: TOY_UI.mutedInk,
          fontFamily: TOY_UI.fontFamily,
          fontSize: '13px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      stepViews.push({ key, background, label });
      children.push(background, label);
    });
    this.steps = stepViews;
    scene.add.container(284, 18, children).setDepth(70);
  }

  public render(model: RoundFlowHeaderModel): void {
    this.roundText.setText(model.roundLabel);
    const activeIndex = STEP_ORDER.indexOf(model.activeStep);
    for (const step of this.steps) {
      const index = STEP_ORDER.indexOf(step.key);
      const isActive = step.key === model.activeStep;
      const isComplete = index < activeIndex;
      const fill = isActive
        ? step.key === 'reverse'
          ? TOY_UI.coral
          : TOY_UI.teal
        : isComplete
          ? 0x8fc7a9
          : TOY_UI.paperDark;
      step.background
        .setFillStyle(fill, 0.98)
        .setStrokeStyle(isActive ? 3 : 1, isActive ? TOY_UI.gold : 0xffffff, 0.72)
        .setScale(isActive ? 1.04 : 1);
      const textColor = isActive ? '#fffdf3' : isComplete ? '#23463a' : TOY_UI.mutedInk;
      step.label.setColor(textColor);
    }
  }
}
