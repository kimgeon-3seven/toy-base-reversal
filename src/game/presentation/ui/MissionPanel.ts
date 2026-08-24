import type Phaser from 'phaser';
import { TOY_UI, ToyUiFactory } from './ToyUiTheme';

export interface MissionPanelModel {
  readonly phaseLabel: string;
  readonly title: string;
  readonly objective: string;
  readonly stats: readonly string[];
  readonly selection?: string;
  readonly tip: string;
  readonly warning?: boolean;
}

export class MissionPanel {
  private readonly phaseChip: Phaser.GameObjects.Rectangle;
  private readonly phaseLabel: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Text;
  private readonly objective: Phaser.GameObjects.Text;
  private readonly stats: readonly Phaser.GameObjects.Text[];
  private readonly selection: Phaser.GameObjects.Text;
  private readonly tip: Phaser.GameObjects.Text;
  private readonly accent: Phaser.GameObjects.Rectangle;

  public constructor(scene: Phaser.Scene) {
    const ui = new ToyUiFactory(scene);
    const panelObjects = ui.createPaperPanel(264, 424, {
      accent: TOY_UI.teal,
      tape: true,
    });
    this.accent = scene.add.rectangle(0, 0, 9, 424, TOY_UI.teal, 1).setOrigin(0);
    this.phaseChip = ui.createChip(67, 30, 106, 28, TOY_UI.teal);
    this.phaseLabel = scene.add
      .text(67, 30, '', {
        color: '#fffdf3',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '12px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.title = scene.add.text(22, 56, '', {
      color: TOY_UI.ink,
      fontFamily: TOY_UI.fontFamily,
      fontSize: '23px',
      fontStyle: 'bold',
      wordWrap: { width: 220 },
    });
    this.objective = scene.add.text(22, 91, '', {
      color: TOY_UI.mutedInk,
      fontFamily: TOY_UI.fontFamily,
      fontSize: '14px',
      fontStyle: 'bold',
      lineSpacing: 3,
      wordWrap: { width: 220 },
    });

    const divider = scene.add.rectangle(132, 145, 220, 2, TOY_UI.paperDark, 1);
    const statViews = Array.from({ length: 4 }, (_, index) =>
      scene.add.text(24, 160 + index * 32, '', {
        color: TOY_UI.ink,
        fontFamily: TOY_UI.fontFamily,
        fontSize: index === 0 ? '16px' : '14px',
        fontStyle: 'bold',
        wordWrap: { width: 216 },
      }),
    );
    this.stats = statViews;
    this.selection = scene.add.text(22, 293, '', {
      backgroundColor: '#dce9d2',
      color: TOY_UI.ink,
      fontFamily: TOY_UI.fontFamily,
      fontSize: '13px',
      fontStyle: 'bold',
      lineSpacing: 3,
      padding: { x: 10, y: 8 },
      wordWrap: { width: 198 },
    });
    this.tip = scene.add.text(22, 365, '', {
      color: '#0b615a',
      fontFamily: TOY_UI.fontFamily,
      fontSize: '13px',
      fontStyle: 'bold',
      lineSpacing: 3,
      wordWrap: { width: 218 },
    });

    scene.add
      .container(1004, 112, [
        ...panelObjects,
        this.accent,
        this.phaseChip,
        this.phaseLabel,
        this.title,
        this.objective,
        divider,
        ...statViews,
        this.selection,
        this.tip,
      ])
      .setDepth(50);
  }

  public render(model: MissionPanelModel): void {
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
    this.selection.setText(model.selection ?? '자동으로 준비됨');
    this.tip.setText(`다음 행동  ${model.tip.replaceAll('\n', ' · ')}`);
    this.tip.setColor(model.warning === true ? '#a52323' : '#0b615a');
  }
}
