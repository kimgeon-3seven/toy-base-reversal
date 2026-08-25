import type Phaser from 'phaser';
import type { TowerArchetype } from '../../domain/combat/CombatArchetype';
import type { StructureKind } from '../../domain/structures/DefenseStructure';
import { TOWER_CONSTRUCTION_COSTS } from '../../config/ConstructionEconomyConfig';
import { TOWER_NAMES } from '../../config/ContentConfig';
import { TextButton } from './TextButton';
import { TOY_UI, ToyUiFactory } from './ToyUiTheme';

export interface DefenseBuildDeckModel {
  readonly activeKind: StructureKind;
  readonly activeTower: TowerArchetype;
  readonly availableTowers: readonly TowerArchetype[];
  readonly funds: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canUpgrade: boolean;
  readonly tutorialMode: boolean;
}

export interface DefenseBuildDeckActions {
  readonly selectTower: (tower: TowerArchetype) => void;
  readonly selectObstacle: () => void;
  readonly upgrade: () => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly save: () => void;
  readonly reset: () => void;
  readonly start: () => void;
}

const TOWERS: readonly TowerArchetype[] = ['popgun', 'mortar', 'piercer'];
const TOWER_MARKS: Readonly<Record<TowerArchetype, string>> = {
  popgun: '●',
  mortar: '◉',
  piercer: '➤',
};

export class DefenseBuildDeck {
  private readonly container: Phaser.GameObjects.Container;
  private readonly towerButtons: ReadonlyMap<TowerArchetype, TextButton>;
  private readonly obstacleButton: TextButton;
  private readonly upgradeButton: TextButton;
  private readonly undoButton: TextButton;
  private readonly redoButton: TextButton;
  private readonly saveButton: TextButton;
  private readonly resetButton: TextButton;
  private readonly startButton: TextButton;
  private readonly summary: Phaser.GameObjects.Text;

  public constructor(
    scene: Phaser.Scene,
    actions: DefenseBuildDeckActions,
  ) {
    const ui = new ToyUiFactory(scene);
    const panel = ui.createPaperPanel(960, 72, {
      accent: TOY_UI.coral,
      tape: false,
    });
    this.summary = scene.add.text(16, 7, '', {
      color: TOY_UI.mutedInk,
      fontFamily: TOY_UI.fontFamily,
      fontSize: '12px',
      fontStyle: 'bold',
    });

    const buttons: TextButton[] = [];
    const towerButtons = new Map<TowerArchetype, TextButton>();
    TOWERS.forEach((tower, index) => {
      const button = new TextButton(
        scene,
        63 + index * 113,
        43,
        106,
        42,
        '',
        () => actions.selectTower(tower),
      );
      towerButtons.set(tower, button);
      buttons.push(button);
    });
    this.towerButtons = towerButtons;

    this.obstacleButton = new TextButton(
      scene,
      402,
      43,
      106,
      42,
      '▦  블록 벽\n[4]',
      actions.selectObstacle,
    );
    this.upgradeButton = new TextButton(
      scene,
      492,
      43,
      60,
      42,
      '강화\n[U]',
      actions.upgrade,
    );
    this.undoButton = new TextButton(
      scene,
      558,
      43,
      54,
      42,
      '취소\n↶',
      actions.undo,
    );
    this.redoButton = new TextButton(
      scene,
      616,
      43,
      54,
      42,
      '다시\n↷',
      actions.redo,
    );
    this.saveButton = new TextButton(
      scene,
      677,
      43,
      58,
      42,
      '저장\n[S]',
      actions.save,
    );
    this.resetButton = new TextButton(
      scene,
      740,
      43,
      58,
      42,
      '저장점\n복구',
      actions.reset,
    );
    this.startButton = new TextButton(
      scene,
      875,
      43,
      160,
      42,
      '▶ 방어 시작\n[Space]',
      actions.start,
      {
        fill: TOY_UI.coral,
        hover: 0xf47768,
        stroke: TOY_UI.coralDark,
        text: '#fff7df',
      },
      'silent',
    );

    buttons.push(
      this.obstacleButton,
      this.upgradeButton,
      this.undoButton,
      this.redoButton,
      this.saveButton,
      this.resetButton,
      this.startButton,
    );
    this.container = scene.add.container(32, 706, [
      ...panel,
      ...buttons.map((button) => button.gameObject),
      this.summary,
    ]);
    this.container.setDepth(60);
  }

  public render(model: DefenseBuildDeckModel): void {
    for (const tower of TOWERS) {
      const button = this.towerButtons.get(tower);
      const available = model.availableTowers.includes(tower);
      button?.setVisible(!model.tutorialMode || tower === 'popgun');
      button?.setLabel(
        available
          ? `${TOWER_MARKS[tower]}  ${TOWER_NAMES[tower]}\n${TOWER_CONSTRUCTION_COSTS[tower]} 부품`
          : `◇  ${TOWER_NAMES[tower]}\n잠김`,
      );
      button?.setEnabled(available);
      button?.setSelected(
        model.activeKind === 'tower' && model.activeTower === tower,
      );
    }
    this.applyLayout(model.tutorialMode);
    this.obstacleButton.setSelected(model.activeKind === 'obstacle');
    this.upgradeButton.setEnabled(!model.tutorialMode && model.canUpgrade);
    this.undoButton.setEnabled(!model.tutorialMode && model.canUndo);
    this.redoButton.setEnabled(!model.tutorialMode && model.canRedo);
    this.summary.setText(
      model.tutorialMode
        ? `◆ 첫 설계 · ${model.funds} 부품  ·  빛나는 칸에 팝건 1개 또는 블록 벽 2개`
        : `◆ ${model.funds} 부품  ·  우클릭 판매 100% 환급`,
    );
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  private applyLayout(tutorialMode: boolean): void {
    this.towerButtons.get('popgun')?.gameObject.setX(tutorialMode ? 70 : 63);
    this.obstacleButton.gameObject.setX(tutorialMode ? 188 : 402);
    this.startButton.gameObject.setX(tutorialMode ? 848 : 875);
    for (const button of [
      this.upgradeButton,
      this.undoButton,
      this.redoButton,
      this.saveButton,
      this.resetButton,
    ]) {
      button.setVisible(!tutorialMode);
    }
  }
}
