import Phaser from 'phaser';
import {
  GRID_CELL_SIZE,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
} from '../../config/BattlefieldConfig';
import type { AttackUnitKind } from '../../domain/attack/SquadPlan';
import type { GridPosition } from '../../domain/grid/GridPosition';
import { AttackLaneTooltipPresenter } from '../models/AttackLaneTooltipPresenter';
import { TOY_UI } from '../ui/ToyUiTheme';

export interface AttackLanePlacementModel {
  readonly entryPoints: readonly GridPosition[];
  readonly hoveredPosition: GridPosition | null;
  readonly selectedLane: number;
  readonly selectedUnit: AttackUnitKind;
  readonly lanes: readonly (readonly AttackUnitKind[])[];
  readonly remainingPoints: number;
}

export class AttackLanePlacementRenderer {
  private readonly markers: Phaser.GameObjects.Graphics;
  private readonly popup: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly composition: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly presenter = new AttackLaneTooltipPresenter();

  public constructor(private readonly scene: Phaser.Scene) {
    this.markers = scene.add.graphics().setDepth(38);
    this.popup = scene.add.graphics().setDepth(46).setVisible(false);
    this.title = this.createText(48, '15px', TOY_UI.ink).setVisible(false);
    this.composition = this.createText(48, '13px', TOY_UI.mutedInk).setVisible(false);
    this.hint = this.createText(48, '12px', '#0b615a').setVisible(false);
  }

  public render(model: AttackLanePlacementModel | null): void {
    this.markers.clear();
    if (model === null) {
      this.hidePopup();
      return;
    }

    const hoveredLane = model.entryPoints.findIndex((entry) =>
      model.hoveredPosition?.equals(entry),
    );
    model.entryPoints.forEach((entry, laneIndex) => {
      const point = this.toWorld(entry);
      const isHovered = laneIndex === hoveredLane;
      const isSelected = laneIndex === model.selectedLane;
      this.markers.fillStyle(
        isHovered ? TOY_UI.teal : isSelected ? TOY_UI.coral : 0x173d3b,
        isHovered ? 0.32 : 0.18,
      );
      this.markers.fillCircle(point.x, point.y, isHovered ? 25 : 21);
      this.markers.lineStyle(
        isHovered ? 4 : isSelected ? 3 : 2,
        isHovered ? 0x9fe3c3 : isSelected ? TOY_UI.coral : 0xfff4d6,
        isHovered ? 1 : 0.82,
      );
      this.markers.strokeCircle(point.x, point.y, isHovered ? 25 : 21);
    });

    if (hoveredLane < 0) {
      this.hidePopup();
      return;
    }

    const lane = model.lanes[hoveredLane] ?? [];
    const hoveredEntry = model.entryPoints[hoveredLane];
    if (hoveredEntry === undefined) {
      this.hidePopup();
      return;
    }
    const presentation = this.presenter.present(
      hoveredLane,
      lane,
      model.selectedUnit,
      model.remainingPoints,
    );
    const point = this.toWorld(hoveredEntry);
    const popupX = point.x + 34;
    const popupY = Phaser.Math.Clamp(point.y - 50, GRID_OFFSET_Y + 4, 500);
    const width = 322;
    const height = 96;

    this.popup
      .clear()
      .fillStyle(TOY_UI.paper, 0.98)
      .fillRoundedRect(popupX, popupY, width, height, 10)
      .lineStyle(
        3,
        presentation.canAddSelectedUnit ? TOY_UI.teal : TOY_UI.coral,
        1,
      )
      .strokeRoundedRect(popupX, popupY, width, height, 10)
      .fillStyle(TOY_UI.shadow, 0.2)
      .fillRoundedRect(popupX + 5, popupY + height, width - 10, 5, 2)
      .setVisible(true);
    this.title
      .setPosition(popupX + 14, popupY + 11)
      .setText(presentation.title)
      .setVisible(true);
    this.composition
      .setPosition(popupX + 14, popupY + 39)
      .setText(presentation.composition)
      .setVisible(true);
    this.hint
      .setPosition(popupX + 14, popupY + 65)
      .setColor(presentation.canAddSelectedUnit ? '#0b615a' : '#a52323')
      .setText(presentation.hint)
      .setVisible(true);
  }

  private createText(
    depth: number,
    fontSize: string,
    color: string,
  ): Phaser.GameObjects.Text {
    return this.scene.add
      .text(0, 0, '', {
        color,
        fontFamily: TOY_UI.fontFamily,
        fontSize,
        fontStyle: 'bold',
      })
      .setDepth(depth);
  }

  private hidePopup(): void {
    this.popup.clear().setVisible(false);
    this.title.setVisible(false);
    this.composition.setVisible(false);
    this.hint.setVisible(false);
  }

  private toWorld(position: GridPosition): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      GRID_OFFSET_X + position.column * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
      GRID_OFFSET_Y + position.row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
    );
  }
}
