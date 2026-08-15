import Phaser from 'phaser';
import { DefenseEditor } from '../../application/DefenseEditor';
import {
  CORE_POSITION,
  createBattlefieldMap,
  GRID_CELL_SIZE,
  GRID_COLUMNS,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  GRID_ROWS,
} from '../../config/BattlefieldConfig';
import {
  ATTACK_PREPARATION_DURATION_MS,
  createPrototypeAttackCombatConfig,
  createPrototypeSquadPlan,
} from '../../config/AttackCombatConfig';
import {
  createPrototypeDefenseCombatConfig,
  createPrototypeDefenseWave,
  PREPARATION_DURATION_MS,
} from '../../config/DefenseCombatConfig';
import { GAME_COLORS, GAME_HEIGHT } from '../../config/GameConfig';
import { Battlefield } from '../../domain/battlefield/Battlefield';
import type { BattlefieldFailureReason } from '../../domain/battlefield/BattlefieldResult';
import { AttackCombat } from '../../domain/attack/AttackCombat';
import type { AttackUnitKind, SquadPlan } from '../../domain/attack/SquadPlan';
import { DefenseCombat } from '../../domain/combat/DefenseCombat';
import { GridPosition } from '../../domain/grid/GridPosition';
import { BreadthFirstPathfinder } from '../../domain/pathfinding/BreadthFirstPathfinder';
import { RoundSession } from '../../domain/rounds/RoundSession';
import type { StructureKind } from '../../domain/structures/DefenseStructure';

const STRUCTURE_COLORS: Readonly<Record<StructureKind, number>> = {
  tower: 0xffc857,
  obstacle: 0xb8a1d9,
};

const PATH_COLORS = [0x59c3c3, 0xff8c61, 0x8bd17c] as const;
type DefenseScenePhase =
  | 'preparation'
  | 'combat'
  | 'result'
  | 'attack-preparation'
  | 'attack-combat'
  | 'attack-result'
  | 'campaign-complete';

export class BattlefieldScene extends Phaser.Scene {
  private editor!: DefenseEditor;
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private structureGraphics!: Phaser.GameObjects.Graphics;
  private enemyGraphics!: Phaser.GameObjects.Graphics;
  private attackerGraphics!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private selectionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private combatInfoText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private activeKind: StructureKind = 'tower';
  private selectedStructureId: string | null = null;
  private phase: DefenseScenePhase = 'preparation';
  private preparationRemainingMs = PREPARATION_DURATION_MS;
  private combat: DefenseCombat | null = null;
  private squadPlan: SquadPlan | null = null;
  private attackCombat: AttackCombat | null = null;
  private attackPreparationRemainingMs = ATTACK_PREPARATION_DURATION_MS;
  private roundSession = new RoundSession(5);
  private selectedAttackLane = 1;
  private selectedAttackUnitKind: AttackUnitKind = 'tank';
  private commanderMoveKeys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  public constructor() {
    super({ key: 'BattlefieldScene' });
  }

  public create(): void {
    this.roundSession = new RoundSession(5);
    const battlefield = new Battlefield(
      createBattlefieldMap(),
      new BreadthFirstPathfinder(),
    );
    this.editor = new DefenseEditor(battlefield);

    this.seedInitialDesign();
    this.editor.saveBlueprint();

    this.cameras.main.setBackgroundColor(GAME_COLORS.background);
    this.input.mouse?.disableContextMenu();
    if (this.input.keyboard === null) {
      throw new Error('Keyboard input is required for the prototype.');
    }
    this.commanderMoveKeys = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.createStaticInterface();
    this.pathGraphics = this.add.graphics();
    this.boardGraphics = this.add.graphics();
    this.structureGraphics = this.add.graphics();
    this.enemyGraphics = this.add.graphics();
    this.attackerGraphics = this.add.graphics();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });

    this.configureKeyboardInput();
    this.renderBattlefield();
    this.setStatus('설계를 편집해 보세요. 모든 진입로는 항상 열려 있어야 합니다.');
  }

  public update(_time: number, delta: number): void {
    if (this.phase === 'preparation') {
      this.preparationRemainingMs = Math.max(
        0,
        this.preparationRemainingMs - delta,
      );
      this.updatePhaseInterface();
      if (this.preparationRemainingMs === 0) {
        this.startDefenseCombat();
      }
      return;
    }

    if (this.phase === 'attack-preparation') {
      this.attackPreparationRemainingMs = Math.max(
        0,
        this.attackPreparationRemainingMs - delta,
      );
      this.updatePhaseInterface();
      if (this.attackPreparationRemainingMs === 0) {
        this.startAttackCombat();
      }
      return;
    }

    if (this.phase === 'attack-combat' && this.attackCombat !== null) {
      this.handleCommanderMovement();
      this.attackCombat.update(delta);
      this.renderBattlefield();
      this.updatePhaseInterface();
      if (this.attackCombat.state !== 'running') {
        this.finishAttackCombat();
      }
      return;
    }

    if (this.phase !== 'combat' || this.combat === null) {
      return;
    }

    this.combat.update(delta);
    this.renderBattlefield();
    this.updatePhaseInterface();

    if (this.combat.state !== 'running') {
      this.finishDefenseCombat();
    }
  }

  private seedInitialDesign(): void {
    this.editor.place('tower', new GridPosition(7, 4));
    this.editor.place('tower', new GridPosition(11, 8));
    this.editor.place('tower', new GridPosition(16, 4));
    this.editor.place('obstacle', new GridPosition(13, 6));
  }

  private createStaticInterface(): void {
    this.add.text(32, 24, '4단계 · 5라운드 순환 프로토타입', {
      color: GAME_COLORS.primary,
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
    });

    this.add.text(32, 70, '방어와 역공을 반복해 5라운드 장난감 전쟁을 완수하세요.', {
      color: GAME_COLORS.text,
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
    });

    this.add
      .rectangle(1124, GAME_HEIGHT / 2 + 12, 264, 676, GAME_COLORS.panel)
      .setStrokeStyle(2, 0x554b78);

    this.add.text(1020, 94, '설계 도구', {
      color: GAME_COLORS.primary,
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
    });

    this.selectionText = this.add.text(1020, 142, '', {
      color: GAME_COLORS.secondary,
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      lineSpacing: 8,
    });

    this.helpText = this.add.text(
      1020,
      220,
      [
        '[1] 공격 타워',
        '[2] 장애물',
        '',
        '왼쪽 클릭',
        '  배치 / 선택 / 이동',
        '',
        '오른쪽 클릭',
        '  시설 판매',
        '',
        '[Delete] 선택 시설 파괴',
        '[S] 현재 설계 저장',
        '[R] 저장 설계 복원',
        '[Space] 방어전 시작',
        '',
        '청록·주황·초록 선은',
        '각 진입로의 최단 경로입니다.',
      ].join('\n'),
      {
        color: '#d9d3e8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        lineSpacing: 6,
      },
    );

    this.statusText = this.add.text(32, 724, '', {
      color: GAME_COLORS.secondary,
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      wordWrap: { width: 930 },
    });

    this.phaseText = this.add.text(1020, 650, '', {
      color: GAME_COLORS.primary,
      fontFamily: 'Arial, sans-serif',
      fontSize: '19px',
      fontStyle: 'bold',
    });

    this.combatInfoText = this.add.text(1020, 682, '', {
      color: GAME_COLORS.text,
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      lineSpacing: 5,
    });

    this.resultText = this.add
      .text(512, 414, '', {
        align: 'center',
        backgroundColor: '#171321ee',
        color: GAME_COLORS.primary,
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        padding: { x: 34, y: 24 },
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);

    this.updatePhaseInterface();
  }

  private configureKeyboardInput(): void {
    this.input.keyboard?.on('keydown-ONE', () => {
      if (this.phase === 'attack-preparation') {
        this.selectedAttackUnitKind = 'tank';
        this.setStatus('탱커 선택: Q/W/E로 진입로 대기열에 추가합니다.');
        this.updatePhaseInterface();
        return;
      }
      if (this.phase !== 'preparation') {
        return;
      }
      this.activeKind = 'tower';
      this.selectedStructureId = null;
      this.setStatus('공격 타워 배치 모드');
      this.renderBattlefield();
    });

    this.input.keyboard?.on('keydown-TWO', () => {
      if (this.phase === 'attack-preparation') {
        this.selectedAttackUnitKind = 'ranger';
        this.setStatus('원거리 병사 선택: Q/W/E로 진입로 대기열에 추가합니다.');
        this.updatePhaseInterface();
        return;
      }
      if (this.phase !== 'preparation') {
        return;
      }
      this.activeKind = 'obstacle';
      this.selectedStructureId = null;
      this.setStatus('장애물 배치 모드');
      this.renderBattlefield();
    });

    this.input.keyboard?.on('keydown-S', () => {
      if (this.phase !== 'preparation') {
        return;
      }
      this.editor.saveBlueprint();
      this.setStatus('현재 방어 설계를 저장했습니다.');
    });

    this.input.keyboard?.on('keydown-R', () => {
      if (this.phase === 'attack-result') {
        if (this.attackCombat?.state === 'lost') {
          this.startAttackPreparation();
        }
        return;
      }
      if (this.phase === 'campaign-complete') {
        this.restartCampaign();
        return;
      }
      if (this.phase === 'result') {
        this.resetToPreparation();
        return;
      }

      if (this.phase !== 'preparation') {
        return;
      }

      const restored = this.editor.restoreBlueprint();
      this.selectedStructureId = null;
      this.setStatus(
        restored
          ? '저장한 설계를 복원하고 모든 시설 체력을 초기화했습니다.'
          : '복원할 설계가 없습니다.',
      );
      this.renderBattlefield();
    });

    this.input.keyboard?.on('keydown-DELETE', () => {
      if (this.phase !== 'preparation') {
        return;
      }
      if (this.selectedStructureId === null) {
        this.setStatus('먼저 파괴할 시설을 선택하세요.', true);
        return;
      }

      this.editor.destroy(this.selectedStructureId);
      this.selectedStructureId = null;
      this.setStatus('선택한 시설을 파괴했습니다. 열린 경로를 다시 계산했습니다.');
      this.renderBattlefield();
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.phase === 'preparation') {
        this.startDefenseCombat();
      } else if (this.phase === 'attack-preparation') {
        this.startAttackCombat();
      }
    });

    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.phase === 'result' && this.combat?.state === 'won') {
        this.startAttackPreparation();
      } else if (
        this.phase === 'attack-result' &&
        this.attackCombat?.state === 'won'
      ) {
        this.continueAfterAttackVictory();
      }
    });

    this.input.keyboard?.on('keydown-Q', () => {
      if (this.phase === 'attack-preparation') {
        this.addUnitToLane(0);
      } else if (this.phase === 'attack-combat') {
        const activated = this.attackCombat?.activateRally() ?? false;
        this.setStatus(
          activated ? '집결! 부대가 지휘관 주변으로 모입니다.' : '집결 재사용 대기 중입니다.',
          !activated,
        );
      }
    });

    this.input.keyboard?.on('keydown-W', () => {
      if (this.phase === 'attack-preparation') {
        this.addUnitToLane(1);
      }
    });

    this.input.keyboard?.on('keydown-E', () => {
      if (this.phase === 'attack-preparation') {
        this.addUnitToLane(2);
      } else if (this.phase === 'attack-combat') {
        const towerId = this.attackCombat?.activateDisrupt() ?? null;
        this.setStatus(
          towerId === null
            ? '교란할 타워가 범위에 없거나 재사용 대기 중입니다.'
            : `교란 성공: ${towerId} 타워를 일시 무력화했습니다.`,
          towerId === null,
        );
      }
    });

    this.input.keyboard?.on('keydown-C', () => {
      if (this.phase !== 'attack-preparation' || this.squadPlan === null) return;
      const nextLane = (this.squadPlan.commanderLane + 1) % 3;
      this.squadPlan.setCommanderLane(nextLane);
      this.setStatus(`지휘관 출발 진입로를 ${nextLane + 1}번으로 변경했습니다.`);
      this.updatePhaseInterface();
    });

    this.input.keyboard?.on('keydown-BACKSPACE', () => {
      if (this.phase !== 'attack-preparation' || this.squadPlan === null) return;
      const removed = this.squadPlan.removeLastUnit(this.selectedAttackLane);
      this.setStatus(
        removed === null
          ? '선택한 진입로의 대기열이 비어 있습니다.'
          : '대기열의 마지막 유닛을 제거하고 재화를 돌려받았습니다.',
        removed === null,
      );
      this.updatePhaseInterface();
    });
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.phase !== 'preparation') {
      return;
    }

    const gridPosition = this.pointerToGrid(pointer);
    if (gridPosition === null) {
      return;
    }

    const existing = this.editor.battlefield.findStructureAt(gridPosition);

    if (pointer.rightButtonDown()) {
      if (existing === null) {
        this.setStatus('판매할 시설이 없는 칸입니다.', true);
        return;
      }

      this.editor.sell(existing.id);
      if (this.selectedStructureId === existing.id) {
        this.selectedStructureId = null;
      }
      this.setStatus('시설을 판매했습니다. 해당 칸이 이동 경로로 열렸습니다.');
      this.renderBattlefield();
      return;
    }

    if (existing !== null) {
      this.selectedStructureId = existing.id;
      this.setStatus('시설을 선택했습니다. 빈 칸을 클릭하면 무료로 재배치합니다.');
      this.renderBattlefield();
      return;
    }

    const result =
      this.selectedStructureId === null
        ? this.editor.place(this.activeKind, gridPosition)
        : this.editor.move(this.selectedStructureId, gridPosition);

    if (!result.success) {
      this.flashInvalidCell(gridPosition);
      this.setStatus(this.failureMessage(result.reason), true);
      return;
    }

    this.selectedStructureId = null;
    this.setStatus('설계를 변경하고 세 진입로의 경로를 다시 계산했습니다.');
    this.renderBattlefield();
  }

  private pointerToGrid(pointer: Phaser.Input.Pointer): GridPosition | null {
    const column = Math.floor((pointer.worldX - GRID_OFFSET_X) / GRID_CELL_SIZE);
    const row = Math.floor((pointer.worldY - GRID_OFFSET_Y) / GRID_CELL_SIZE);
    const position = new GridPosition(column, row);
    return this.editor.battlefield.map.contains(position) ? position : null;
  }

  private renderBattlefield(): void {
    this.renderPaths();
    this.renderGrid();
    this.renderStructures();
    this.renderEnemies();
    this.renderAttackers();

    const selected =
      this.selectedStructureId === null
        ? null
        : this.editor.battlefield.structures.find(
            (structure) => structure.id === this.selectedStructureId,
          );
    const kindName = this.activeKind === 'tower' ? '공격 타워' : '장애물';
    if (this.phase === 'attack-preparation' && this.squadPlan !== null) {
      this.selectionText.setText(
        `선택 유닛: ${this.selectedAttackUnitKind === 'tank' ? '탱커' : '원거리'}\n남은 공격 재화: ${this.squadPlan.remainingBudget}`,
      );
      return;
    }

    this.selectionText.setText(
      this.phase !== 'preparation'
        ? `전투 상태: ${this.phase === 'combat' || this.phase === 'attack-combat' ? '진행 중' : '종료'}\n남은 시설: ${this.editor.battlefield.structures.length}`
        : selected === undefined || selected === null
        ? `현재 도구: ${kindName}\n시설 수: ${this.editor.battlefield.structures.length}`
        : `선택: ${selected.kind === 'tower' ? '공격 타워' : '장애물'}\n체력: ${selected.health}/${selected.maxHealth}`,
    );
  }

  private renderPaths(): void {
    this.pathGraphics.clear();
    const paths = this.editor.battlefield.pathsFromEveryEntry();

    paths.forEach((path, index) => {
      const pathColor = PATH_COLORS[index] ?? PATH_COLORS[0];
      this.pathGraphics.lineStyle(5, pathColor, 0.42);
      path.forEach((position, pathIndex) => {
        const point = this.gridCenter(position);
        if (pathIndex === 0) {
          this.pathGraphics.beginPath();
          this.pathGraphics.moveTo(point.x, point.y);
        } else {
          this.pathGraphics.lineTo(point.x, point.y);
        }
      });
      this.pathGraphics.strokePath();
    });
  }

  private renderGrid(): void {
    this.boardGraphics.clear();

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let column = 0; column < GRID_COLUMNS; column += 1) {
        const x = GRID_OFFSET_X + column * GRID_CELL_SIZE;
        const y = GRID_OFFSET_Y + row * GRID_CELL_SIZE;
        const position = new GridPosition(column, row);

        if (this.editor.battlefield.map.isReserved(position)) {
          this.boardGraphics.fillStyle(0x30334d, 0.72);
          this.boardGraphics.fillRect(x + 1, y + 1, GRID_CELL_SIZE - 2, GRID_CELL_SIZE - 2);
        }

        this.boardGraphics.lineStyle(1, 0x56506f, 0.8);
        this.boardGraphics.strokeRect(x, y, GRID_CELL_SIZE, GRID_CELL_SIZE);
      }
    }

    for (const entry of this.editor.battlefield.map.entryPoints) {
      const center = this.gridCenter(entry);
      this.boardGraphics.fillStyle(0x59c3c3, 1);
      this.boardGraphics.fillTriangle(
        center.x - 11,
        center.y - 13,
        center.x - 11,
        center.y + 13,
        center.x + 13,
        center.y,
      );
    }

    const coreCenter = this.gridCenter(CORE_POSITION);
    const coreRatio =
      this.phase === 'attack-combat' || this.phase === 'attack-result'
        ? (this.attackCombat?.coreHealthRatio ?? 1)
        : (this.combat?.coreHealthRatio ?? 1);
    this.boardGraphics.fillStyle(coreRatio > 0.4 ? 0x8bd17c : 0xff6b6b, 1);
    this.boardGraphics.fillCircle(coreCenter.x, coreCenter.y, 17);
    this.boardGraphics.lineStyle(3, 0xd8ffd0, 1);
    this.boardGraphics.strokeCircle(coreCenter.x, coreCenter.y, 17);
  }

  private renderStructures(): void {
    this.structureGraphics.clear();

    for (const structure of this.editor.battlefield.structures) {
      const center = this.gridCenter(structure.position);
      const isSelected = structure.id === this.selectedStructureId;
      this.structureGraphics.fillStyle(STRUCTURE_COLORS[structure.kind], 1);

      if (structure.kind === 'tower') {
        this.structureGraphics.fillCircle(center.x, center.y, 15);
        this.structureGraphics.fillStyle(0x4a3a20, 1);
        this.structureGraphics.fillRect(center.x - 4, center.y - 22, 8, 15);
      } else {
        this.structureGraphics.fillRoundedRect(
          center.x - 17,
          center.y - 17,
          34,
          34,
          7,
        );
      }

      if (isSelected) {
        this.structureGraphics.lineStyle(4, 0xffffff, 1);
        this.structureGraphics.strokeRect(
          center.x - 21,
          center.y - 21,
          42,
          42,
        );
      }

      if (
        structure.kind === 'tower' &&
        this.attackCombat?.isTowerDisabled(structure.id)
      ) {
        this.structureGraphics.lineStyle(4, 0x4de1c1, 1);
        this.structureGraphics.strokeCircle(center.x, center.y, 22);
      }

      if (this.phase === 'combat' || this.phase === 'attack-combat') {
        const healthRatio = structure.health / structure.maxHealth;
        this.structureGraphics.fillStyle(0x251f32, 1);
        this.structureGraphics.fillRect(center.x - 18, center.y + 21, 36, 5);
        this.structureGraphics.fillStyle(
          healthRatio > 0.45 ? 0x8bd17c : 0xff6b6b,
          1,
        );
        this.structureGraphics.fillRect(
          center.x - 18,
          center.y + 21,
          36 * healthRatio,
          5,
        );
      }
    }
  }

  private renderEnemies(): void {
    this.enemyGraphics.clear();
    if (this.combat === null) {
      return;
    }

    for (const enemy of this.combat.enemies) {
      const x =
        GRID_OFFSET_X +
        enemy.renderColumn * GRID_CELL_SIZE +
        GRID_CELL_SIZE / 2;
      const y =
        GRID_OFFSET_Y + enemy.renderRow * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;

      this.enemyGraphics.fillStyle(0xff6b6b, 1);
      this.enemyGraphics.fillTriangle(x - 13, y - 12, x - 13, y + 12, x + 14, y);
      this.enemyGraphics.lineStyle(2, 0xffd6d6, 1);
      this.enemyGraphics.strokeCircle(x, y, 15);

      this.enemyGraphics.fillStyle(0x251f32, 1);
      this.enemyGraphics.fillRect(x - 15, y - 21, 30, 4);
      this.enemyGraphics.fillStyle(0xff8b8b, 1);
      this.enemyGraphics.fillRect(x - 15, y - 21, 30 * enemy.healthRatio, 4);
    }
  }

  private renderAttackers(): void {
    this.attackerGraphics.clear();
    if (this.attackCombat === null) return;

    for (const unit of this.attackCombat.units) {
      const x = GRID_OFFSET_X + unit.renderColumn * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
      const y = GRID_OFFSET_Y + unit.renderRow * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
      this.attackerGraphics.fillStyle(unit.kind === 'tank' ? 0x5da9e9 : 0xf4a6d7, 1);
      if (unit.kind === 'tank') {
        this.attackerGraphics.fillRoundedRect(x - 15, y - 14, 30, 28, 7);
      } else {
        this.attackerGraphics.fillCircle(x, y, 12);
        this.attackerGraphics.lineStyle(3, 0xffe0f3, 1);
        this.attackerGraphics.strokeCircle(x, y, 12);
      }
      this.drawHealthBar(this.attackerGraphics, x, y - 20, unit.healthRatio, 30);
    }

    const commander = this.attackCombat.commander;
    const center = this.gridCenter(commander.position);
    this.attackerGraphics.fillStyle(0x4de1c1, 1);
    this.attackerGraphics.fillCircle(center.x, center.y, 17);
    this.attackerGraphics.lineStyle(4, 0xe0fff8, 1);
    this.attackerGraphics.strokeCircle(center.x, center.y, 19);
    this.attackerGraphics.fillStyle(0x173a42, 1);
    this.attackerGraphics.fillTriangle(
      center.x,
      center.y - 11,
      center.x - 9,
      center.y + 8,
      center.x + 9,
      center.y + 8,
    );
    this.drawHealthBar(
      this.attackerGraphics,
      center.x,
      center.y - 27,
      commander.healthRatio,
      38,
    );

    if (this.attackCombat.isRallyActive) {
      this.attackerGraphics.lineStyle(3, 0x4de1c1, 0.7);
      this.attackerGraphics.strokeCircle(center.x, center.y, GRID_CELL_SIZE * 2.2);
    }
  }

  private drawHealthBar(
    graphics: Phaser.GameObjects.Graphics,
    centerX: number,
    y: number,
    ratio: number,
    width: number,
  ): void {
    graphics.fillStyle(0x251f32, 1);
    graphics.fillRect(centerX - width / 2, y, width, 4);
    graphics.fillStyle(ratio > 0.4 ? 0x8bd17c : 0xff6b6b, 1);
    graphics.fillRect(centerX - width / 2, y, width * ratio, 4);
  }

  private gridCenter(position: GridPosition): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      GRID_OFFSET_X + position.column * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
      GRID_OFFSET_Y + position.row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
    );
  }

  private flashInvalidCell(position: GridPosition): void {
    const center = this.gridCenter(position);
    const warning = this.add
      .rectangle(center.x, center.y, GRID_CELL_SIZE - 4, GRID_CELL_SIZE - 4)
      .setStrokeStyle(4, 0xff5d73)
      .setFillStyle(0xff5d73, 0.25);

    this.tweens.add({
      targets: warning,
      alpha: 0,
      duration: 500,
      onComplete: () => warning.destroy(),
    });
  }

  private failureMessage(reason: BattlefieldFailureReason): string {
    const messages: Readonly<Record<BattlefieldFailureReason, string>> = {
      'outside-map': '전장 밖에는 시설을 배치할 수 없습니다.',
      'reserved-cell': '진입점과 코어 보호 구역에는 시설을 배치할 수 없습니다.',
      'occupied-cell': '이미 다른 시설이 있는 칸입니다.',
      'structure-not-found': '선택한 시설을 찾을 수 없습니다.',
      'path-blocked': '모든 진입점에 경로가 남아야 합니다. 완전한 길막은 허용되지 않습니다.',
    };
    return messages[reason];
  }

  private startDefenseCombat(): void {
    if (this.phase !== 'preparation') {
      return;
    }

    this.editor.saveBlueprint();
    this.selectedStructureId = null;
    this.combat = new DefenseCombat(
      this.editor.battlefield,
      createPrototypeDefenseWave(this.roundSession.currentRound),
      createPrototypeDefenseCombatConfig(),
    );
    this.phase = 'combat';
    this.resultText.setVisible(false);
    this.setStatus('방어전 시작! 타워가 자동으로 공격하며 적은 시설과 코어를 노립니다.');
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private finishDefenseCombat(): void {
    if (this.combat === null || this.phase !== 'combat') {
      return;
    }

    this.phase = 'result';
    const won = this.combat.state === 'won';
    if (won && !this.roundSession.isDefenseComplete) {
      this.roundSession.recordDefenseVictory({
        defeatedEnemies: this.combat.killCount,
        remainingCoreHealth: this.combat.coreHealth,
      });
    }
    this.resultText
      .setColor(won ? GAME_COLORS.secondary : '#ff7b8f')
      .setText(
        `${this.roundSession.currentRound}라운드 ${won ? '방어 성공' : '방어 실패'}\n처치 ${this.combat.killCount} · 코어 ${this.combat.coreHealth}/${this.combat.config.coreMaxHealth}\n${won ? 'Enter: 공격 준비' : 'R: 설계 복원'}`,
      )
      .setVisible(true);
    this.setStatus(
      won
        ? '웨이브를 모두 막았습니다. 저장된 설계는 다음 단계에서도 유지됩니다.'
        : '코어가 파괴되었습니다. R 키를 누르면 전투 전 설계를 복원합니다.',
      !won,
    );
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private startAttackPreparation(): void {
    this.editor.restoreBlueprint();
    this.combat = null;
    this.attackCombat = null;
    this.squadPlan = createPrototypeSquadPlan(this.roundSession.currentRound);
    this.phase = 'attack-preparation';
    this.attackPreparationRemainingMs = ATTACK_PREPARATION_DURATION_MS;
    this.selectedAttackLane = 1;
    this.selectedAttackUnitKind = 'tank';
    this.resultText.setVisible(false);
    this.setStatus('공격 부대를 편성하세요. 자신이 만든 방어선을 그대로 상대합니다.');
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private addUnitToLane(laneIndex: number): void {
    if (this.squadPlan === null) return;
    this.selectedAttackLane = laneIndex;
    const added = this.squadPlan.addUnit(laneIndex, this.selectedAttackUnitKind);
    this.setStatus(
      added
        ? `${laneIndex + 1}번 진입로 대기열에 유닛을 추가했습니다.`
        : '공격 재화가 부족합니다.',
      !added,
    );
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private startAttackCombat(): void {
    if (this.phase !== 'attack-preparation' || this.squadPlan === null) return;
    const unitCount = this.squadPlan.lanes.reduce(
      (total, lane) => total + lane.length,
      0,
    );
    if (unitCount === 0) {
      this.setStatus('최소 한 명의 일반 유닛을 편성해야 합니다.', true);
      return;
    }

    this.attackCombat = new AttackCombat(
      this.editor.battlefield,
      this.squadPlan,
      createPrototypeAttackCombatConfig(this.roundSession.currentRound),
    );
    this.phase = 'attack-combat';
    this.resultText.setVisible(false);
    this.setStatus('공격 시작! WASD로 지휘관을 이동하고 Q 집결, E 교란을 사용하세요.');
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private handleCommanderMovement(): void {
    if (this.attackCombat === null) return;
    const keys = this.commanderMoveKeys;
    let moved = false;
    if (Phaser.Input.Keyboard.JustDown(keys.up)) {
      moved = this.attackCombat.moveCommander(0, -1);
    } else if (Phaser.Input.Keyboard.JustDown(keys.down)) {
      moved = this.attackCombat.moveCommander(0, 1);
    } else if (Phaser.Input.Keyboard.JustDown(keys.left)) {
      moved = this.attackCombat.moveCommander(-1, 0);
    } else if (Phaser.Input.Keyboard.JustDown(keys.right)) {
      moved = this.attackCombat.moveCommander(1, 0);
    }
    if (moved) this.renderBattlefield();
  }

  private finishAttackCombat(): void {
    if (this.attackCombat === null || this.phase !== 'attack-combat') return;
    this.phase = 'attack-result';
    const won = this.attackCombat.state === 'won';
    const completedRound = won
      ? this.roundSession.recordAttackVictory(this.attackCombat.elapsedTimeMs)
      : null;
    const failure =
      this.attackCombat.failureReason === 'commander-defeated'
        ? '지휘관 전투 불능'
        : '제한시간 초과';
    this.resultText
      .setColor(won ? GAME_COLORS.secondary : '#ff7b8f')
      .setText(
        `${won ? `${this.roundSession.currentRound}라운드 완료` : '공격 실패'}\n${won ? `돌파 ${this.formatTime(completedRound?.attackTimeMs ?? 0)}` : failure}\n${won ? 'Enter: 계속' : 'R: 공격 준비 재시작'}`,
      )
      .setVisible(true);
    this.setStatus(
      won
        ? `자신이 만든 방어선을 돌파했습니다. 누적 공격 시간 ${this.formatTime(this.roundSession.totalAttackTimeMs)}.`
        : '지휘관이 쓰러지거나 제한시간이 끝나면 공격에 실패합니다.',
      !won,
    );
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private resetToPreparation(): void {
    this.editor.restoreBlueprint();
    this.combat = null;
    this.phase = 'preparation';
    this.preparationRemainingMs = PREPARATION_DURATION_MS;
    this.selectedStructureId = null;
    this.resultText.setVisible(false);
    this.setStatus('전투 전 설계와 시설 체력을 복원했습니다. 다시 편집할 수 있습니다.');
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private continueAfterAttackVictory(): void {
    if (this.phase !== 'attack-result' || this.attackCombat?.state !== 'won') {
      return;
    }
    if (this.roundSession.isNormalModeComplete) {
      this.showCampaignComplete();
      return;
    }
    this.roundSession.advanceToNextRound();
    this.resetToPreparation();
    this.setStatus(
      `${this.roundSession.currentRound}라운드 시작. 이전 방어 설계를 이어서 재배치할 수 있습니다.`,
    );
  }

  private showCampaignComplete(): void {
    this.phase = 'campaign-complete';
    this.resultText
      .setColor(GAME_COLORS.secondary)
      .setText(
        `일반 모드 완료\n5라운드 누적 ${this.formatTime(this.roundSession.totalAttackTimeMs)}\n아이가 없는 동안, 장난감들의 전쟁은 계속된다.\n\n챌린지 모드 · 다음 단계에서 개방\nR: 처음부터 다시 시작`,
      )
      .setVisible(true);
    this.setStatus('부모님의 식사 호출에 아이가 방을 나갑니다. 장난감들이 스스로 움직이기 시작합니다.');
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private restartCampaign(): void {
    this.roundSession = new RoundSession(5);
    this.editor.restoreBlueprint();
    this.resetToPreparation();
    this.setStatus('새로운 5라운드 장난감 전쟁을 시작합니다.');
  }

  private formatTime(milliseconds: number): string {
    return `${(milliseconds / 1000).toFixed(1)}초`;
  }

  private updatePhaseInterface(): void {
    if (this.phase === 'campaign-complete') {
      this.phaseText.setText('일반 모드 완료');
      this.combatInfoText.setText(
        [
          `완료: ${this.roundSession.completedRounds.length}/${this.roundSession.normalRoundCount}`,
          `누적: ${this.formatTime(this.roundSession.totalAttackTimeMs)}`,
          '다음: 챌린지 모드',
        ].join('\n'),
      );
      this.helpText.setText('[R] 일반 모드 다시 시작');
      return;
    }

    if (this.phase === 'preparation') {
      this.phaseText.setText(
        `${this.roundSession.currentRound}/${this.roundSession.normalRoundCount}R 방어 준비 ${Math.ceil(this.preparationRemainingMs / 1000)}초`,
      );
      this.combatInfoText.setText('Space: 즉시 시작');
      this.helpText.setText(this.defenseHelpText());
      return;
    }

    if (this.phase === 'attack-preparation' && this.squadPlan !== null) {
      this.phaseText.setText(
        `${this.roundSession.currentRound}/${this.roundSession.normalRoundCount}R 공격 준비 ${Math.ceil(this.attackPreparationRemainingMs / 1000)}초`,
      );
      this.combatInfoText.setText(
        [
          `재화: ${this.squadPlan.remainingBudget}/${this.squadPlan.totalBudget}`,
          `대기열: ${this.squadPlan.lanes.map((lane) => lane.length).join(' / ')}`,
          `지휘관: ${this.squadPlan.commanderLane + 1}번 진입로`,
        ].join('\n'),
      );
      this.helpText.setText(this.attackPreparationHelpText());
      return;
    }

    if (
      (this.phase === 'attack-combat' || this.phase === 'attack-result') &&
      this.attackCombat !== null
    ) {
      this.phaseText.setText(
        `${this.roundSession.currentRound}/${this.roundSession.normalRoundCount}R ${this.phase === 'attack-combat' ? '공격 전투' : '공격 종료'}`,
      );
      this.combatInfoText.setText(
        [
          `적 코어: ${this.attackCombat.coreHealth}/${this.attackCombat.config.coreMaxHealth}`,
          `지휘관: ${this.attackCombat.commander.health}/${this.attackCombat.commander.maxHealth}`,
          `부대: ${this.attackCombat.units.length} (+${this.attackCombat.remainingSpawnCount})`,
          `시간: ${Math.ceil(this.attackCombat.remainingTimeMs / 1000)}초`,
        ].join('\n'),
      );
      this.helpText.setText(this.attackCombatHelpText());
      return;
    }

    if (this.combat === null) {
      return;
    }

    this.phaseText.setText(
      `${this.roundSession.currentRound}/${this.roundSession.normalRoundCount}R ${this.phase === 'combat' ? '방어 전투' : '방어 종료'}`,
    );
    this.combatInfoText.setText(
      [
        `코어: ${this.combat.coreHealth}/${this.combat.config.coreMaxHealth}`,
        `적: ${this.combat.enemies.length} (+${this.combat.remainingSpawnCount})`,
        `처치: ${this.combat.killCount}`,
      ].join('\n'),
    );
    this.helpText.setText(this.defenseHelpText());
  }

  private defenseHelpText(): string {
    return [
      '[1] 공격 타워  [2] 장애물',
      '왼쪽 클릭: 배치 / 선택 / 이동',
      '오른쪽 클릭: 시설 판매',
      '[Delete] 선택 시설 파괴',
      '[S] 설계 저장  [R] 복원',
      '[Space] 방어전 시작',
      '',
      '세 색상의 선은 각 진입로의',
      '최단 이동 경로입니다.',
    ].join('\n');
  }

  private attackPreparationHelpText(): string {
    return [
      '[1] 탱커  [2] 원거리',
      '[Q/W/E] 상/중/하 진입로 추가',
      '[Backspace] 선택 진입로 제거',
      '[C] 지휘관 진입로 변경',
      '[Space] 공격 시작',
      '',
      '진입로별 처음 2명은 동시에',
      '나머지는 대기열에서 출격합니다.',
    ].join('\n');
  }

  private attackCombatHelpText(): string {
    return [
      '[W/A/S/D] 지휘관 이동',
      '[Q] 집결',
      '  부대를 지휘관 주변으로 유도',
      '[E] 교란',
      '  가까운 타워 일시 무력화',
      '',
      '일반 유닛은 자동으로 이동하고',
      '시설과 코어를 공격합니다.',
      '지휘관 사망 시 즉시 실패합니다.',
    ].join('\n');
  }

  private setStatus(message: string, isWarning = false): void {
    this.statusText.setColor(isWarning ? '#ff7b8f' : GAME_COLORS.secondary);
    this.statusText.setText(message);
  }
}
