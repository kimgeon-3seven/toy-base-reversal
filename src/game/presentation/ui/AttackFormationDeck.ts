import type Phaser from 'phaser';
import type { AttackUnitKind } from '../../domain/attack/SquadPlan';
import { attackUnitCost } from '../../domain/attack/SquadPlan';
import { UNIT_NAMES } from '../../config/ContentConfig';
import { TextButton } from './TextButton';
import { TOY_UI, ToyUiFactory } from './ToyUiTheme';

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
  tank: '◆ 방패',
  swarm: '● 군단',
  ranger: '➤ 사수',
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
    const ui = new ToyUiFactory(scene);
    const panel = ui.createPaperPanel(940, 150, {
      accent: TOY_UI.teal,
      tape: false,
    });
    const title = scene.add.text(18, 10, '공격 편성', {
      color: '#0b615a',
      fontFamily: TOY_UI.fontFamily,
      fontSize: '17px',
      fontStyle: 'bold',
    });
    this.budgetText = scene.add
      .text(920, 9, '', {
        align: 'right',
        backgroundColor: '#dce9d2',
        color: '#0b615a',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '14px',
        fontStyle: 'bold',
        padding: { x: 9, y: 4 },
      })
      .setOrigin(1, 0);

    const unitButtons = new Map<AttackUnitKind, TextButton>();
    const buttons: TextButton[] = [];
    UNITS.forEach((unit, index) => {
      const button = new TextButton(
        scene,
        96 + index * 164,
        43,
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
      43,
      130,
      32,
      '추천 편성 [P]',
      actions.recommend,
    );
    const clearButton = new TextButton(
      scene,
      707,
      43,
      100,
      32,
      '전체 비우기',
      actions.clear,
    );
    this.startButton = new TextButton(
      scene,
      849,
      43,
      160,
      32,
      '▶ 공격 시작 [Space]',
      actions.start,
      {
        fill: TOY_UI.teal,
        hover: 0x22b7a6,
        stroke: TOY_UI.tealDark,
        text: '#f4fffb',
      },
      'silent',
    );
    buttons.push(recommendButton, clearButton, this.startButton);

    const laneTexts: Phaser.GameObjects.Text[] = [];
    const addButtons: TextButton[] = [];
    const removeButtons: TextButton[] = [];
    for (let laneIndex = 0; laneIndex < 3; laneIndex += 1) {
      const y = 76 + laneIndex * 25;
      const queue = scene.add.text(126, y - 9, '', {
        color: TOY_UI.ink,
        fontFamily: TOY_UI.fontFamily,
        fontSize: '12px',
      });
      const add = new TextButton(
        scene,
        756,
        y,
        110,
        23,
        '+ 선택 유닛',
        () => actions.addUnit(laneIndex),
      );
      const remove = new TextButton(
        scene,
        874,
        y,
        110,
        23,
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
      scene.add.text(20, 67 + laneIndex * 25, `${laneIndex + 1}번 진입로`, {
        color: '#9d332e',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '13px',
        fontStyle: 'bold',
      }),
    );
    this.container = scene.add.container(42, 636, [
      ...panel,
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
          ? `${UNIT_MARKS[unit]}  ${UNIT_NAMES[unit]} · ${attackUnitCost(unit)}P`
          : `◇ ${UNIT_NAMES[unit]} · 잠김`,
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
