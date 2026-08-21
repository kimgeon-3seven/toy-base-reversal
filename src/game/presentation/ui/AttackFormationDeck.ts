import type Phaser from 'phaser';
import type { AttackUnitKind } from '../../domain/attack/SquadPlan';
import { attackUnitCost } from '../../domain/attack/SquadPlan';
import { GAME_COLORS } from '../../config/GameConfig';
import { UNIT_NAMES } from '../../config/ContentConfig';
import { TextButton } from './TextButton';

export interface AttackFormationDeckModel {
  readonly selectedUnit: AttackUnitKind;
  readonly availableUnits: readonly AttackUnitKind[];
  readonly lanes: readonly (readonly AttackUnitKind[])[];
  readonly remainingPoints: number;
  readonly totalPoints: number;
}

export interface AttackFormationDeckActions {
  readonly selectUnit: (unit: AttackUnitKind) => void;
  readonly addUnit: (laneIndex: number) => void;
  readonly removeUnit: (laneIndex: number) => void;
  readonly recommend: () => void;
  readonly clear: () => void;
  readonly start: () => void;
}

const UNITS: readonly AttackUnitKind[] = ['tank', 'swarm', 'ranger'];
const UNIT_MARKS: Readonly<Record<AttackUnitKind, string>> = {
  tank: '방패',
  swarm: '군단',
  ranger: '사수',
};

export class AttackFormationDeck {
  private readonly container: Phaser.GameObjects.Container;
  private readonly unitButtons: ReadonlyMap<AttackUnitKind, TextButton>;
  private readonly addButtons: readonly TextButton[];
  private readonly removeButtons: readonly TextButton[];
  private readonly laneTexts: readonly Phaser.GameObjects.Text[];
  private readonly budgetText: Phaser.GameObjects.Text;
  private readonly startButton: TextButton;

  public constructor(
    scene: Phaser.Scene,
    actions: AttackFormationDeckActions,
  ) {
    const panel = scene.add
      .rectangle(0, 0, 940, 180, 0x171321, 0.97)
      .setOrigin(0)
      .setStrokeStyle(3, 0x9fe3c3, 0.96);
    const title = scene.add.text(20, 14, '공격 편성 보드', {
      color: GAME_COLORS.primary,
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
    });
    this.budgetText = scene.add
      .text(920, 17, '', {
        align: 'right',
        color: GAME_COLORS.secondary,
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0);

    const unitButtons = new Map<AttackUnitKind, TextButton>();
    const buttons: TextButton[] = [];
    UNITS.forEach((unit, index) => {
      const button = new TextButton(
        scene,
        96 + index * 164,
        50,
        154,
        32,
        '',
        () => actions.selectUnit(unit),
      );
      unitButtons.set(unit, button);
      buttons.push(button);
    });
    this.unitButtons = unitButtons;

    const recommendButton = new TextButton(
      scene,
      583,
      50,
      130,
      32,
      '추천 편성 [P]',
      actions.recommend,
    );
    const clearButton = new TextButton(
      scene,
      707,
      50,
      100,
      32,
      '전체 비우기',
      actions.clear,
    );
    this.startButton = new TextButton(
      scene,
      849,
      50,
      160,
      32,
      '공격 시작 [Space]',
      actions.start,
      {
        fill: 0x1f675b,
        hover: 0x2d8c7d,
        stroke: 0x9fe3c3,
        text: '#f4fffb',
      },
    );
    buttons.push(recommendButton, clearButton, this.startButton);

    const laneTexts: Phaser.GameObjects.Text[] = [];
    const addButtons: TextButton[] = [];
    const removeButtons: TextButton[] = [];
    for (let laneIndex = 0; laneIndex < 3; laneIndex += 1) {
      const y = 88 + laneIndex * 36;
      const queue = scene.add.text(126, y - 9, '', {
        color: '#f8f4e8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
      });
      const add = new TextButton(
        scene,
        756,
        y,
        110,
        28,
        '+ 선택 유닛',
        () => actions.addUnit(laneIndex),
      );
      const remove = new TextButton(
        scene,
        874,
        y,
        110,
        28,
        '마지막 제거',
        () => actions.removeUnit(laneIndex),
      );
      laneTexts.push(queue);
      addButtons.push(add);
      removeButtons.push(remove);
      buttons.push(add, remove);
    }
    this.laneTexts = laneTexts;
    this.addButtons = addButtons;
    this.removeButtons = removeButtons;

    const laneLabels = Array.from({ length: 3 }, (_, laneIndex) =>
      scene.add.text(20, 79 + laneIndex * 36, `${laneIndex + 1}번 진입로`, {
        color: GAME_COLORS.primary,
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
      }),
    );
    this.container = scene.add.container(42, 520, [
      panel,
      title,
      this.budgetText,
      ...laneLabels,
      ...laneTexts,
      ...buttons.map((button) => button.gameObject),
    ]);
    this.container.setDepth(60);
  }

  public render(model: AttackFormationDeckModel): void {
    this.budgetText.setText(
      `출격 포인트 ${model.remainingPoints} / ${model.totalPoints}`,
    );
    for (const unit of UNITS) {
      const button = this.unitButtons.get(unit);
      const available = model.availableUnits.includes(unit);
      button?.setLabel(
        available
          ? `${UNIT_NAMES[unit]} · ${attackUnitCost(unit)}P`
          : `${UNIT_NAMES[unit]} · 잠김`,
      );
      button?.setEnabled(available);
      button?.setSelected(model.selectedUnit === unit);
    }
    model.lanes.forEach((lane, laneIndex) => {
      const summary = this.summarizeLane(lane);
      this.laneTexts[laneIndex]?.setText(
        lane.length === 0 ? '비어 있음' : `${summary}  ·  총 ${lane.length}명`,
      );
      this.addButtons[laneIndex]?.setEnabled(
        model.remainingPoints >= attackUnitCost(model.selectedUnit),
      );
      this.removeButtons[laneIndex]?.setEnabled(lane.length > 0);
    });
    this.startButton.setEnabled(model.lanes.some((lane) => lane.length > 0));
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  private summarizeLane(lane: readonly AttackUnitKind[]): string {
    return UNITS.map((unit) => ({
      unit,
      count: lane.filter((candidate) => candidate === unit).length,
    }))
      .filter(({ count }) => count > 0)
      .map(({ unit, count }) => `${UNIT_MARKS[unit]}×${count}`)
      .join('  ');
  }
}
