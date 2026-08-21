import Phaser from 'phaser';
import { DefenseEditor } from '../../application/DefenseEditor';
import type { AudioSettingsService } from '../../application/AudioSettingsService';
import type { GameRecordService } from '../../application/GameRecordService';
import type {
  LeaderboardResult,
  LeaderboardService,
} from '../../application/LeaderboardService';
import type { FirstRunGuide } from '../../application/FirstRunGuide';
import type { FirstRunGuideService } from '../../application/FirstRunGuideService';
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
} from '../../config/AttackCombatConfig';
import {
  createPrototypeSquadPlan,
  SIMULTANEOUS_CAPACITY_PER_LANE,
  SQUAD_SPAWN_INTERVAL_MS,
} from '../../config/AttackSquadConfig';
import {
  createPrototypeDefenseCombatConfig,
  createPrototypeDefenseWave,
  PREPARATION_DURATION_MS,
} from '../../config/DefenseCombatConfig';
import { GAME_COLORS, GAME_HEIGHT, GAME_WIDTH } from '../../config/GameConfig';
import { INITIAL_DEFENSE_PLACEMENTS } from '../../config/InitialDefenseConfig';
import {
  isTowerAvailable,
  isUnitAvailable,
  towerCounterSummary,
  TOWER_NAMES,
  unitCounterSummary,
  UNIT_NAMES,
} from '../../config/ContentConfig';
import {
  createPrototypeConstructionEconomy,
  OBSTACLE_CONSTRUCTION_COST,
  ROUND_CONSTRUCTION_REWARD,
  TOWER_CONSTRUCTION_COSTS,
} from '../../config/ConstructionEconomyConfig';
import {
  createPrototypeTowerUpgradePolicy,
  MAX_TOWER_LEVEL,
} from '../../config/TowerUpgradeConfig';
import { NORMAL_MODE_ROUND_COUNT } from '../../config/ChallengeModeConfig';
import { firstRunGuidePromptFor } from '../../config/FirstRunGuideConfig';
import { Battlefield } from '../../domain/battlefield/Battlefield';
import type { DefenseEditFailureReason } from '../../application/DefenseEditResult';
import { AttackCombat } from '../../domain/attack/AttackCombat';
import {
  attackUnitCost,
  type AttackUnitKind,
  type SquadPlan,
} from '../../domain/attack/SquadPlan';
import { DefenseCombat } from '../../domain/combat/DefenseCombat';
import type { TowerArchetype } from '../../domain/combat/CombatArchetype';
import { GridPosition } from '../../domain/grid/GridPosition';
import { BreadthFirstPathfinder } from '../../domain/pathfinding/BreadthFirstPathfinder';
import { RoundSession } from '../../domain/rounds/RoundSession';
import type { PlayerRecord } from '../../domain/records/PlayerRecord';
import type { NicknameEditor } from '../../ports/NicknameEditor';
import type { StructureKind } from '../../domain/structures/DefenseStructure';
import type { CombatEvent } from '../../domain/combat/CombatEvent';
import { BattlefieldSpriteRenderer } from '../rendering/BattlefieldSpriteRenderer';
import { BattlefieldEffects } from '../effects/BattlefieldEffects';
import { BattlefieldAudioDirector } from '../audio/BattlefieldAudioDirector';
import { BattlefieldBackdropRenderer } from '../rendering/BattlefieldBackdropRenderer';
import { AudioControlPanel } from '../ui/AudioControlPanel';
import { PauseMenu } from '../ui/PauseMenu';

const PATH_COLORS = [0x59c3c3, 0xff8c61, 0x8bd17c] as const;
type DefenseScenePhase =
  | 'tutorial'
  | 'preparation'
  | 'combat'
  | 'result'
  | 'role-reversal'
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
  private spriteRenderer!: BattlefieldSpriteRenderer;
  private effects!: BattlefieldEffects;
  private audioDirector!: BattlefieldAudioDirector;
  private audioControlPanel: AudioControlPanel | null = null;
  private pauseMenu: PauseMenu | null = null;
  private isPaused = false;
  private statusText!: Phaser.GameObjects.Text;
  private selectionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private combatInfoText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private firstRunGuide!: FirstRunGuide;
  private tutorialOverlay!: Phaser.GameObjects.Container;
  private tutorialProgressText!: Phaser.GameObjects.Text;
  private tutorialRecordText!: Phaser.GameObjects.Text;
  private tutorialTitleText!: Phaser.GameObjects.Text;
  private tutorialBodyText!: Phaser.GameObjects.Text;
  private tutorialObjectiveText!: Phaser.GameObjects.Text;
  private tutorialControlText!: Phaser.GameObjects.Text;
  private guideCoachPanel!: Phaser.GameObjects.Rectangle;
  private guideCoachText!: Phaser.GameObjects.Text;
  private roleReversalTimer: Phaser.Time.TimerEvent | null = null;
  private playerRecord!: PlayerRecord;
  private recordResetArmedUntil = 0;
  private latestRecordNotice = '';
  private leaderboardOverlay!: Phaser.GameObjects.Container;
  private leaderboardStatusText!: Phaser.GameObjects.Text;
  private leaderboardRowsText!: Phaser.GameObjects.Text;
  private leaderboardPlayerText!: Phaser.GameObjects.Text;
  private isLeaderboardOpen = false;
  private isNicknameDialogOpen = false;
  private leaderboardRequestId = 0;
  private activeKind: StructureKind = 'tower';
  private activeTowerArchetype: TowerArchetype = 'popgun';
  private selectedStructureId: string | null = null;
  private phase: DefenseScenePhase = 'tutorial';
  private preparationRemainingMs = PREPARATION_DURATION_MS;
  private defenseStructureCountAtStart = 0;
  private combat: DefenseCombat | null = null;
  private squadPlan: SquadPlan | null = null;
  private attackCombat: AttackCombat | null = null;
  private attackPreparationRemainingMs = ATTACK_PREPARATION_DURATION_MS;
  private roundSession = new RoundSession(NORMAL_MODE_ROUND_COUNT);
  private selectedAttackLane = 1;
  private selectedAttackUnitKind: AttackUnitKind = 'tank';
  private isFocusTargeting = false;
  private isDisruptTargeting = false;
  private commanderMoveKeys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  public constructor(
    private readonly gameRecordService: GameRecordService,
    private readonly leaderboardService: LeaderboardService,
    private readonly nicknameEditor: NicknameEditor,
    private readonly firstRunGuideService: FirstRunGuideService,
    private readonly audioSettingsService: AudioSettingsService,
  ) {
    super({ key: 'BattlefieldScene' });
  }

  public create(): void {
    this.audioControlPanel = null;
    this.pauseMenu = null;
    this.isPaused = false;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.roundSession = new RoundSession(NORMAL_MODE_ROUND_COUNT);
    this.playerRecord = this.gameRecordService.record;
    this.recordResetArmedUntil = 0;
    this.latestRecordNotice = '';
    this.isLeaderboardOpen = false;
    this.isNicknameDialogOpen = false;
    this.leaderboardRequestId = 0;
    this.firstRunGuide = this.firstRunGuideService.createGuide();
    this.phase = 'tutorial';
    this.preparationRemainingMs = PREPARATION_DURATION_MS;
    this.defenseStructureCountAtStart = 0;
    this.combat = null;
    this.clearAttackState();
    this.roleReversalTimer = null;
    const battlefield = new Battlefield(
      createBattlefieldMap(),
      new BreadthFirstPathfinder(),
    );
    this.editor = new DefenseEditor(
      battlefield,
      createPrototypeConstructionEconomy(),
      createPrototypeTowerUpgradePolicy(),
    );

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

    this.audioDirector = new BattlefieldAudioDirector(
      this,
      this.audioSettingsService,
    );
    this.createStaticInterface();
    new BattlefieldBackdropRenderer(this);
    this.pathGraphics = this.add.graphics();
    this.boardGraphics = this.add.graphics();
    this.structureGraphics = this.add.graphics();
    this.enemyGraphics = this.add.graphics();
    this.attackerGraphics = this.add.graphics();
    this.pathGraphics.setDepth(4);
    this.boardGraphics.setDepth(3);
    this.structureGraphics.setDepth(30);
    this.enemyGraphics.setDepth(31);
    this.attackerGraphics.setDepth(32);
    this.spriteRenderer = new BattlefieldSpriteRenderer(this);
    this.effects = new BattlefieldEffects(this);
    this.createTutorialOverlay();
    this.createGuideCoachMark();
    this.createLeaderboardOverlay();
    this.createGameControls();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isPaused) return;
      this.audioDirector.startMusic();
      this.audioDirector.playUi('click');
      this.handlePointerDown(pointer);
    });

    this.configureKeyboardInput();
    this.renderBattlefield();
    this.renderOpening();
    this.setStatus('Enter를 눌러 장난감 전쟁을 시작하세요.');
  }

  public update(_time: number, delta: number): void {
    if (this.isPaused) return;
    if (this.isLeaderboardOpen || this.isNicknameDialogOpen) return;

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
      this.presentCombatEvents(this.attackCombat.drainEvents());
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
    this.presentCombatEvents(this.combat.drainEvents());
    this.renderBattlefield();
    this.updatePhaseInterface();

    if (this.combat.state !== 'running') {
      this.finishDefenseCombat();
    }
  }

  private seedInitialDesign(): void {
    for (const placement of INITIAL_DEFENSE_PLACEMENTS) {
      const position = new GridPosition(placement.column, placement.row);
      const result =
        placement.kind === 'tower'
          ? this.editor.placeTower(placement.towerArchetype, position)
          : this.editor.place('obstacle', position);
      if (!result.success) {
        throw new Error(`Initial defense placement failed: ${result.reason}`);
      }
    }
  }

  private createStaticInterface(): void {
    this.add.text(32, 24, 'TOY BASE REVERSAL', {
      color: GAME_COLORS.primary,
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
    });

    this.add.text(32, 70, '지키고, 뒤집고, 내가 만든 기지를 직접 돌파하세요.', {
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
      280,
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
        fontSize: '15px',
        lineSpacing: 4,
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
        lineSpacing: 8,
        padding: { x: 34, y: 24 },
        wordWrap: { width: 720 },
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);

    this.updatePhaseInterface();
  }

  private createGameControls(): void {
    this.pauseMenu = new PauseMenu(this, {
      pause: () => this.pauseGame(),
      resume: () => this.resumeGame(),
      exitToOpening: () => this.exitToOpening(),
    });
    this.audioControlPanel = new AudioControlPanel(this, this.audioDirector);
    this.syncPauseAvailability();
  }

  private pauseGame(): void {
    if (this.isPaused || !this.canPause()) return;
    this.isPaused = true;
    this.time.paused = true;
    this.tweens.pauseAll();
    this.pauseMenu?.open();
    this.syncCanvasAccessibilityState();
  }

  private resumeGame(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.pauseMenu?.close();
    this.syncCanvasAccessibilityState();
  }

  private exitToOpening(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.audioControlPanel?.close();
    this.pauseMenu?.close();
    this.scene.restart();
  }

  private canPause(): boolean {
    if (this.isLeaderboardOpen || this.isNicknameDialogOpen) return false;
    return (
      this.phase === 'preparation' ||
      this.phase === 'combat' ||
      this.phase === 'role-reversal' ||
      this.phase === 'attack-preparation' ||
      this.phase === 'attack-combat'
    );
  }

  private syncPauseAvailability(): void {
    this.pauseMenu?.setPauseAvailable(this.canPause());
  }

  private createTutorialOverlay(): void {
    const backdrop = this.add.rectangle(
      0,
      0,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x090712,
      0.82,
    );
    const panel = this.add
      .rectangle(0, 0, 760, 500, 0x262238, 1)
      .setStrokeStyle(3, 0xffd166, 0.9);
    this.tutorialProgressText = this.add
      .text(-330, -205, '', {
        color: GAME_COLORS.secondary,
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
      });
    this.tutorialRecordText = this.add
      .text(330, -205, '', {
        align: 'right',
        color: '#d9d3e8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        lineSpacing: 3,
      })
      .setOrigin(1, 0);
    this.tutorialTitleText = this.add
      .text(0, -150, '', {
        align: 'center',
        color: GAME_COLORS.primary,
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        wordWrap: { width: 650 },
      })
      .setOrigin(0.5, 0);
    this.tutorialBodyText = this.add
      .text(0, -76, '', {
        align: 'center',
        color: GAME_COLORS.text,
        fontFamily: 'Arial, sans-serif',
        fontSize: '21px',
        lineSpacing: 8,
        wordWrap: { width: 650 },
      })
      .setOrigin(0.5, 0);
    this.tutorialObjectiveText = this.add
      .text(0, 126, '', {
        align: 'center',
        backgroundColor: '#171321',
        color: GAME_COLORS.secondary,
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        padding: { x: 18, y: 12 },
        wordWrap: { width: 620 },
      })
      .setOrigin(0.5, 0);
    this.tutorialControlText = this.add
      .text(
        0,
        212,
        '',
        {
          align: 'center',
          color: '#d9d3e8',
          fontFamily: 'Arial, sans-serif',
          fontSize: '17px',
          lineSpacing: 5,
        },
      )
      .setOrigin(0.5);

    this.tutorialOverlay = this.add
      .container(640, GAME_HEIGHT / 2, [
        backdrop,
        panel,
        this.tutorialProgressText,
        this.tutorialRecordText,
        this.tutorialTitleText,
        this.tutorialBodyText,
        this.tutorialObjectiveText,
        this.tutorialControlText,
      ])
      .setDepth(100);
  }

  private createGuideCoachMark(): void {
    this.guideCoachPanel = this.add
      .rectangle(512, 96, 920, 64, 0x171321, 0.96)
      .setStrokeStyle(2, 0xffd166, 0.9)
      .setDepth(30)
      .setVisible(false);
    this.guideCoachText = this.add
      .text(72, 76, '', {
        color: GAME_COLORS.text,
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        wordWrap: { width: 860 },
      })
      .setDepth(31)
      .setVisible(false);
  }

  private createLeaderboardOverlay(): void {
    const backdrop = this.add.rectangle(
      0,
      0,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x090712,
      0.9,
    );
    const panel = this.add
      .rectangle(0, 0, 900, 650, 0x262238, 1)
      .setStrokeStyle(3, 0x9fe3c3, 0.95);
    const title = this.add
      .text(-390, -280, '온라인 챌린지 순위표', {
        color: GAME_COLORS.primary,
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
      });
    const rule = this.add
      .text(-390, -230, '높은 라운드 우선 · 같은 라운드는 짧은 돌파시간 우선', {
        color: '#d9d3e8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
      });
    this.leaderboardStatusText = this.add
      .text(-390, -190, '', {
        color: GAME_COLORS.secondary,
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
      });
    this.leaderboardRowsText = this.add
      .text(-360, -140, '', {
        color: GAME_COLORS.text,
        fontFamily: 'Consolas, monospace',
        fontSize: '20px',
        lineSpacing: 9,
      });
    this.leaderboardPlayerText = this.add
      .text(-390, 220, '', {
        backgroundColor: '#171321',
        color: GAME_COLORS.primary,
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        padding: { x: 18, y: 12 },
      });
    const controls = this.add
      .text(0, 286, '[Tab / Esc] 닫기    [N] 닉네임 변경', {
        color: '#d9d3e8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
      })
      .setOrigin(0.5);

    this.leaderboardOverlay = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
        backdrop,
        panel,
        title,
        rule,
        this.leaderboardStatusText,
        this.leaderboardRowsText,
        this.leaderboardPlayerText,
        controls,
      ])
      .setDepth(120)
      .setVisible(false);
  }

  private renderOpening(): void {
    const isDetailed = this.firstRunGuide.isDetailed;
    this.tutorialProgressText.setText(
      isDetailed ? '장난감 전쟁 · 첫 출전' : '장난감 전쟁 · 다시 출전',
    );
    this.tutorialRecordText.setText(
      `${this.playerRecord.playerName}\n일반 ${this.normalBestText()} · 챌린지 ${this.challengeBestText()}`,
    );
    this.tutorialTitleText.setText('지키고, 뒤집고, 돌파하라');
    this.tutorialBodyText.setText(
      isDetailed
        ? '한 아이가 블록으로 요새와 군대를 만들었습니다.\n먼저 요새를 지킨 뒤, 이번에는 공격자가 되어\n방금 만든 방어선을 직접 무너뜨리세요.'
        : '내 기지를 방어한 뒤 공격자로 역할을 바꿔\n같은 기지를 더 빠르게 돌파하세요.',
    );
    this.tutorialObjectiveText.setText(
      isDetailed
        ? '첫 목표: 준비된 기지를 지키고 역할 반전을 경험하세요.'
        : 'Space로 준비 시간을 건너뛰면 바로 핵심 전투를 시작할 수 있습니다.',
    );
    this.tutorialControlText.setText(
      '[Enter] 장난감 전쟁 시작  [Esc] 상세 안내 없이 시작\n[Tab] 순위표  [N] 닉네임  [L] 기록 초기화(두 번)',
    );
    this.tutorialOverlay.setVisible(true);
    this.hideGuideCoachMark();
    this.updatePhaseInterface();
  }

  private startFromOpening(): void {
    if (this.phase !== 'tutorial') return;
    this.finishOpening(false);
  }

  private skipDetailedGuide(): void {
    if (this.phase !== 'tutorial') return;
    this.firstRunGuide.complete();
    this.firstRunGuideService.markCompleted();
    this.finishOpening(true);
  }

  private finishOpening(skipped: boolean): void {
    if (!skipped) this.firstRunGuide.beginDefensePreparation();
    this.phase = 'preparation';
    this.tutorialOverlay.setVisible(false);
    this.setStatus(
      skipped
        ? '상세 안내를 건너뛰었습니다. Space를 누르면 바로 방어를 시작합니다.'
        : '방어 준비 시작! 기지는 이미 작동합니다. 수정하거나 Space로 바로 시작하세요.',
    );
    this.updatePhaseInterface();
    this.renderGuideCoachMark();
    this.renderBattlefield();
  }

  private replayDetailedGuide(): void {
    if (this.phase !== 'preparation') return;
    this.firstRunGuide.restartDetailed();
    this.phase = 'tutorial';
    this.renderOpening();
    this.setStatus('첫 안내를 다시 보고 있습니다. 준비 시간은 일시 정지됩니다.');
  }

  private renderGuideCoachMark(): void {
    if (!this.firstRunGuide.isDetailed) {
      this.hideGuideCoachMark();
      return;
    }
    const prompt = firstRunGuidePromptFor(this.firstRunGuide.stage);
    if (prompt === null) {
      this.hideGuideCoachMark();
      return;
    }
    this.guideCoachText.setText(
      `${prompt.label}  |  ${prompt.title}\n${prompt.body}`,
    );
    this.guideCoachPanel.setVisible(true);
    this.guideCoachText.setVisible(true);
  }

  private hideGuideCoachMark(): void {
    this.guideCoachPanel.setVisible(false);
    this.guideCoachText.setVisible(false);
  }

  private showRoleReversal(): void {
    if (this.phase !== 'result' || this.combat?.state !== 'won') return;
    if (this.roundSession.currentRound !== 1 || this.roundSession.isChallengeMode) {
      this.startAttackPreparation();
      return;
    }
    this.firstRunGuide.beginRoleReversal();
    this.editor.restoreBlueprint();
    this.combat = null;
    this.phase = 'role-reversal';
    this.resultText.setVisible(false);
    this.hideGuideCoachMark();
    this.tutorialProgressText.setText('역할 반전');
    this.tutorialRecordText.setText('방어 설계 복원 완료');
    this.tutorialTitleText.setText('이제 네가 공격자다');
    this.tutorialBodyText.setText(
      '방금 지켜낸 장난감 요새가 이제 공략 대상이 됩니다.\n추천 부대를 이끌고 자신의 방어선을 돌파하세요.',
    );
    this.tutorialObjectiveText.setText(
      '같은 설계, 반대 역할: 지휘관을 살리고 적 코어를 파괴하세요.',
    );
    this.tutorialControlText.setText('[Enter] 바로 공격 준비');
    this.tutorialOverlay.setVisible(true);
    this.cameras.main.flash(260, 255, 209, 102, false);
    this.updatePhaseInterface();
    this.renderBattlefield();
    this.roleReversalTimer?.remove(false);
    this.roleReversalTimer = this.time.delayedCall(2_300, () => {
      this.startAttackPreparation();
    });
  }

  private toggleLeaderboard(): void {
    if (this.isLeaderboardOpen) {
      this.isLeaderboardOpen = false;
      this.leaderboardOverlay.setVisible(false);
      return;
    }
    if (this.phase === 'combat' || this.phase === 'attack-combat') {
      this.setStatus('전투 중에는 온라인 순위표를 열 수 없습니다.', true);
      return;
    }

    this.isLeaderboardOpen = true;
    this.leaderboardOverlay.setVisible(true);
    this.leaderboardStatusText
      .setColor(GAME_COLORS.secondary)
      .setText('순위표를 불러오는 중입니다...');
    this.leaderboardRowsText.setText('');
    this.leaderboardPlayerText.setText(
      `${this.playerRecord.playerName} · 로컬 ${this.challengeBestText()}`,
    );
    void this.refreshLeaderboard();
  }

  private async refreshLeaderboard(): Promise<void> {
    const requestId = ++this.leaderboardRequestId;
    const result = await this.leaderboardService.load();
    if (!this.isLeaderboardOpen || requestId !== this.leaderboardRequestId) {
      return;
    }
    this.renderLeaderboardResult(result);
  }

  private renderLeaderboardResult(result: LeaderboardResult): void {
    this.leaderboardStatusText
      .setColor(
        result.status === 'online' ? GAME_COLORS.secondary : '#ffb86b',
      )
      .setText(result.message);
    const entries = result.leaderboard?.topEntries ?? [];
    this.leaderboardRowsText.setText(
      entries.length === 0
        ? '아직 표시할 온라인 기록이 없습니다.'
        : [
            '순위  지휘관             라운드   돌파시간',
            ...entries.map(
              (entry) =>
                `${String(entry.rank).padStart(2)}위  ${this.truncateNickname(entry.playerName).padEnd(16)} ${String(entry.challengeRound).padStart(3)}R   ${this.formatTime(entry.attackTimeMs).padStart(7)}`,
            ),
          ].join('\n'),
    );
    const current = result.leaderboard?.currentPlayerEntry;
    this.leaderboardPlayerText.setText(
      current === null || current === undefined
        ? `${this.playerRecord.playerName} · 온라인 등록 기록 없음\n로컬 ${this.challengeBestText()}`
        : `내 순위 ${current.rank}위 · ${current.challengeRound}R · ${this.formatTime(current.attackTimeMs)}\n닉네임 ${current.playerName}`,
    );
  }

  private truncateNickname(nickname: string): string {
    return nickname.length <= 14 ? nickname : `${nickname.slice(0, 13)}…`;
  }

  private async requestNicknameChange(): Promise<void> {
    if (this.isNicknameDialogOpen) return;
    if (this.phase === 'combat' || this.phase === 'attack-combat') {
      this.setStatus('전투 중에는 닉네임을 변경할 수 없습니다.', true);
      return;
    }

    this.isNicknameDialogOpen = true;
    const nickname = await this.nicknameEditor.requestNickname(
      this.playerRecord.playerName,
    );
    this.isNicknameDialogOpen = false;
    if (nickname === null) return;

    try {
      this.playerRecord = this.gameRecordService.renamePlayer(nickname);
      this.setStatus(`닉네임을 ${this.playerRecord.playerName}(으)로 저장했습니다.`);
      if (this.phase === 'tutorial') this.renderOpening();
      else this.updatePhaseInterface();
      const best = this.playerRecord.challengeBest;
      if (best !== null) {
        const result = await this.leaderboardService.submitChallengeBest(
          this.playerRecord.playerName,
          best,
        );
        if (this.isLeaderboardOpen) this.renderLeaderboardResult(result);
      }
    } catch {
      this.setStatus('닉네임은 공백 제외 1~24자로 입력하세요.', true);
    }
  }

  private configureKeyboardInput(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      this.audioDirector.startMusic();
      if (this.isPaused) {
        if (event.code === 'Escape') {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.resumeGame();
          return;
        }
        if (event.code !== 'KeyM') {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
      }
      if (this.isLeaderboardOpen && event.code === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.toggleLeaderboard();
        return;
      }
      if (
        (this.isLeaderboardOpen || this.isNicknameDialogOpen) &&
        event.code !== 'Tab' &&
        event.code !== 'KeyN'
      ) {
        event.stopImmediatePropagation();
      }
    });

    this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault();
      if (!this.isNicknameDialogOpen) this.toggleLeaderboard();
    });

    this.input.keyboard?.on('keydown-N', () => {
      if (this.isLeaderboardOpen) this.toggleLeaderboard();
      void this.requestNicknameChange();
    });

    this.input.keyboard?.on('keydown-M', () => {
      const muted = this.audioDirector.toggleMute();
      this.audioControlPanel?.refresh();
      this.setStatus(muted ? '모든 소리를 껐습니다.' : '효과음과 배경음악을 켰습니다.');
    });

    this.input.keyboard?.on('keydown-ONE', () => {
      if (this.phase === 'attack-preparation') {
        this.selectAttackUnit('tank');
        return;
      }
      this.selectTower('popgun');
    });

    this.input.keyboard?.on('keydown-TWO', () => {
      if (this.phase === 'attack-preparation') {
        this.selectAttackUnit('swarm');
        return;
      }
      this.selectTower('mortar');
    });

    this.input.keyboard?.on('keydown-THREE', () => {
      if (this.phase === 'attack-preparation') {
        this.selectAttackUnit('ranger');
        return;
      }
      this.selectTower('piercer');
    });

    this.input.keyboard?.on('keydown-FOUR', () => {
      if (this.phase !== 'preparation') {
        return;
      }
      this.activeKind = 'obstacle';
      this.selectedStructureId = null;
      this.setStatus(
        `블록 벽 배치 모드: 부품 ${OBSTACLE_CONSTRUCTION_COST}, 공격 능력 없이 진로를 지연시킵니다.`,
      );
      this.renderBattlefield();
    });

    this.input.keyboard?.on('keydown-S', () => {
      if (this.phase !== 'preparation') {
        return;
      }
      this.editor.saveBlueprint();
      this.setStatus(
        `현재 방어 설계와 남은 부품 ${this.editor.constructionFunds}을 저장했습니다.`,
      );
    });

    this.input.keyboard?.on('keydown-R', () => {
      if (this.phase === 'attack-result') {
        if (this.attackCombat?.state === 'lost') {
          this.restartCampaign();
        }
        return;
      }
      if (this.phase === 'campaign-complete') {
        this.restartCampaign();
        return;
      }
      if (this.phase === 'result') {
        if (
          this.roundSession.isChallengeMode &&
          this.combat?.state === 'lost'
        ) {
          this.restartCampaign();
        } else {
          this.resetToPreparation();
        }
        return;
      }

      if (this.phase !== 'preparation') {
        return;
      }

      const restored = this.editor.restoreBlueprint();
      this.selectedStructureId = null;
      this.setStatus(
        restored
          ? `저장한 설계와 부품 ${this.editor.constructionFunds}을 복원하고 시설 체력을 초기화했습니다.`
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
      this.setStatus(
        '선택한 시설을 파괴했습니다. 파괴에는 부품 환급이 없습니다.',
      );
      this.renderBattlefield();
    });

    this.input.keyboard?.on('keydown-U', () => {
      if (this.phase !== 'preparation') return;
      if (this.selectedStructureId === null) {
        this.setStatus('먼저 업그레이드할 타워를 선택하세요.', true);
        return;
      }

      const result = this.editor.upgradeTower(this.selectedStructureId);
      if (!result.success) {
        this.setStatus(this.failureMessage(result.reason), true);
        return;
      }

      this.setStatus(
        `타워를 ${result.receipt.level}레벨로 강화하고 건설 부품 ${result.receipt.cost}을 사용했습니다.`,
      );
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
      if (this.phase === 'tutorial') {
        this.startFromOpening();
      } else if (this.phase === 'result' && this.combat?.state === 'won') {
        this.showRoleReversal();
      } else if (this.phase === 'role-reversal') {
        this.startAttackPreparation();
      } else if (
        this.phase === 'attack-result' &&
        this.attackCombat?.state === 'won'
      ) {
        this.continueAfterAttackVictory();
      } else if (this.phase === 'campaign-complete') {
        this.startChallengeMode();
      }
    });

    this.input.keyboard?.on('keydown-Q', () => {
      if (this.phase === 'attack-preparation') {
        this.addUnitToLane(0);
      } else if (this.phase === 'attack-combat') {
        if (this.attackCombat?.canIssueFocusFire !== true) {
          this.setStatus('집중 공격 재사용 대기 중입니다.', true);
          return;
        }
        this.isDisruptTargeting = false;
        this.isFocusTargeting = true;
        this.setStatus('집중 공격: 공격할 타워를 클릭하세요. 우클릭 또는 Esc로 취소합니다.');
        this.renderBattlefield();
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
        if (this.attackCombat?.canIssueDisrupt !== true) {
          this.setStatus('교란 재사용 대기 중입니다.', true);
          return;
        }
        this.isFocusTargeting = false;
        this.isDisruptTargeting = true;
        this.setStatus('교란: 지휘관 반경 안에서 무력화할 타워를 클릭하세요.');
        this.renderBattlefield();
      }
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.phase === 'tutorial') {
        this.skipDetailedGuide();
        return;
      }
      if (
        this.phase === 'attack-combat' &&
        (this.isFocusTargeting || this.isDisruptTargeting)
      ) {
        const cancelledAbility = this.isFocusTargeting ? '집중 공격' : '교란';
        this.isFocusTargeting = false;
        this.isDisruptTargeting = false;
        this.setStatus(`${cancelledAbility} 대상 선택을 취소했습니다.`);
        this.renderBattlefield();
        return;
      }
      this.pauseGame();
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
          : `대기열의 마지막 유닛을 제거하고 출격 포인트 ${attackUnitCost(removed)}를 돌려받았습니다.`,
        removed === null,
      );
      this.updatePhaseInterface();
      this.renderBattlefield();
    });

    this.input.keyboard?.on('keydown-X', () => {
      if (this.phase !== 'attack-preparation' || this.squadPlan === null) return;
      const refunded = this.squadPlan.clearUnits();
      this.setStatus(
        refunded === 0
          ? '편성된 일반 유닛이 없습니다.'
          : `전체 편성을 비우고 출격 포인트 ${refunded}를 전액 환급받았습니다.`,
        refunded === 0,
      );
      this.updatePhaseInterface();
      this.renderBattlefield();
    });

    this.input.keyboard?.on('keydown-P', () => {
      if (this.phase !== 'attack-preparation') return;
      this.squadPlan = createPrototypeSquadPlan(
        this.roundSession.currentRound,
        true,
      );
      this.selectedAttackLane = 1;
      this.setStatus('현재 라운드의 추천 편성으로 초기화했습니다.');
      this.updatePhaseInterface();
      this.renderBattlefield();
    });

    this.input.keyboard?.on('keydown-L', () => {
      this.handleRecordReset();
    });

    this.input.keyboard?.on('keydown-H', () => {
      this.replayDetailedGuide();
    });
  }

  private handleRecordReset(): void {
    if (this.phase !== 'tutorial' && this.phase !== 'preparation') {
      this.setStatus(
        '개인 기록은 시작 안내 또는 방어 준비 화면에서 초기화할 수 있습니다.',
        true,
      );
      return;
    }

    if (this.time.now > this.recordResetArmedUntil) {
      this.recordResetArmedUntil = this.time.now + 3_000;
      this.setStatus(
        '개인 최고 기록을 지우려면 3초 안에 L 키를 한 번 더 누르세요.',
        true,
      );
      return;
    }

    this.playerRecord = this.gameRecordService.reset();
    this.recordResetArmedUntil = 0;
    this.latestRecordNotice = '';
    this.setStatus('브라우저에 저장된 개인 최고 기록을 초기화했습니다.');
    if (this.phase === 'tutorial') {
      this.renderOpening();
    } else {
      this.updatePhaseInterface();
    }
  }

  private selectTower(towerArchetype: TowerArchetype): void {
    if (this.phase !== 'preparation') return;
    if (!isTowerAvailable(towerArchetype, this.roundSession.currentRound)) {
      const unlockRound = towerArchetype === 'mortar' ? 2 : 3;
      this.setStatus(`${TOWER_NAMES[towerArchetype]}은 ${unlockRound}라운드에 해금됩니다.`, true);
      return;
    }
    this.activeKind = 'tower';
    this.activeTowerArchetype = towerArchetype;
    this.selectedStructureId = null;
    this.setStatus(
      `${TOWER_NAMES[towerArchetype]} 배치 모드: 부품 ${TOWER_CONSTRUCTION_COSTS[towerArchetype]}`,
    );
    this.renderBattlefield();
  }

  private selectAttackUnit(unitKind: AttackUnitKind): void {
    if (this.phase !== 'attack-preparation') return;
    if (!isUnitAvailable(unitKind, this.roundSession.currentRound)) {
      const unlockRound = unitKind === 'swarm' ? 2 : 3;
      this.setStatus(`${UNIT_NAMES[unitKind]}은 ${unlockRound}라운드에 해금됩니다.`, true);
      return;
    }
    this.selectedAttackUnitKind = unitKind;
    this.setStatus(
      `${UNIT_NAMES[unitKind]} 선택: 출격 포인트 ${attackUnitCost(unitKind)}, Q/W/E로 진입로에 추가합니다.`,
    );
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isLeaderboardOpen || this.isNicknameDialogOpen) return;

    if (this.phase === 'attack-combat' && this.isFocusTargeting) {
      this.handleFocusTargetPointer(pointer);
      return;
    }
    if (this.phase === 'attack-combat' && this.isDisruptTargeting) {
      this.handleDisruptTargetPointer(pointer);
      return;
    }
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

      const sale = this.editor.sell(existing.id);
      if (!sale.success) {
        this.setStatus(this.failureMessage(sale.reason), true);
        return;
      }
      if (this.selectedStructureId === existing.id) {
        this.selectedStructureId = null;
      }
      this.setStatus(
        `시설을 판매하고 부품 ${sale.receipt.refund}을 전액 환급받았습니다.`,
      );
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
        ? this.editor.place(
            this.activeKind,
            gridPosition,
            this.activeKind === 'tower' ? this.activeTowerArchetype : null,
          )
        : this.editor.move(this.selectedStructureId, gridPosition);

    if (!result.success) {
      this.flashInvalidCell(gridPosition);
      this.setStatus(this.failureMessage(result.reason), true);
      return;
    }

    this.selectedStructureId = null;
    this.setStatus(
      `설계를 변경했습니다. 남은 건설 부품 ${this.editor.constructionFunds}.`,
    );
    this.renderBattlefield();
  }

  private handleFocusTargetPointer(pointer: Phaser.Input.Pointer): void {
    if (pointer.rightButtonDown()) {
      this.isFocusTargeting = false;
      this.setStatus('집중 공격 대상 선택을 취소했습니다.');
      this.renderBattlefield();
      return;
    }

    const gridPosition = this.pointerToGrid(pointer);
    if (gridPosition === null) {
      this.setStatus('전장 안의 타워를 선택하세요.', true);
      return;
    }
    const target = this.editor.battlefield.findStructureAt(gridPosition);
    if (target === null || target.kind !== 'tower') {
      this.setStatus('집중 공격은 타워에만 사용할 수 있습니다.', true);
      return;
    }

    const result = this.attackCombat?.issueFocusFire(target.id);
    if (result?.success === true) {
      this.isFocusTargeting = false;
      this.firstRunGuide.recordFocusFire();
      this.setStatus(
        `집중 공격! 지휘관 주변 ${result.unitCount}명이 선택한 타워를 우선 공격합니다.`,
      );
      this.audioDirector.playAbility('focus');
      this.effects.playAbility(
        { column: target.position.column, row: target.position.row },
        'focus',
      );
      this.renderGuideCoachMark();
      this.renderBattlefield();
      return;
    }

    const message =
      result?.reason === 'no-nearby-units'
        ? '지휘관 주변에 명령을 받을 일반 유닛이 없습니다.'
        : result?.reason === 'cooldown'
          ? '집중 공격 재사용 대기 중입니다.'
          : '선택한 타워에 집중 공격 명령을 내릴 수 없습니다.';
    this.isFocusTargeting = false;
    this.setStatus(message, true);
    this.renderBattlefield();
  }

  private handleDisruptTargetPointer(pointer: Phaser.Input.Pointer): void {
    if (pointer.rightButtonDown()) {
      this.isDisruptTargeting = false;
      this.setStatus('교란 대상 선택을 취소했습니다.');
      this.renderBattlefield();
      return;
    }

    const gridPosition = this.pointerToGrid(pointer);
    if (gridPosition === null) {
      this.setStatus('전장 안의 타워를 선택하세요.', true);
      return;
    }
    const target = this.editor.battlefield.findStructureAt(gridPosition);
    if (target === null || target.kind !== 'tower') {
      this.setStatus('교란은 타워에만 사용할 수 있습니다.', true);
      return;
    }

    const result = this.attackCombat?.issueDisrupt(target.id);
    if (result?.success === true) {
      this.isDisruptTargeting = false;
      this.firstRunGuide.recordDisruption();
      this.firstRunGuideService.markCompleted();
      const towerName =
        target.towerArchetype === null
          ? '타워'
          : TOWER_NAMES[target.towerArchetype];
      this.setStatus(`교란 성공! ${towerName}의 공격과 대기시간을 정지했습니다.`);
      this.audioDirector.playAbility('disrupt');
      this.effects.playAbility(
        { column: target.position.column, row: target.position.row },
        'disrupt',
      );
      this.renderGuideCoachMark();
      this.renderBattlefield();
      return;
    }

    const message =
      result?.reason === 'out-of-range'
        ? '선택한 타워가 지휘관의 교란 반경 밖에 있습니다.'
        : result?.reason === 'cooldown'
          ? '교란 재사용 대기 중입니다.'
          : '선택한 타워를 교란할 수 없습니다.';
    if (result?.reason === 'cooldown') this.isDisruptTargeting = false;
    this.setStatus(message, true);
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
    const kindName =
      this.activeKind === 'tower'
        ? TOWER_NAMES[this.activeTowerArchetype]
        : '블록 벽';
    if (this.phase === 'tutorial') {
      this.selectionText.setText(
        '핵심 규칙\n방어 → 역공\n\n상성\n팝건 → 사수\n박격포 → 군단\n관통포 → 방패병',
      );
      return;
    }
    if (this.phase === 'attack-preparation' && this.squadPlan !== null) {
      this.selectionText.setText(
        `선택 유닛: ${UNIT_NAMES[this.selectedAttackUnitKind]}\n강함: ${unitCounterSummary(this.selectedAttackUnitKind)}\n비용: ${attackUnitCost(this.selectedAttackUnitKind)}\n남은 포인트: ${this.squadPlan.remainingSortiePoints}`,
      );
      return;
    }

    this.selectionText.setText(
      this.phase !== 'preparation'
        ? `전투 상태: ${this.phase === 'combat' || this.phase === 'attack-combat' ? '진행 중' : '종료'}\n남은 시설: ${this.editor.battlefield.structures.length}`
        : selected === undefined || selected === null
        ? `현재 도구: ${kindName}\n${this.activeKind === 'tower' ? `강함: ${towerCounterSummary(this.activeTowerArchetype)}\n` : ''}비용: ${this.editor.constructionCost(this.activeKind, this.activeKind === 'tower' ? this.activeTowerArchetype : null)} · 보유: ${this.editor.constructionFunds}\n시설 수: ${this.editor.battlefield.structures.length}`
        : `선택: ${selected.kind === 'tower' && selected.towerArchetype !== null ? `${TOWER_NAMES[selected.towerArchetype]} Lv.${selected.upgradeLevel}` : '블록 벽'}\n${selected.kind === 'tower' && selected.towerArchetype !== null ? `강함: ${towerCounterSummary(selected.towerArchetype)}\n` : ''}체력: ${selected.health}/${selected.maxHealth}\n${selected.kind === 'tower' ? `강화: ${this.editor.upgradeCost(selected) === null ? '최대 레벨' : `부품 ${this.editor.upgradeCost(selected)}`}` : '강화 불가'}\n판매: ${this.editor.saleRefund(selected)} · 보유: ${this.editor.constructionFunds}`,
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
    this.boardGraphics.fillStyle(0x092c2b, 0.22);
    this.boardGraphics.fillRect(
      GRID_OFFSET_X,
      GRID_OFFSET_Y,
      GRID_COLUMNS * GRID_CELL_SIZE,
      GRID_ROWS * GRID_CELL_SIZE,
    );

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
    this.spriteRenderer.renderCore(CORE_POSITION.column, CORE_POSITION.row, coreRatio);
    this.boardGraphics.fillStyle(coreRatio > 0.4 ? 0x8bd17c : 0xff6b6b, 0.22);
    this.boardGraphics.fillCircle(coreCenter.x, coreCenter.y, 23);
    this.boardGraphics.lineStyle(3, 0xd8ffd0, 1);
    this.boardGraphics.strokeCircle(coreCenter.x, coreCenter.y, 23);
  }

  private renderStructures(): void {
    this.structureGraphics.clear();
    this.spriteRenderer.renderStructures(
      this.editor.battlefield.structures,
      new Set(
        this.attackCombat?.activeDisruptions.map(({ towerId }) => towerId) ?? [],
      ),
    );

    for (const structure of this.editor.battlefield.structures) {
      const center = this.gridCenter(structure.position);
      const isSelected = structure.id === this.selectedStructureId;
      const isFocusTarget = structure.id === this.attackCombat?.focusTargetId;
      const isFocusCandidate =
        this.isFocusTargeting && structure.kind === 'tower';
      const isDisruptCandidate =
        this.isDisruptTargeting &&
        structure.kind === 'tower' &&
        this.attackCombat?.isTowerWithinDisruptRange(structure.id) === true;
      const isDisruptOutOfRange =
        this.isDisruptTargeting &&
        structure.kind === 'tower' &&
        !isDisruptCandidate;

      if (isSelected) {
        this.structureGraphics.lineStyle(4, 0xffffff, 1);
        this.structureGraphics.strokeRect(
          center.x - 21,
          center.y - 21,
          42,
          42,
        );
      }

      if (structure.kind === 'tower' && structure.upgradeLevel > 1) {
        this.structureGraphics.lineStyle(3, 0xffe082, 0.95);
        this.structureGraphics.strokeCircle(center.x, center.y, 20);
      }

      if (isFocusCandidate || isFocusTarget) {
        this.structureGraphics.lineStyle(
          isFocusTarget ? 5 : 3,
          isFocusTarget ? 0xff6b6b : 0x4de1c1,
          isFocusTarget ? 1 : 0.8,
        );
        this.structureGraphics.strokeCircle(center.x, center.y, 25);
        if (isFocusTarget) {
          this.structureGraphics.lineBetween(
            center.x - 18,
            center.y - 18,
            center.x + 18,
            center.y + 18,
          );
          this.structureGraphics.lineBetween(
            center.x + 18,
            center.y - 18,
            center.x - 18,
            center.y + 18,
          );
        }
      }

      if (isDisruptCandidate) {
        this.structureGraphics.fillStyle(0x9d8cff, 0.16);
        this.structureGraphics.fillRect(
          center.x - 24,
          center.y - 24,
          48,
          48,
        );
        this.structureGraphics.lineStyle(4, 0x9d8cff, 0.95);
        this.structureGraphics.strokeRect(
          center.x - 24,
          center.y - 24,
          48,
          48,
        );
      }

      if (isDisruptOutOfRange) {
        this.structureGraphics.lineStyle(2, 0xff7b8f, 0.55);
        this.structureGraphics.strokeCircle(center.x, center.y, 23);
        this.structureGraphics.lineBetween(
          center.x - 15,
          center.y - 15,
          center.x + 15,
          center.y + 15,
        );
      }

      if (
        structure.kind === 'tower' &&
        this.attackCombat?.isTowerDisabled(structure.id)
      ) {
        this.structureGraphics.lineStyle(4, 0x4de1c1, 1);
        this.structureGraphics.strokeCircle(center.x, center.y, 22);
        this.structureGraphics.lineBetween(
          center.x - 12,
          center.y - 16,
          center.x + 12,
          center.y + 16,
        );
        const disruptRatio = Math.min(
          1,
          this.attackCombat.disruptRemainingMs(structure.id) /
            this.attackCombat.config.disruptDurationMs,
        );
        this.structureGraphics.fillStyle(0x251f32, 1);
        this.structureGraphics.fillRect(center.x - 18, center.y + 28, 36, 5);
        this.structureGraphics.fillStyle(0x4de1c1, 1);
        this.structureGraphics.fillRect(
          center.x - 18,
          center.y + 28,
          36 * disruptRatio,
          5,
        );
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
      this.spriteRenderer.renderDefenders([]);
      return;
    }
    this.spriteRenderer.renderDefenders(this.combat.enemies);

    for (const enemy of this.combat.enemies) {
      const x =
        GRID_OFFSET_X +
        enemy.renderColumn * GRID_CELL_SIZE +
        GRID_CELL_SIZE / 2;
      const y =
        GRID_OFFSET_Y + enemy.renderRow * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;

      this.enemyGraphics.fillStyle(0x251f32, 1);
      this.enemyGraphics.fillRect(x - 15, y - 21, 30, 4);
      this.enemyGraphics.fillStyle(0xff8b8b, 1);
      this.enemyGraphics.fillRect(x - 15, y - 21, 30 * enemy.healthRatio, 4);
    }
  }

  private renderAttackers(): void {
    this.attackerGraphics.clear();
    if (
      this.attackCombat === null ||
      (this.phase !== 'attack-combat' && this.phase !== 'attack-result')
    ) {
      this.spriteRenderer.renderAttackers([]);
      this.spriteRenderer.renderCommander(null);
      return;
    }

    const commander = this.attackCombat.commander;
    this.spriteRenderer.renderAttackers(this.attackCombat.units);
    this.spriteRenderer.renderCommander(commander);
    const center = this.gridCenter(commander.position);
    if (this.isFocusTargeting) {
      this.attackerGraphics.fillStyle(0x4de1c1, 0.1);
      this.attackerGraphics.fillCircle(
        center.x,
        center.y,
        GRID_CELL_SIZE * this.attackCombat.config.focusFireCommandRadius,
      );
    } else if (this.isDisruptTargeting) {
      this.attackerGraphics.fillStyle(0x9d8cff, 0.1);
      this.attackerGraphics.fillCircle(
        center.x,
        center.y,
        GRID_CELL_SIZE * this.attackCombat.config.disruptRange,
      );
    }

    for (const unit of this.attackCombat.units) {
      const x = GRID_OFFSET_X + unit.renderColumn * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
      const y = GRID_OFFSET_Y + unit.renderRow * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
      this.drawHealthBar(this.attackerGraphics, x, y - 20, unit.healthRatio, 30);
      if (this.attackCombat.isUnitFocused(unit.id)) {
        this.attackerGraphics.lineStyle(3, 0xff6b6b, 0.95);
        this.attackerGraphics.strokeCircle(x, y, 19);
      } else if (this.isFocusTargeting && this.isUnitInFocusCommandRadius(unit)) {
        this.attackerGraphics.lineStyle(3, 0x4de1c1, 0.9);
        this.attackerGraphics.strokeCircle(x, y, 18);
      }
    }

    this.attackerGraphics.lineStyle(4, 0xe0fff8, 1);
    this.attackerGraphics.strokeCircle(center.x, center.y, 22);
    this.drawHealthBar(
      this.attackerGraphics,
      center.x,
      center.y - 27,
      commander.healthRatio,
      38,
    );

    if (this.isFocusTargeting) {
      this.attackerGraphics.lineStyle(3, 0x4de1c1, 0.7);
      this.attackerGraphics.strokeCircle(
        center.x,
        center.y,
        GRID_CELL_SIZE * this.attackCombat.config.focusFireCommandRadius,
      );
    }
    if (this.isDisruptTargeting) {
      this.attackerGraphics.lineStyle(3, 0x9d8cff, 0.8);
      this.attackerGraphics.strokeCircle(
        center.x,
        center.y,
        GRID_CELL_SIZE * this.attackCombat.config.disruptRange,
      );
    }
  }

  private isUnitInFocusCommandRadius(unit: {
    readonly renderColumn: number;
    readonly renderRow: number;
  }): boolean {
    if (this.attackCombat === null) return false;
    return (
      Math.hypot(
        unit.renderColumn - this.attackCombat.commander.position.column,
        unit.renderRow - this.attackCombat.commander.position.row,
      ) <= this.attackCombat.config.focusFireCommandRadius
    );
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

  private presentCombatEvents(events: readonly CombatEvent[]): void {
    if (events.length === 0) return;
    this.spriteRenderer.present(events);
    this.effects.present(events);
    this.audioDirector.present(events);
  }

  private failureMessage(reason: DefenseEditFailureReason): string {
    const messages: Readonly<Record<DefenseEditFailureReason, string>> = {
      'outside-map': '전장 밖에는 시설을 배치할 수 없습니다.',
      'reserved-cell': '진입점과 코어 보호 구역에는 시설을 배치할 수 없습니다.',
      'occupied-cell': '이미 다른 시설이 있는 칸입니다.',
      'structure-not-found': '선택한 시설을 찾을 수 없습니다.',
      'path-blocked': '모든 진입점에 경로가 남아야 합니다. 완전한 길막은 허용되지 않습니다.',
      'insufficient-funds': '건설 부품이 부족합니다. 시설을 판매하거나 다음 라운드 보상을 받으세요.',
      'not-upgradable': '블록 벽은 업그레이드할 수 없습니다.',
      'max-level': `이 타워는 이미 최대 ${MAX_TOWER_LEVEL}레벨입니다.`,
    };
    return messages[reason];
  }

  private startDefenseCombat(): void {
    if (this.phase !== 'preparation') {
      return;
    }

    this.editor.saveBlueprint();
    this.selectedStructureId = null;
    this.defenseStructureCountAtStart = this.editor.battlefield.structures.length;
    this.combat = new DefenseCombat(
      this.editor.battlefield,
      createPrototypeDefenseWave(this.roundSession.currentRound),
      createPrototypeDefenseCombatConfig(),
    );
    this.phase = 'combat';
    this.firstRunGuide.beginDefenseCombat();
    this.resultText.setVisible(false);
    this.audioDirector.playUi('confirm');
    this.setStatus('방어전 시작! 타워가 자동으로 공격하며 적은 시설과 코어를 노립니다.');
    this.updatePhaseInterface();
    this.renderGuideCoachMark();
    this.renderBattlefield();
  }

  private finishDefenseCombat(): void {
    if (this.combat === null || this.phase !== 'combat') {
      return;
    }

    this.phase = 'result';
    this.hideGuideCoachMark();
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
        `방어 결과 · ${this.roundName()}\n${won ? '방어 성공' : '방어 실패'}\n\n처치 ${this.combat.killCount}  |  누수 ${this.combat.leakCount}\n코어 피해 ${this.combat.leakDamage}  |  남은 체력 ${this.combat.coreHealth}/${this.combat.config.coreMaxHealth}\n${this.defenseStandoutText()}\n\n${won ? this.roundSession.currentRound === 1 && !this.roundSession.isChallengeMode ? '[Enter] 역할 반전' : '[Enter] 내 기지 공격 준비' : this.roundSession.isChallengeMode ? '도전 종료 · [R] 처음부터 다시 시작' : '[R] 전투 전 설계로 복원'}`,
      )
      .setVisible(true);
    this.setStatus(
      won
        ? '코어가 버텨냈습니다. 저장된 설계와 시설 체력은 공격 전에 복원됩니다.'
        : this.roundSession.isChallengeMode
          ? `코어가 파괴되어 챌린지가 종료되었습니다. ${this.challengeRecordText()}`
          : '코어가 파괴되었습니다. R 키를 누르면 전투 전 설계를 복원합니다.',
      !won,
    );
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private startAttackPreparation(): void {
    if (this.phase !== 'result' && this.phase !== 'role-reversal') return;
    this.roleReversalTimer?.remove(false);
    this.roleReversalTimer = null;
    this.editor.restoreBlueprint();
    this.combat = null;
    this.clearAttackState();
    this.squadPlan = createPrototypeSquadPlan(this.roundSession.currentRound);
    this.phase = 'attack-preparation';
    this.firstRunGuide.beginAttackPreparation();
    this.attackPreparationRemainingMs = ATTACK_PREPARATION_DURATION_MS;
    this.selectedAttackLane = 1;
    this.selectedAttackUnitKind = 'tank';
    this.resultText.setVisible(false);
    this.tutorialOverlay.setVisible(false);
    this.setStatus(
      '추천 부대가 배치되었습니다. 자신의 방어선에 맞게 출격 순서와 진입로를 바꾸세요.',
    );
    this.updatePhaseInterface();
    this.renderGuideCoachMark();
    this.renderBattlefield();
  }

  private addUnitToLane(laneIndex: number): void {
    if (this.squadPlan === null) return;
    this.selectedAttackLane = laneIndex;
    const added = this.squadPlan.addUnit(laneIndex, this.selectedAttackUnitKind);
    this.setStatus(
      added
        ? `${laneIndex + 1}번 진입로 대기열에 유닛을 추가했습니다.`
        : '출격 포인트가 부족합니다.',
      !added,
    );
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private startAttackCombat(): void {
    if (this.phase !== 'attack-preparation' || this.squadPlan === null) return;
    if (this.squadPlan.unitCount === 0) {
      this.setStatus('최소 한 명의 일반 유닛을 편성해야 합니다.', true);
      return;
    }

    this.attackCombat = new AttackCombat(
      this.editor.battlefield,
      this.squadPlan,
      createPrototypeAttackCombatConfig(this.roundSession.currentRound),
    );
    this.isFocusTargeting = false;
    this.isDisruptTargeting = false;
    this.phase = 'attack-combat';
    this.firstRunGuide.beginAttackCombat();
    this.resultText.setVisible(false);
    this.audioDirector.playUi('confirm');
    this.setStatus('공격 시작! WASD로 지휘관을 이동하고 Q 집중 공격, E 교란을 사용하세요.');
    this.updatePhaseInterface();
    this.renderGuideCoachMark();
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
    if (moved) {
      this.firstRunGuide.recordCommanderMovement();
      this.renderGuideCoachMark();
      this.renderBattlefield();
    }
  }

  private finishAttackCombat(): void {
    if (this.attackCombat === null || this.phase !== 'attack-combat') return;
    this.isFocusTargeting = false;
    this.isDisruptTargeting = false;
    this.phase = 'attack-result';
    this.firstRunGuide.complete();
    this.firstRunGuideService.markCompleted();
    this.hideGuideCoachMark();
    const won = this.attackCombat.state === 'won';
    const completedRound = won
      ? this.roundSession.recordAttackVictory(this.attackCombat.elapsedTimeMs)
      : null;
    this.latestRecordNotice = '';
    if (
      won &&
      completedRound !== null &&
      this.roundSession.isChallengeMode
    ) {
      const recordUpdate = this.gameRecordService.recordChallengeCompletion(
        this.roundSession.challengeRound,
        completedRound.attackTimeMs,
      );
      this.playerRecord = recordUpdate.record;
      this.latestRecordNotice = recordUpdate.isNewBest
        ? '신기록! 개인 최고 기록을 브라우저에 저장했습니다.'
        : `개인 최고: ${this.challengeBestText()}`;
      if (recordUpdate.isNewBest) void this.submitCurrentChallengeBest();
    }
    const failure =
      this.attackCombat.failureReason === 'commander-defeated'
        ? '지휘관 전투 불능'
        : this.attackCombat.failureReason === 'squad-defeated'
          ? '일반 부대 전멸'
          : '제한시간 초과';
    this.resultText
      .setColor(won ? GAME_COLORS.secondary : '#ff7b8f')
      .setText(
        `공격 결과 · ${this.roundName()}\n${won ? '기지 돌파 성공' : '공격 실패 · 도전 종료'}\n\n${won ? `돌파 시간 ${this.formatTime(completedRound?.attackTimeMs ?? 0)}` : `실패 원인: ${failure}`}\n${this.roundSession.isChallengeMode ? `${this.latestRecordNotice || this.challengeRecordText()}\n` : won ? this.nextUnlockText() : ''}\n${won ? '[Enter] 다음 라운드' : '[R] 1라운드부터 다시 시작'}`,
      )
      .setVisible(true);
    this.setStatus(
      won
        ? this.roundSession.isChallengeMode
          ? `${this.roundName()}을 돌파했습니다. ${this.challengeRecordText()}`
          : `자신이 만든 방어선을 돌파했습니다. 누적 공격 시간 ${this.formatTime(this.roundSession.totalAttackTimeMs)}.`
        : '지휘관 사망, 제한시간 초과 또는 일반 부대 전멸로 현재 도전이 종료되었습니다.',
      !won,
    );
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private async submitCurrentChallengeBest(): Promise<void> {
    const best = this.playerRecord.challengeBest;
    if (best === null) return;
    const result = await this.leaderboardService.submitChallengeBest(
      this.playerRecord.playerName,
      best,
    );
    if (result.status === 'online') {
      const rank = result.leaderboard?.currentPlayerEntry?.rank;
      this.setStatus(
        rank === undefined
          ? '개인 신기록을 온라인 순위표에 제출했습니다.'
          : `개인 신기록을 온라인 순위표에 제출했습니다. 현재 ${rank}위입니다.`,
      );
    }
    if (this.isLeaderboardOpen) this.renderLeaderboardResult(result);
  }

  private resetToPreparation(): void {
    this.editor.restoreBlueprint();
    this.combat = null;
    this.clearAttackState();
    this.phase = 'preparation';
    this.preparationRemainingMs = PREPARATION_DURATION_MS;
    this.selectedStructureId = null;
    this.resultText.setVisible(false);
    this.setStatus('전투 전 설계와 시설 체력을 복원했습니다. 다시 편집할 수 있습니다.');
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private clearAttackState(): void {
    this.attackCombat = null;
    this.squadPlan = null;
    this.isFocusTargeting = false;
    this.isDisruptTargeting = false;
  }

  private continueAfterAttackVictory(): void {
    if (this.phase !== 'attack-result' || this.attackCombat?.state !== 'won') {
      return;
    }
    if (
      this.roundSession.isNormalModeComplete &&
      !this.roundSession.isChallengeMode
    ) {
      this.showCampaignComplete();
      return;
    }
    this.roundSession.advanceToNextRound();
    this.beginAdvancedRound();
  }

  private startChallengeMode(): void {
    if (this.phase !== 'campaign-complete') return;
    if (!this.roundSession.enterChallengeMode()) return;
    this.beginAdvancedRound(
      '아이가 없는 방에서 장난감들이 스스로 움직입니다. 챌린지 전쟁이 시작됩니다.',
    );
  }

  private beginAdvancedRound(introduction?: string): void {
    this.resetToPreparation();
    this.editor.grantConstructionFunds(ROUND_CONSTRUCTION_REWARD);
    this.editor.saveBlueprint();
    const unlockMessage =
      this.roundSession.currentRound === 2
        ? ' 블록 박격포와 태엽 군단이 해금되었습니다.'
        : this.roundSession.currentRound === 3
          ? ' 태엽 관통포와 고무줄 사수가 해금되었습니다.'
          : '';
    this.setStatus(
      `${introduction ?? `${this.roundName()} 시작.`} 건설 부품 ${ROUND_CONSTRUCTION_REWARD}을 받아 총 ${this.editor.constructionFunds}입니다.${unlockMessage}`,
    );
  }

  private showCampaignComplete(): void {
    const recordUpdate = this.gameRecordService.recordNormalCompletion(
      this.roundSession.totalAttackTimeMs,
    );
    this.playerRecord = recordUpdate.record;
    this.latestRecordNotice = recordUpdate.isNewBest
      ? '신기록! 개인 최고 기록을 브라우저에 저장했습니다.'
      : `개인 최고 ${this.normalBestText()}`;
    this.phase = 'campaign-complete';
    this.resultText
      .setColor(GAME_COLORS.secondary)
      .setText(
        `일반 모드 완료\n5라운드 누적 ${this.formatTime(this.roundSession.totalAttackTimeMs)}\n${this.latestRecordNotice}\n기록일 ${this.normalBestDateText()}\n\n부모님: "밥 먹자!"\n아이가 방을 나가자 장난감들이 스스로 움직이기 시작한다.\n\n[Enter] 챌린지 모드 시작\n[R] 처음부터 다시 시작`,
      )
      .setVisible(true);
    this.setStatus('부모님의 식사 호출에 아이가 방을 나갑니다. 장난감들이 스스로 움직이기 시작합니다.');
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private restartCampaign(): void {
    this.scene.restart();
  }

  private formatTime(milliseconds: number): string {
    return `${(milliseconds / 1000).toFixed(1)}초`;
  }

  private defenseStandoutText(): string {
    const survivingStructures = this.editor.battlefield.structures;
    const standoutTower = [...survivingStructures]
      .filter(
        (structure) =>
          structure.kind === 'tower' && structure.towerArchetype !== null,
      )
      .sort(
        (left, right) =>
          right.health / right.maxHealth - left.health / left.maxHealth,
      )[0];
    const standoutText =
      standoutTower?.towerArchetype === null || standoutTower === undefined
        ? '수훈 타워 없음'
        : `수훈 타워 ${TOWER_NAMES[standoutTower.towerArchetype]} (${standoutTower.health}/${standoutTower.maxHealth})`;
    return `생존 시설 ${survivingStructures.length}/${this.defenseStructureCountAtStart}  |  ${standoutText}`;
  }

  private nextUnlockText(): string {
    if (this.roundSession.currentRound === 1) {
      return '다음 해금 · 블록 박격포와 태엽 군단';
    }
    if (this.roundSession.currentRound === 2) {
      return '다음 해금 · 태엽 관통포와 고무줄 사수';
    }
    return '';
  }

  private updatePhaseInterface(): void {
    this.syncCanvasAccessibilityState();
    this.syncPauseAvailability();
    if (this.phase === 'tutorial') {
      this.phaseText.setText('장난감 전쟁');
      this.combatInfoText.setText(
        `준비 시간 일시 정지\n${this.personalRecordSummary()}`,
      );
      this.helpText.setText(
        '핵심 흐름\n\n지킨다\n↓\n역할을 뒤집는다\n↓\n내 기지를 돌파한다\n\n[Enter] 시작  [Esc] 안내 건너뛰기\n[Tab] 순위표  [N] 닉네임\n[L] 개인 기록 초기화(두 번)',
      );
      return;
    }

    if (this.phase === 'role-reversal') {
      this.phaseText.setText('역할 반전');
      this.combatInfoText.setText(
        ['방어 설계 복원 완료', '다음 역할: 공격자', 'Enter: 바로 진행'].join(
          '\n',
        ),
      );
      this.helpText.setText(
        '같은 기지, 반대 역할\n\n추천 부대가 자동 편성됩니다.\n일반 유닛은 자동 전투하고\n지휘관은 직접 조작합니다.',
      );
      return;
    }

    if (this.phase === 'campaign-complete') {
      this.phaseText.setText('일반 모드 완료');
      this.combatInfoText.setText(
        [
          `완료: ${this.roundSession.completedRounds.length}/${this.roundSession.normalRoundCount}`,
          `누적: ${this.formatTime(this.roundSession.totalAttackTimeMs)}`,
          '다음: 챌린지 모드',
        ].join('\n'),
      );
      this.helpText.setText(
        '[Enter] 챌린지 시작\n[R] 일반 모드 다시 시작\n[Tab] 순위표  [N] 닉네임',
      );
      return;
    }

    if (this.phase === 'preparation') {
      this.phaseText.setText(
        `${this.roundLabel()} 방어 준비 ${Math.ceil(this.preparationRemainingMs / 1000)}초`,
      );
      this.combatInfoText.setText(
        [
          `건설 부품: ${this.editor.constructionFunds}`,
          `승리 보상: +${ROUND_CONSTRUCTION_REWARD}`,
          ...(this.roundSession.isChallengeMode
            ? [this.challengeRecordText()]
            : []),
          'Space: 즉시 시작',
        ].join('\n'),
      );
      this.helpText.setText(`${this.defenseHelpText()}\n[H] 첫 안내 다시 보기`);
      return;
    }

    if (this.phase === 'attack-preparation' && this.squadPlan !== null) {
      this.phaseText.setText(
        `${this.roundLabel()} 공격 준비 ${Math.ceil(this.attackPreparationRemainingMs / 1000)}초`,
      );
      this.combatInfoText.setText(
        [
          `출격 포인트: ${this.squadPlan.remainingSortiePoints}/${this.squadPlan.totalSortiePoints}`,
          `대기열: ${this.squadPlan.lanes.map((lane) => lane.length).join(' / ')}`,
          `지휘관: ${this.squadPlan.commanderLane + 1}번 진입로`,
          ...(this.roundSession.isChallengeMode
            ? [this.challengeRecordText()]
            : []),
        ].join('\n'),
      );
      this.helpText.setText(this.attackPreparationHelpText());
      return;
    }

    if (
      (this.phase === 'attack-combat' || this.phase === 'attack-result') &&
      this.attackCombat !== null
    ) {
      const activeDisruption = this.attackCombat.activeDisruptions[0];
      const disruptStatus =
        activeDisruption !== undefined
          ? `작동 ${Math.ceil(activeDisruption.remainingMs / 1000)}초`
          : this.attackCombat.disruptCooldownRemainingMs > 0
            ? `재사용 ${Math.ceil(this.attackCombat.disruptCooldownRemainingMs / 1000)}초`
            : '준비';
      this.phaseText.setText(
        `${this.roundLabel()} ${this.phase === 'attack-combat' ? '공격 전투' : '공격 종료'}`,
      );
      this.combatInfoText.setText(
        [
          `적 코어: ${this.attackCombat.coreHealth}/${this.attackCombat.config.coreMaxHealth}`,
          `지휘관: ${this.attackCombat.commander.health}/${this.attackCombat.commander.maxHealth}`,
          `부대: ${this.attackCombat.units.length} (+${this.attackCombat.remainingSpawnCount})`,
          `집중 명령: ${this.attackCombat.focusedUnitCount}명`,
          `교란: ${disruptStatus}`,
          `시간: ${Math.ceil(this.attackCombat.remainingTimeMs / 1000)}초`,
          ...(this.roundSession.isChallengeMode
            ? [this.challengeRecordText()]
            : []),
        ].join('\n'),
      );
      this.helpText.setText(this.attackCombatHelpText());
      return;
    }

    if (this.combat === null) {
      return;
    }

    this.phaseText.setText(
      `${this.roundLabel()} ${this.phase === 'combat' ? '방어 전투' : '방어 종료'}`,
    );
    this.combatInfoText.setText(
      [
        `코어: ${this.combat.coreHealth}/${this.combat.config.coreMaxHealth}`,
        `적: ${this.combat.enemies.length} (+${this.combat.remainingSpawnCount})`,
        `처치: ${this.combat.killCount}`,
        `누수: ${this.combat.leakCount} · 피해 ${this.combat.leakDamage}`,
        ...(this.roundSession.isChallengeMode
          ? [this.challengeRecordText()]
          : []),
      ].join('\n'),
    );
    this.helpText.setText(this.defenseHelpText());
  }

  private syncCanvasAccessibilityState(): void {
    const phaseLabels: Readonly<Record<DefenseScenePhase, string>> = {
      tutorial: '게임 시작 안내',
      preparation: '방어 준비',
      combat: '방어 전투',
      result: '방어 결과',
      'role-reversal': '역할 반전',
      'attack-preparation': '공격 준비',
      'attack-combat': '공격 전투',
      'attack-result': '공격 결과',
      'campaign-complete': '일반 모드 완료',
    };
    this.game.canvas.dataset.gamePhase = this.phase;
    this.game.canvas.dataset.gamePaused = String(this.isPaused);
    this.game.canvas.dataset.guideStage = this.firstRunGuide.stage;
    this.game.canvas.dataset.guideMode = this.firstRunGuide.isDetailed
      ? 'detailed'
      : 'brief';
    this.game.canvas.setAttribute(
      'aria-label',
      `Toy Base Reversal · ${phaseLabels[this.phase]}`,
    );
  }

  private roundLabel(): string {
    return this.roundSession.isChallengeMode
      ? `챌린지 ${this.roundSession.challengeRound}R`
      : `${this.roundSession.currentRound}/${this.roundSession.normalRoundCount}R`;
  }

  private roundName(): string {
    return this.roundSession.isChallengeMode
      ? `챌린지 ${this.roundSession.challengeRound}라운드`
      : `${this.roundSession.currentRound}라운드`;
  }

  private challengeRecordText(): string {
    return `개인 최고 ${this.challengeBestText()}`;
  }

  private personalRecordSummary(): string {
    return [
      this.playerRecord.playerName,
      `일반: ${this.normalBestText()}`,
      `챌린지: ${this.challengeBestText()}`,
    ].join('\n');
  }

  private normalBestText(): string {
    const best = this.playerRecord.normalBest;
    return best === null
      ? '기록 없음'
      : this.formatTime(best.totalAttackTimeMs);
  }

  private normalBestDateText(): string {
    const best = this.playerRecord.normalBest;
    return best === null ? '-' : this.formatRecordDate(best.achievedAt);
  }

  private challengeBestText(): string {
    const best = this.playerRecord.challengeBest;
    return best === null
      ? '기록 없음'
      : `${best.round}R · ${this.formatTime(best.attackTimeMs)}`;
  }

  private formatRecordDate(isoDate: string): string {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(isoDate));
  }

  private defenseHelpText(): string {
    return [
      '상성 · 화살표 대상에게 강함',
      `[1] 팝건 ${TOWER_CONSTRUCTION_COSTS.popgun} → 사수`,
      `[2] 박격포 ${TOWER_CONSTRUCTION_COSTS.mortar} → 군단 (2R)`,
      `[3] 관통포 ${TOWER_CONSTRUCTION_COSTS.piercer} → 방패병 (3R)`,
      `[4] 블록 벽 ${OBSTACLE_CONSTRUCTION_COST}`,
      '',
      '설계 조작',
      '왼쪽 클릭: 배치 / 선택 / 이동',
      '오른쪽 클릭: 판매 (전액 환급)',
      '[Delete] 파괴 (환급 없음)',
      `[U] 선택 타워 강화 (최대 Lv.${MAX_TOWER_LEVEL})`,
      '[S] 설계 저장  [R] 복원',
      '[Space] 방어전 시작',
      '',
      '[Tab] 순위표  [N] 닉네임',
      '[M] 소리 켜기/끄기',
      '[Esc] 일시정지',
    ].join('\n');
  }

  private attackPreparationHelpText(): string {
    return [
      '상성 · 화살표 대상에게 강함',
      `[1] 방패병 ${attackUnitCost('tank')} → 팝건`,
      `[2] 태엽 군단 ${attackUnitCost('swarm')} → 관통포 (2R)`,
      `[3] 고무줄 사수 ${attackUnitCost('ranger')} → 박격포 (3R)`,
      '',
      '편성 조작',
      '[Q/W/E] 상/중/하 진입로 추가',
      '[Backspace] 선택 진입로 제거',
      '[X] 전체 비우기  [P] 추천 편성',
      '[C] 지휘관 진입로 변경',
      '[Space] 공격 시작',
      '[Tab] 순위표  [N] 닉네임',
      '[M] 소리 켜기/끄기',
      '[Esc] 일시정지',
      '',
      `진입로별 처음 ${SIMULTANEOUS_CAPACITY_PER_LANE}명은 동시에`,
      `나머지는 ${SQUAD_SPAWN_INTERVAL_MS / 1000}초 간격 출격합니다.`,
    ].join('\n');
  }

  private attackCombatHelpText(): string {
    return [
      '지휘관 조작',
      '[W/A/S/D] 지휘관 이동',
      '[Q] 집중 공격',
      '  타워 클릭 → 주변 부대 목표 고정',
      '  우클릭/Esc → 대상 선택 취소',
      '[E] 교란',
      '  반경 안 타워 클릭 → 완전 정지',
      '  우클릭/Esc → 대상 선택 취소',
      '',
      '일반 유닛은 자동으로 이동하고',
      '시설과 코어를 공격합니다.',
      '지휘관 사망 시 즉시 실패합니다.',
      '[M] 소리 켜기/끄기',
      '[Esc] 대상 취소 / 일시정지',
    ].join('\n');
  }

  private setStatus(message: string, isWarning = false): void {
    this.statusText.setColor(isWarning ? '#ff7b8f' : GAME_COLORS.secondary);
    this.statusText.setText(message);
    if (isWarning) this.audioDirector.playUi('error');
  }
}
