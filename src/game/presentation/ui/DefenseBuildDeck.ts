import type Phaser from 'phaser';
import type { TowerArchetype } from '../../domain/combat/CombatArchetype';
import type { StructureKind } from '../../domain/structures/DefenseStructure';
import { GAME_COLORS } from '../../config/GameConfig';
import { TOWER_CONSTRUCTION_COSTS } from '../../config/ConstructionEconomyConfig';
import { TOWER_NAMES } from '../../config/ContentConfig';
import { TextButton } from './TextButton';

export interface DefenseBuildDeckModel {
  readonly activeKind: StructureKind;
  readonly activeTower: TowerArchetype;
  readonly availableTowers: readonly TowerArchetype[];
  readonly funds: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canUpgrade: boolean;
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

export class DefenseBuildDeck {
  private readonly container: Phaser.GameObjects.Container;
  private readonly towerButtons: ReadonlyMap<TowerArchetype, TextButton>;
  private readonly obstacleButton: TextButton;
  private readonly upgradeButton: TextButton;
  private readonly undoButton: TextButton;
  private readonly redoButton: TextButton;
  private readonly summary: Phaser.GameObjects.Text;

  public constructor(
    scene: Phaser.Scene,
    actions: DefenseBuildDeckActions,
  ) {
    const panel = scene.add
      .rectangle(0, 0, 960, 68, 0x171321, 0.97)
      .setOrigin(0)
      .setStrokeStyle(2, 0x554b78, 0.95);
    this.summary = scene.add.text(12, 50, '', {
      color: GAME_COLORS.secondary,
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    });

    const buttons: TextButton[] = [];
    const towerButtons = new Map<TowerArchetype, TextButton>();
    TOWERS.forEach((tower, index) => {
      const button = new TextButton(
        scene,
        61 + index * 114,
        27,
        108,
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
      403,
      27,
      108,
      42,
      '[4] 블록 벽',
      actions.selectObstacle,
    );
    this.upgradeButton = new TextButton(
      scene,
      486,
      27,
      50,
      42,
      '강화\n[U]',
      actions.upgrade,
    );
    this.undoButton = new TextButton(
      scene,
      542,
      27,
      50,
      42,
      '취소\n↶',
      actions.undo,
    );
    this.redoButton = new TextButton(
      scene,
      598,
      27,
      50,
      42,
      '다시\n↷',
      actions.redo,
    );
    const saveButton = new TextButton(
      scene,
      661,
      27,
      66,
      42,
      '저장\n[S]',
      actions.save,
    );
    const resetButton = new TextButton(
      scene,
      733,
      27,
      66,
      42,
      '저장점\n복구',
      actions.reset,
    );
    const startButton = new TextButton(
      scene,
      856,
      27,
      170,
      42,
      '방어 시작  [Space]',
      actions.start,
      {
        fill: 0x70501d,
        hover: 0x9b7028,
        stroke: 0xffd166,
        text: '#fff7df',
      },
    );

    buttons.push(
      this.obstacleButton,
      this.upgradeButton,
      this.undoButton,
      this.redoButton,
      saveButton,
      resetButton,
      startButton,
    );
    this.container = scene.add.container(32, 707, [
      panel,
      ...buttons.map((button) => button.gameObject),
      this.summary,
    ]);
    this.container.setDepth(60);
  }

  public render(model: DefenseBuildDeckModel): void {
    for (const tower of TOWERS) {
      const button = this.towerButtons.get(tower);
      const available = model.availableTowers.includes(tower);
      button?.setLabel(
        available
          ? `${TOWER_NAMES[tower]}\n${TOWER_CONSTRUCTION_COSTS[tower]} 부품`
          : `${TOWER_NAMES[tower]}\n잠김`,
      );
      button?.setEnabled(available);
      button?.setSelected(
        model.activeKind === 'tower' && model.activeTower === tower,
      );
    }
    this.obstacleButton.setSelected(model.activeKind === 'obstacle');
    this.upgradeButton.setEnabled(model.canUpgrade);
    this.undoButton.setEnabled(model.canUndo);
    this.redoButton.setEnabled(model.canRedo);
    this.summary.setText(`보유 ${model.funds} 부품 · 우클릭 판매는 전액 환급`);
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}
