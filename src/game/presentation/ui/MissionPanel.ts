import type Phaser from 'phaser';
import { TOY_UI, ToyUiFactory } from './ToyUiTheme';

export interface MissionPanelModel {
  readonly visible: boolean;
  readonly phaseLabel: string;
  readonly title: string;
  readonly objective: string;
  readonly stats: readonly string[];
  readonly warning?: boolean;
}

export class MissionPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly phaseChip: Phaser.GameObjects.Rectangle;
  private readonly phaseLabel: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Text;
  private readonly objective: Phaser.GameObjects.Text;
  private readonly stats: readonly Phaser.GameObjects.Text[];
  private readonly accent: Phaser.GameObjects.Rectangle;

  public constructor(scene: Phaser.Scene) {
    const ui = new ToyUiFactory(scene);
    const panelObjects = ui.createPaperPanel(264, 222, {
      accent: TOY_UI.teal,
      tape: false,
    });
    this.accent = scene.add.rectangle(0, 0, 8, 222, TOY_UI.teal, 1).setOrigin(0);
    this.phaseChip = ui.createChip(65, 25, 102, 26, TOY_UI.teal);
    this.phaseLabel = scene.add
      .text(65, 25, '', {
        color: '#fffdf3',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '11px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.title = scene.add.text(18, 48, '', {
      color: TOY_UI.ink,
      fontFamily: TOY_UI.fontFamily,
      fontSize: '20px',
      fontStyle: 'bold',
      wordWrap: { width: 228 },
    });
    this.objective = scene.add.text(18, 78, '', {
      color: TOY_UI.mutedInk,
      fontFamily: TOY_UI.fontFamily,
      fontSize: '12px',
      fontStyle: 'bold',
      lineSpacing: 2,
      wordWrap: { width: 228 },
    });

    const divider = scene.add.rectangle(132, 124, 226, 2, TOY_UI.paperDark, 1);
    const statViews = Array.from({ length: 3 }, (_, index) =>
      scene.add.text(20, 139 + index * 25, '', {
        color: TOY_UI.ink,
        fontFamily: TOY_UI.fontFamily,
        fontSize: index === 0 ? '15px' : '13px',
        fontStyle: 'bold',
        wordWrap: { width: 226 },
      }),
    );
    this.stats = statViews;

    this.container = scene.add
      .container(1004, 112, [
        ...panelObjects,
        this.accent,
        this.phaseChip,
        this.phaseLabel,
        this.title,
        this.objective,
        divider,
        ...statViews,
      ])
      .setDepth(50);
  }

  public render(model: MissionPanelModel): void {
    this.container.setVisible(model.visible);
    if (!model.visible) return;
    const accent = model.warning === true ? TOY_UI.coral : TOY_UI.teal;
    this.accent.setFillStyle(accent, 1);
    this.phaseChip.setFillStyle(accent, 0.98);
    this.phaseLabel.setText(model.phaseLabel);
    this.title.setText(model.title);
    this.objective.setText(model.objective);
    this.stats.forEach((view, index) => {
      const value = model.stats[index];
      view.setText(value === undefined ? '' : `${index === 0 ? '◆' : '•'}  ${value}`);
      view.setVisible(value !== undefined);
      view.setColor(model.warning === true && index === 0 ? '#a52323' : TOY_UI.ink);
    });
  }
}
