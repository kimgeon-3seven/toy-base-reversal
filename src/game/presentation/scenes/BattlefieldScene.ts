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
  defenseWavePreviewForRound,
  PREPARATION_DURATION_MS,
  PROTOTYPE_DEFENSE_COMBAT_CONFIG,
} from '../../config/DefenseCombatConfig';
import { GAME_COLORS, GAME_HEIGHT, GAME_WIDTH } from '../../config/GameConfig';
import { INITIAL_DEFENSE_PLACEMENTS } from '../../config/InitialDefenseConfig';
import {
  isTowerAvailable,
  isUnitAvailable,
  availableTowerArchetypes,
  availableUnitArchetypes,
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
import { defenseSortieRewardForRound } from '../../config/DefenseRewardConfig';
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
import { DefenseBuildDeck } from '../ui/DefenseBuildDeck';
import { AttackFormationDeck } from '../ui/AttackFormationDeck';
import { TextButton } from '../ui/TextButton';
import { DefenseRewardPresenter } from '../models/DefenseRewardPresentation';
import { RoundFlowHeader, type RoundFlowStep } from '../ui/RoundFlowHeader';
import { MissionPanel, type MissionPanelModel } from '../ui/MissionPanel';
import { RoundResultOverlay } from '../ui/RoundResultOverlay';
import { BattleFeedbackAdvisor } from '../models/BattleFeedbackAdvice';
import { IMAGE_ASSETS } from '../assets/GameAssets';
import { CommanderAbilityPanel } from '../ui/CommanderAbilityPanel';
import { TOY_UI } from '../ui/ToyUiTheme';
import {
  PlacementPreviewRenderer,
  type PlacementPreviewModel,
  type SelectedTowerRangeModel,
} from '../rendering/PlacementPreviewRenderer';

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
  private placementPreviewRenderer!: PlacementPreviewRenderer;
  private spriteRenderer!: BattlefieldSpriteRenderer;
  private effects!: BattlefieldEffects;
  private audioDirector!: BattlefieldAudioDirector;
  private audioControlPanel: AudioControlPanel | null = null;
  private pauseMenu: PauseMenu | null = null;
  private isPaused = false;
  private statusText!: Phaser.GameObjects.Text;
  private roundFlowHeader!: RoundFlowHeader;
  private missionPanel!: MissionPanel;
  private resultOverlay!: RoundResultOverlay;
  private commanderAbilityPanel!: CommanderAbilityPanel;
  private defenseBuildDeck!: DefenseBuildDeck;
  private attackFormationDeck!: AttackFormationDeck;
  private firstRunGuide!: FirstRunGuide;
  private tutorialOverlay!: Phaser.GameObjects.Container;
  private tutorialProgressText!: Phaser.GameObjects.Text;
  private tutorialRecordText!: Phaser.GameObjects.Text;
  private tutorialTitleText!: Phaser.GameObjects.Text;
  private tutorialBodyText!: Phaser.GameObjects.Text;
  private tutorialObjectiveText!: Phaser.GameObjects.Text;
  private tutorialControlText!: Phaser.GameObjects.Text;
  private tutorialStartButton!: TextButton;
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
  private hoveredGridPosition: GridPosition | null = null;
  private readonly defenseRewardPresenter = new DefenseRewardPresenter();
  private readonly feedbackAdvisor = new BattleFeedbackAdvisor();
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
    this.placementPreviewRenderer = new PlacementPreviewRenderer(this);
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
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerMove(pointer);
    });
    this.input.on('gameout', () => {
      if (this.hoveredGridPosition === null) return;
      this.hoveredGridPosition = null;
      this.renderBattlefield();
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
    this.add
      .rectangle(20, 14, 246, 64, TOY_UI.navy, 0.96)
      .setOrigin(0)
      .setStrokeStyle(3, TOY_UI.coral, 0.95)
      .setDepth(68);
    this.add.rectangle(58, 11, 58, 15, 0xe4cc8f, 0.7).setAngle(-4).setDepth(69);
    this.add.text(34, 24, 'TOY BASE REVERSAL', {
      color: '#fff2cf',
      fontFamily: TOY_UI.fontFamily,
      fontSize: '22px',
      fontStyle: 'bold',
    }).setDepth(69);

    this.add.text(34, 53, '지키고, 뒤집고, 직접 돌파하라', {
      color: '#9fe3c3',
      fontFamily: TOY_UI.fontFamily,
      fontSize: '13px',
      fontStyle: 'bold',
    }).setDepth(69);

    this.roundFlowHeader = new RoundFlowHeader(this);
    this.missionPanel = new MissionPanel(this);

    this.statusText = this.add.text(32, 779, '', {
      color: GAME_COLORS.secondary,
      fontFamily: TOY_UI.fontFamily,
      fontSize: '13px',
      fontStyle: 'bold',
      backgroundColor: '#15131ecc',
      padding: { x: 8, y: 3 },
      wordWrap: { width: 930 },
    }).setDepth(61);

    this.resultOverlay = new RoundResultOverlay(this);
    this.commanderAbilityPanel = new CommanderAbilityPanel(
      this,
      () => this.beginFocusTargeting(),
      () => this.beginDisruptTargeting(),
    );

    this.defenseBuildDeck = new DefenseBuildDeck(this, {
      selectTower: (tower) => this.selectTower(tower),
      selectObstacle: () => this.selectObstacle(),
      upgrade: () => this.upgradeSelectedTower(),
      undo: () => this.undoDefenseEdit(),
      redo: () => this.redoDefenseEdit(),
      save: () => this.saveDefenseBlueprint(),
      reset: () => this.resetDefenseBlueprint(),
      start: () => this.startDefenseCombat(),
    });
    this.attackFormationDeck = new AttackFormationDeck(this, {
      selectUnit: (unit) => this.selectAttackUnit(unit),
      addUnit: (laneIndex) => this.addUnitToLane(laneIndex),
      removeUnit: (laneIndex) => this.removeUnitFromLane(laneIndex),
      recommend: () => this.applyRecommendedSquad(),
      clear: () => this.clearSquadPlan(),
      start: () => this.startAttackCombat(),
    });

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
      0x10251e,
      0.84,
    );
    const paper = this.add
      .image(0, 0, IMAGE_ASSETS.paperTexture)
      .setDisplaySize(760, 500)
      .setAlpha(0.99);
    const panel = this.add
      .rectangle(0, 0, 760, 500, TOY_UI.paper, 0.1)
      .setStrokeStyle(4, TOY_UI.teal, 0.95);
    const tapeLeft = this.add.rectangle(-282, -251, 92, 21, 0xe4cc8f, 0.76).setAngle(-5);
    const tapeRight = this.add.rectangle(282, -251, 92, 21, 0xe4cc8f, 0.76).setAngle(5);
    this.tutorialProgressText = this.add
      .text(-330, -205, '', {
        color: '#0b615a',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '18px',
        fontStyle: 'bold',
      });
    this.tutorialRecordText = this.add
      .text(330, -205, '', {
        align: 'right',
        color: TOY_UI.mutedInk,
        fontFamily: TOY_UI.fontFamily,
        fontSize: '15px',
        lineSpacing: 3,
      })
      .setOrigin(1, 0);
    this.tutorialTitleText = this.add
      .text(0, -170, '', {
        align: 'center',
        color: '#9d332e',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '32px',
        fontStyle: 'bold',
        wordWrap: { width: 650 },
      })
      .setOrigin(0.5, 0);
    this.tutorialBodyText = this.add
      .text(0, -68, '', {
        align: 'center',
        color: TOY_UI.ink,
        fontFamily: TOY_UI.fontFamily,
        fontSize: '21px',
        lineSpacing: 8,
        wordWrap: { width: 650 },
      })
      .setOrigin(0.5, 0);
    this.tutorialObjectiveText = this.add
      .text(0, 112, '', {
        align: 'center',
        backgroundColor: '#dce9d2',
        color: '#0b615a',
        fontFamily: TOY_UI.fontFamily,
        fontSize: '19px',
        fontStyle: 'bold',
        padding: { x: 18, y: 12 },
        wordWrap: { width: 620 },
      })
      .setOrigin(0.5, 0);
    this.tutorialControlText = this.add
      .text(
        0,
        231,
        '',
        {
          align: 'center',
          color: TOY_UI.mutedInk,
          fontFamily: TOY_UI.fontFamily,
          fontSize: '14px',
          lineSpacing: 5,
        },
      )
      .setOrigin(0.5);
    this.tutorialStartButton = new TextButton(
      this,
      0,
      187,
      300,
      48,
      '게임 시작  [Enter]',
      () => this.startFromOpening(),
      {
        fill: TOY_UI.teal,
        hover: 0x22b7a6,
        stroke: TOY_UI.tealDark,
        text: '#fff7df',
      },
    );

    this.tutorialOverlay = this.add
      .container(640, GAME_HEIGHT / 2, [
        backdrop,
        paper,
        panel,
        tapeLeft,
        tapeRight,
        this.tutorialProgressText,
        this.tutorialRecordText,
        this.tutorialTitleText,
        this.tutorialBodyText,
        this.tutorialObjectiveText,
        this.tutorialStartButton.gameObject,
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
    this.tutorialTitleText.setText('내가 만든 방어선을,\n이번에는 내가 뚫는다');
    this.tutorialBodyText.setText(
      isDetailed
        ? '장난감 요새를 지킨 뒤 공격자로 역할을 바꿉니다.\n방어를 잘할수록 더 강한 공격 부대를 얻습니다.'
        : '기지를 지키고, 같은 기지를 더 빠르게 돌파하세요.',
    );
    this.tutorialObjectiveText.setText(
      '1  설계   →   2  방어   →   3  역할 반전   →   4  공략',
    );
    this.tutorialControlText.setText(
      '[Esc] 안내 건너뛰기 · [Tab] 순위표 · [N] 닉네임',
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
    const defenseResult = this.roundSession.currentDefenseResult;
    if (defenseResult === null) {
      throw new Error('Role reversal requires a completed defense result.');
    }
    const reward = this.defenseRewardPresenter.present(defenseResult);
    this.editor.restoreBlueprint();
    this.combat = null;
    this.phase = 'role-reversal';
    this.resultOverlay.hide();
    this.hideGuideCoachMark();
    this.tutorialOverlay.setVisible(false);
    this.resultOverlay.show({
      eyebrow: '역할 반전 · 같은 설계, 반대 역할',
      title: '이제 네가 공격자다',
      metrics: ['방금 지킨 장난감 요새가 공략 대상이 됩니다.'],
      reward: `${reward.headline}\n${reward.breakdown}`,
      advice: '획득한 포인트로 부대를 만들고 지휘관을 살려 적 코어를 파괴하세요.',
      primaryAction: '[Enter] 바로 공격 준비',
      secondaryAction: '잠시 후 자동으로 진행됩니다.',
      tone: 'transition',
      onPrimary: () => this.startAttackPreparation(),
    });
    this.cameras.main.flash(260, 255, 209, 102, false);
    this.cameras.main.shake(300, 0.0045, false);
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
      this.selectObstacle();
    });

    this.input.keyboard?.on('keydown-S', () => {
      this.saveDefenseBlueprint();
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

      this.resetDefenseBlueprint();
    });

    this.input.keyboard?.on('keydown-U', () => {
      this.upgradeSelectedTower();
    });

    this.input.keyboard?.on('keydown-Z', (event: KeyboardEvent) => {
      if (
        this.phase !== 'preparation' ||
        (!event.ctrlKey && !event.metaKey)
      ) {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) this.redoDefenseEdit();
      else this.undoDefenseEdit();
    });

    this.input.keyboard?.on('keydown-Y', (event: KeyboardEvent) => {
      if (
        this.phase !== 'preparation' ||
        (!event.ctrlKey && !event.metaKey)
      ) {
        return;
      }
      event.preventDefault();
      this.redoDefenseEdit();
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
        this.beginFocusTargeting();
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
        this.beginDisruptTargeting();
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

    this.input.keyboard?.on('keydown-BACKSPACE', () => {
      this.removeUnitFromLane(this.selectedAttackLane);
    });

    this.input.keyboard?.on('keydown-X', () => {
      this.clearSquadPlan();
    });

    this.input.keyboard?.on('keydown-P', () => {
      this.applyRecommendedSquad();
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
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private selectObstacle(): void {
    if (this.phase !== 'preparation') return;
    this.activeKind = 'obstacle';
    this.selectedStructureId = null;
    this.setStatus(
      `블록 벽 배치 모드: 부품 ${OBSTACLE_CONSTRUCTION_COST}, 공격 능력 없이 진로를 지연시킵니다.`,
    );
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private upgradeSelectedTower(): void {
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
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private saveDefenseBlueprint(): void {
    if (this.phase !== 'preparation') return;
    this.editor.saveBlueprint();
    this.setStatus(
      `현재 설계와 남은 부품 ${this.editor.constructionFunds}을 저장 지점으로 지정했습니다.`,
    );
    this.updatePhaseInterface();
  }

  private resetDefenseBlueprint(): void {
    if (this.phase !== 'preparation') return;
    const restored = this.editor.restoreBlueprint();
    this.selectedStructureId = null;
    this.setStatus(
      restored
        ? `저장 지점의 설계와 부품 ${this.editor.constructionFunds}으로 초기화했습니다.`
        : '복구할 저장 지점이 없습니다.',
      !restored,
    );
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private undoDefenseEdit(): void {
    if (this.phase !== 'preparation') return;
    this.selectedStructureId = null;
    const restored = this.editor.undo();
    this.setStatus(
      restored
        ? '마지막 설계 변경 한 단계를 되돌렸습니다.'
        : '되돌릴 설계 변경이 없습니다.',
      !restored,
    );
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private redoDefenseEdit(): void {
    if (this.phase !== 'preparation') return;
    this.selectedStructureId = null;
    const restored = this.editor.redo();
    this.setStatus(
      restored
        ? '되돌렸던 설계 변경 한 단계를 다시 적용했습니다.'
        : '다시 적용할 설계 변경이 없습니다.',
      !restored,
    );
    this.updatePhaseInterface();
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

  private removeUnitFromLane(laneIndex: number): void {
    if (this.phase !== 'attack-preparation' || this.squadPlan === null) return;
    this.selectedAttackLane = laneIndex;
    const removed = this.squadPlan.removeLastUnit(laneIndex);
    this.setStatus(
      removed === null
        ? `${laneIndex + 1}번 진입로 대기열이 비어 있습니다.`
        : `${laneIndex + 1}번 진입로의 마지막 유닛을 제거하고 ${attackUnitCost(removed)}P를 환급했습니다.`,
      removed === null,
    );
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private clearSquadPlan(): void {
    if (this.phase !== 'attack-preparation' || this.squadPlan === null) return;
    const refunded = this.squadPlan.clearUnits();
    this.setStatus(
      refunded === 0
        ? '편성된 일반 유닛이 없습니다.'
        : `전체 편성을 비우고 출격 포인트 ${refunded}를 전액 환급했습니다.`,
      refunded === 0,
    );
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private applyRecommendedSquad(): void {
    if (this.phase !== 'attack-preparation') return;
    this.squadPlan = createPrototypeSquadPlan(
      this.roundSession.currentRound,
      true,
      this.squadPlan?.totalBudget,
    );
    this.selectedAttackLane = 1;
    this.setStatus('방어선 상성을 고려한 추천 편성으로 초기화했습니다.');
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

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const showsBoardInteraction =
      this.phase === 'preparation' ||
      (this.phase === 'attack-combat' &&
        (this.isFocusTargeting || this.isDisruptTargeting));
    const nextPosition = showsBoardInteraction
      ? this.pointerToGrid(pointer)
      : null;
    if (
      this.hoveredGridPosition?.key === nextPosition?.key ||
      (this.hoveredGridPosition === null && nextPosition === null)
    ) {
      return;
    }
    this.hoveredGridPosition = nextPosition;
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

  private beginFocusTargeting(): void {
    if (this.phase !== 'attack-combat') return;
    if (this.isFocusTargeting) {
      this.isFocusTargeting = false;
      this.setStatus('집중 공격 대상 선택을 취소했습니다.');
      this.updatePhaseInterface();
      this.renderBattlefield();
      return;
    }
    if (this.attackCombat?.canIssueFocusFire !== true) {
      this.setStatus('집중 공격 재사용 대기 중입니다.', true);
      return;
    }
    this.isDisruptTargeting = false;
    this.isFocusTargeting = true;
    this.setStatus(
      '집중 공격: 밝게 표시된 타워를 클릭하세요. 지휘관 주변 유닛만 명령을 받습니다.',
    );
    this.updatePhaseInterface();
    this.renderBattlefield();
  }

  private beginDisruptTargeting(): void {
    if (this.phase !== 'attack-combat') return;
    if (this.isDisruptTargeting) {
      this.isDisruptTargeting = false;
      this.setStatus('교란 대상 선택을 취소했습니다.');
      this.updatePhaseInterface();
      this.renderBattlefield();
      return;
    }
    if (this.attackCombat?.canIssueDisrupt !== true) {
      this.setStatus('교란 재사용 대기 중입니다.', true);
      return;
    }
    this.isFocusTargeting = false;
    this.isDisruptTargeting = true;
    this.setStatus(
      '교란: 보라색으로 표시된 사거리 안의 타워를 클릭하세요.',
    );
    this.updatePhaseInterface();
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
    this.renderPlacementPreview();
    this.renderEnemies();
    this.renderAttackers();
    this.missionPanel.render(this.missionPanelModel());
  }

  private renderPlacementPreview(): void {
    this.placementPreviewRenderer.render(
      this.placementPreviewModel(),
      this.selectedTowerRangeModel(),
    );
  }

  private placementPreviewModel(): PlacementPreviewModel | null {
    if (this.phase !== 'preparation' || this.hoveredGridPosition === null) {
      return null;
    }

    const position = this.hoveredGridPosition;
    const existing = this.editor.battlefield.findStructureAt(position);
    const selected = this.editor.battlefield.structures.find(
      (structure) => structure.id === this.selectedStructureId,
    );
    if (existing !== null && selected === undefined) {
      return {
        position,
        tone: 'select',
        label: '클릭: 선택 · 우클릭: 판매',
        texture: this.structurePreviewTexture(
          existing.kind,
          existing.towerArchetype,
        ),
        displaySize: existing.kind === 'tower' ? 66 : 53,
        towerRangeInCells:
          existing.towerArchetype === null
            ? null
            : this.towerRangeInCells(existing.towerArchetype),
      };
    }

    const kind = selected?.kind ?? this.activeKind;
    const towerArchetype =
      selected?.towerArchetype ??
      (kind === 'tower' ? this.activeTowerArchetype : null);
    const failure = this.editor.previewPlacement(
      kind,
      position,
      towerArchetype,
      selected?.id ?? null,
    );
    return {
      position,
      tone: failure === null ? 'valid' : 'invalid',
      label:
        failure === null
          ? selected === undefined
            ? '클릭하여 배치'
            : '클릭하여 무료 재배치'
          : this.previewFailureLabel(failure),
      texture: this.structurePreviewTexture(kind, towerArchetype),
      displaySize: kind === 'tower' ? 66 : 53,
      towerRangeInCells:
        towerArchetype === null
          ? null
          : this.towerRangeInCells(towerArchetype),
    };
  }

  private selectedTowerRangeModel(): SelectedTowerRangeModel | null {
    if (this.phase !== 'preparation' || this.hoveredGridPosition !== null) {
      return null;
    }
    const selected = this.editor.battlefield.structures.find(
      (structure) => structure.id === this.selectedStructureId,
    );
    if (selected?.towerArchetype === null || selected === undefined) return null;
    return {
      position: selected.position,
      rangeInCells: this.towerRangeInCells(selected.towerArchetype),
    };
  }

  private structurePreviewTexture(
    kind: StructureKind,
    towerArchetype: TowerArchetype | null,
  ): string {
    if (kind === 'obstacle') return IMAGE_ASSETS.obstacle;
    if (towerArchetype === 'mortar') return IMAGE_ASSETS.towerMortar;
    if (towerArchetype === 'piercer') return IMAGE_ASSETS.towerPiercer;
    return IMAGE_ASSETS.towerPopgun;
  }

  private towerRangeInCells(towerArchetype: TowerArchetype): number {
    return PROTOTYPE_DEFENSE_COMBAT_CONFIG.towers[towerArchetype].rangeInCells;
  }

  private previewFailureLabel(reason: DefenseEditFailureReason): string {
    const labels: Partial<Record<DefenseEditFailureReason, string>> = {
      'reserved-cell': '코어·진입로 보호 칸',
      'occupied-cell': '이미 사용 중인 칸',
      'path-blocked': '길이 완전히 막힙니다',
      'insufficient-funds': '건설 부품 부족',
      'outside-map': '전장 밖에는 배치 불가',
    };
    return labels[reason] ?? '이 칸에는 배치할 수 없음';
  }

  private renderPaths(): void {
    this.pathGraphics.clear();
    const paths = this.editor.battlefield.pathsFromEveryEntry();

    paths.forEach((path, index) => {
      const pathColor = PATH_COLORS[index] ?? PATH_COLORS[0];
      this.pathGraphics.lineStyle(6, pathColor, 0.32);
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
    this.boardGraphics.fillStyle(0x092c2b, 0.08);
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
          this.boardGraphics.fillStyle(0x68463c, 0.28);
          this.boardGraphics.fillRect(x + 1, y + 1, GRID_CELL_SIZE - 2, GRID_CELL_SIZE - 2);
        }

        const gridAlpha =
          this.phase === 'preparation' || this.phase === 'attack-preparation'
            ? 0.28
            : 0.12;
        this.boardGraphics.lineStyle(1, 0xfff4d6, gridAlpha);
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
      const isHovered = this.hoveredGridPosition?.equals(structure.position) === true;
      const targetingPulse = 0.5 + Math.sin(this.time.now * 0.009) * 0.5;
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
        if (isFocusCandidate && isHovered) {
          this.drawTargetReticle(
            this.structureGraphics,
            center,
            0xffd166,
            24 + targetingPulse * 5,
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
        if (isHovered) {
          this.drawTargetReticle(
            this.structureGraphics,
            center,
            0xbcb2ff,
            24 + targetingPulse * 5,
          );
        }
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
        if (isHovered) {
          this.structureGraphics.fillStyle(0xff7b8f, 0.13 + targetingPulse * 0.08);
          this.structureGraphics.fillCircle(center.x, center.y, 27);
        }
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
    const targetingPulse = 0.5 + Math.sin(this.time.now * 0.009) * 0.5;
    if (this.isFocusTargeting) {
      this.attackerGraphics.fillStyle(0x4de1c1, 0.08 + targetingPulse * 0.05);
      this.attackerGraphics.fillCircle(
        center.x,
        center.y,
        GRID_CELL_SIZE * this.attackCombat.config.focusFireCommandRadius,
      );
    } else if (this.isDisruptTargeting) {
      this.attackerGraphics.fillStyle(0x9d8cff, 0.08 + targetingPulse * 0.05);
      this.attackerGraphics.fillCircle(
        center.x,
        center.y,
        GRID_CELL_SIZE * this.attackCombat.config.disruptRange,
      );
    }

    const focusTarget = this.editor.battlefield.structures.find(
      (structure) => structure.id === this.attackCombat?.focusTargetId,
    );
    const focusTargetCenter =
      focusTarget === undefined ? null : this.gridCenter(focusTarget.position);
    for (const unit of this.attackCombat.units) {
      const x = GRID_OFFSET_X + unit.renderColumn * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
      const y = GRID_OFFSET_Y + unit.renderRow * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
      this.drawHealthBar(this.attackerGraphics, x, y - 20, unit.healthRatio, 30);
      if (this.attackCombat.isUnitFocused(unit.id)) {
        if (focusTargetCenter !== null) {
          this.attackerGraphics.lineStyle(2, 0xff6b6b, 0.22);
          this.attackerGraphics.lineBetween(
            x,
            y,
            focusTargetCenter.x,
            focusTargetCenter.y,
          );
        }
        this.attackerGraphics.lineStyle(3, 0xff6b6b, 0.95);
        this.attackerGraphics.strokeCircle(x, y, 19);
      } else if (this.isFocusTargeting && this.isUnitInFocusCommandRadius(unit)) {
        this.attackerGraphics.lineStyle(3, 0x4de1c1, 0.9);
        this.attackerGraphics.strokeCircle(x, y, 18);
      }
    }

    this.attackerGraphics.lineStyle(4, 0xe0fff8, 1);
    this.attackerGraphics.strokeCircle(center.x, center.y, 22);
    this.attackerGraphics.lineStyle(2, 0x4de1c1, 0.85);
    this.attackerGraphics.strokeCircle(
      center.x,
      center.y,
      26 + targetingPulse * 2,
    );
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

  private drawTargetReticle(
    graphics: Phaser.GameObjects.Graphics,
    center: Phaser.Math.Vector2,
    color: number,
    radius: number,
  ): void {
    const gap = 6;
    const length = 10;
    graphics.lineStyle(4, color, 1);
    graphics.lineBetween(center.x - radius, center.y, center.x - gap, center.y);
    graphics.lineBetween(center.x + gap, center.y, center.x + radius, center.y);
    graphics.lineBetween(center.x, center.y - radius, center.x, center.y - gap);
    graphics.lineBetween(center.x, center.y + gap, center.x, center.y + radius);
    graphics.lineStyle(2, color, 0.86);
    graphics.strokeCircle(center.x, center.y, Math.max(12, radius - length));
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
    this.resultOverlay.hide();
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
    const defensePerformance = {
      defeatedEnemies: this.combat.killCount,
      breachedEnemies: this.combat.leakCount,
      remainingCoreHealth: this.combat.coreHealth,
      coreMaxHealth: this.combat.config.coreMaxHealth,
    };
    const sortieReward = won
      ? defenseSortieRewardForRound(
          this.roundSession.currentRound,
          defensePerformance,
        )
      : null;
    const defenseResult =
      won && sortieReward !== null
        ? {
        ...defensePerformance,
            sortieReward,
          }
        : null;
    if (defenseResult !== null && !this.roundSession.isDefenseComplete) {
      this.roundSession.recordDefenseVictory(defenseResult);
    }
    const rewardPresentation =
      defenseResult === null
        ? null
        : this.defenseRewardPresenter.present(defenseResult);
    const defenseAdvice = this.feedbackAdvisor.forDefense({
      won,
      defeatedEnemies: this.combat.killCount,
      breachedEnemies: this.combat.leakCount,
      remainingCoreHealth: this.combat.coreHealth,
      coreMaxHealth: this.combat.config.coreMaxHealth,
      survivingStructures: this.editor.battlefield.structures.length,
      startingStructures: this.defenseStructureCountAtStart,
    });
    this.resultOverlay.show({
      eyebrow: `방어 결과 · ${this.roundName()}`,
      title: won ? '방어 성공' : '방어 실패',
      metrics: [
        `처치 ${this.combat.killCount} · 누수 ${this.combat.leakCount}`,
        `코어 ${this.combat.coreHealth}/${this.combat.config.coreMaxHealth} · 피해 ${this.combat.leakDamage}`,
      ],
      reward:
        rewardPresentation === null
          ? undefined
          : `${rewardPresentation.headline}\n${rewardPresentation.breakdown}`,
      advice: `${defenseAdvice}\n${this.defenseStandoutText()}`,
      primaryAction: won
        ? this.roundSession.currentRound === 1 && !this.roundSession.isChallengeMode
          ? '[Enter] 역할 반전'
          : '[Enter] 내 기지 공략'
        : this.roundSession.isChallengeMode
          ? '[R] 처음부터 다시 시작'
          : '[R] 설계로 돌아가기',
      secondaryAction:
        rewardPresentation === null ? undefined : rewardPresentation.strategyMessage,
      tone: won ? 'success' : 'failure',
      onPrimary: won
        ? this.roundSession.currentRound === 1 && !this.roundSession.isChallengeMode
          ? () => this.showRoleReversal()
          : () => this.startAttackPreparation()
        : this.roundSession.isChallengeMode
          ? () => this.restartCampaign()
          : () => this.resetToPreparation(),
    });
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
    const defenseResult = this.roundSession.currentDefenseResult;
    if (defenseResult === null) {
      throw new Error('Attack preparation requires a completed defense.');
    }
    this.squadPlan = createPrototypeSquadPlan(
      this.roundSession.currentRound,
      true,
      defenseResult.sortieReward.totalPoints,
    );
    this.phase = 'attack-preparation';
    this.firstRunGuide.beginAttackPreparation();
    this.attackPreparationRemainingMs = ATTACK_PREPARATION_DURATION_MS;
    this.selectedAttackLane = 1;
    this.selectedAttackUnitKind = 'tank';
    this.resultOverlay.hide();
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
    this.resultOverlay.hide();
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
    const recordOrUnlock = this.roundSession.isChallengeMode
      ? this.latestRecordNotice || this.challengeRecordText()
      : won
        ? this.nextUnlockText()
        : '';
    this.resultOverlay.show({
      eyebrow: `공격 결과 · ${this.roundName()}`,
      title: won ? '내 기지 돌파 성공' : '공격 실패',
      metrics: [
        won
          ? `돌파 시간 ${this.formatTime(completedRound?.attackTimeMs ?? 0)}`
          : `실패 원인 · ${failure}`,
        ...(recordOrUnlock.length > 0 ? [recordOrUnlock] : []),
      ],
      reward: won
        ? `누적 공격 시간 ${this.formatTime(this.roundSession.totalAttackTimeMs)}`
        : undefined,
      advice: this.feedbackAdvisor.forAttack(
        won,
        this.attackCombat.failureReason,
      ),
      primaryAction: won ? '[Enter] 다음 라운드' : '[R] 처음부터 다시 시작',
      secondaryAction: won ? '같은 설계를 양쪽 역할에서 모두 이겨냈습니다.' : undefined,
      tone: won ? 'success' : 'failure',
      onPrimary: won
        ? () => this.continueAfterAttackVictory()
        : () => this.restartCampaign(),
    });
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
    this.resultOverlay.hide();
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
    this.resultOverlay.show({
      eyebrow: '일반 모드 · 5라운드 완료',
      title: '장난감 전쟁은 끝나지 않았다',
      metrics: [
        `누적 돌파 시간 ${this.formatTime(this.roundSession.totalAttackTimeMs)}`,
        this.latestRecordNotice,
        `기록일 ${this.normalBestDateText()}`,
      ],
      reward: '부모님: “밥 먹자!”',
      advice: '아이가 방을 나가자, 장난감들이 스스로 움직이며 계속 싸우기 시작합니다.',
      primaryAction: '[Enter] 챌린지 모드 시작',
      secondaryAction: '[R] 일반 모드 다시 시작',
      tone: 'transition',
      onPrimary: () => this.startChallengeMode(),
      onSecondary: () => this.restartCampaign(),
    });
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
    this.renderPreparationDecks();
    this.roundFlowHeader.render({
      activeStep: this.flowStepForPhase(),
      roundLabel:
        this.phase === 'tutorial'
          ? '첫 출전'
          : this.phase === 'campaign-complete'
            ? '일반 완료'
            : this.roundLabel(),
    });
    this.missionPanel.render(this.missionPanelModel());
    this.renderCommanderAbilityPanel();
  }

  private renderCommanderAbilityPanel(): void {
    const combat = this.attackCombat;
    const visible = this.phase === 'attack-combat' && combat !== null;
    const focusState =
      this.isFocusTargeting
        ? 'targeting'
        : combat?.focusTargetId !== null && combat?.focusTargetId !== undefined
          ? 'active'
          : combat?.canIssueFocusFire === true
            ? 'ready'
            : 'cooldown';
    const disruptState =
      this.isDisruptTargeting
        ? 'targeting'
        : (combat?.activeDisruptions.length ?? 0) > 0
          ? 'active'
          : combat?.canIssueDisrupt === true
            ? 'ready'
            : 'cooldown';
    this.commanderAbilityPanel.render({
      visible,
      focus: {
        state: focusState,
        cooldownRemainingMs: combat?.focusCooldownRemainingMs ?? 0,
        cooldownDurationMs: combat?.config.focusFireCooldownMs ?? 1,
      },
      disrupt: {
        state: disruptState,
        cooldownRemainingMs: combat?.disruptCooldownRemainingMs ?? 0,
        cooldownDurationMs: combat?.config.disruptCooldownMs ?? 1,
      },
    });
  }

  private flowStepForPhase(): RoundFlowStep {
    if (this.phase === 'tutorial' || this.phase === 'preparation') return 'build';
    if (this.phase === 'combat' || this.phase === 'result') return 'defend';
    if (this.phase === 'role-reversal') return 'reverse';
    return 'break';
  }

  private missionPanelModel(): MissionPanelModel {
    if (this.phase === 'tutorial') {
      return {
        phaseLabel: '첫 임무',
        title: '기지를 지켜라',
        objective: '준비된 방어선을 지킨 뒤 역할 반전을 경험하세요.',
        stats: ['목표 · 일반 5라운드', ...this.personalRecordSummary().split('\n')],
        selection: '설계 → 방어 → 반전 → 공략',
        tip: '[Enter] 게임 시작\n[Tab] 순위표',
      };
    }

    if (this.phase === 'role-reversal') {
      const reward = this.roundSession.currentDefenseResult?.sortieReward;
      return {
        phaseLabel: `${this.roundLabel()} · 역할 반전`,
        title: '이제 공격자다',
        objective: '방금 지킨 같은 기지를 직접 돌파하세요.',
        stats:
          reward === undefined
            ? ['방어 설계 복원 완료']
            : [
                `출격 포인트 ${reward.totalPoints}P`,
                `기본 ${reward.basePoints} + 처치 ${reward.killBonus} + 코어 ${reward.coreHealthBonus}`,
              ],
        selection: '일반 유닛 · 자동 전투\n지휘관 · 직접 조작',
        tip: '잠시 후 자동 진행\n[Enter] 바로 진행',
      };
    }

    if (this.phase === 'campaign-complete') {
      return {
        phaseLabel: '일반 모드 완료',
        title: '장난감은 계속 싸운다',
        objective: '아이 없이 계속되는 챌린지 전쟁에 도전하세요.',
        stats: [
          `완료 ${this.roundSession.completedRounds.length}/${this.roundSession.normalRoundCount}R`,
          `누적 ${this.formatTime(this.roundSession.totalAttackTimeMs)}`,
          this.latestRecordNotice,
        ],
        selection: this.challengeRecordText(),
        tip: '[Enter] 챌린지 시작\n[R] 처음부터',
      };
    }

    if (this.phase === 'preparation') {
      const preview = defenseWavePreviewForRound(this.roundSession.currentRound);
      return {
        phaseLabel: `${this.roundLabel()} · 설계`,
        title: '방어선을 준비하세요',
        objective: '세 진입로를 확인하고 코어까지 오는 적을 막으세요.',
        stats: [
          `남은 시간 ${Math.ceil(this.preparationRemainingMs / 1000)}초`,
          `건설 부품 ${this.editor.constructionFunds}`,
          `적 ${preview.totalEnemies}명 · 진입로 ${preview.laneCounts.join('/')}`,
          this.projectedSortieRewardText(),
          ...(this.roundSession.isChallengeMode ? [this.challengeRecordText()] : []),
        ],
        selection: this.currentSelectionSummary(),
        tip: '타워 선택 → 격자 클릭\n[Space] 방어 시작',
      };
    }

    if (this.phase === 'attack-preparation' && this.squadPlan !== null) {
      const reward = this.roundSession.currentDefenseResult?.sortieReward;
      return {
        phaseLabel: `${this.roundLabel()} · 공략 준비`,
        title: '부대를 편성하세요',
        objective: '타워 상성에 맞춰 세 진입로의 출격 순서를 정하세요.',
        stats: [
          `남은 시간 ${Math.ceil(this.attackPreparationRemainingMs / 1000)}초`,
          `출격 포인트 ${this.squadPlan.remainingSortiePoints}/${this.squadPlan.totalSortiePoints}P`,
          `대기열 ${this.squadPlan.lanes.map((lane) => lane.length).join('/')}`,
          ...(reward === undefined
            ? []
            : [`보상 · 기본 ${reward.basePoints} + 처치 ${reward.killBonus} + 코어 ${reward.coreHealthBonus}`]),
        ],
        selection: `${UNIT_NAMES[this.selectedAttackUnitKind]} · ${attackUnitCost(this.selectedAttackUnitKind)}P\n강함 · ${unitCounterSummary(this.selectedAttackUnitKind)}`,
        tip: `유닛 선택 → 진입로 추가\n동시 ${SIMULTANEOUS_CAPACITY_PER_LANE}명 · 이후 ${SQUAD_SPAWN_INTERVAL_MS / 1000}초\n[Space] 공격 시작`,
      };
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
            ? `대기 ${Math.ceil(this.attackCombat.disruptCooldownRemainingMs / 1000)}초`
            : '준비';
      return {
        phaseLabel: `${this.roundLabel()} · 공략`,
        title: this.phase === 'attack-combat' ? '적 코어를 파괴하세요' : '공격 종료',
        objective: '지휘관을 지키며 핵심 타워부터 제거하세요.',
        stats: [
          `적 코어 ${this.attackCombat.coreHealth}/${this.attackCombat.config.coreMaxHealth}`,
          `지휘관 ${this.attackCombat.commander.health}/${this.attackCombat.commander.maxHealth}`,
          `부대 ${this.attackCombat.units.length} (+${this.attackCombat.remainingSpawnCount})`,
          `남은 시간 ${Math.ceil(this.attackCombat.remainingTimeMs / 1000)}초`,
        ],
        selection: `집중 공격 · ${this.attackCombat.canIssueFocusFire ? '준비' : '재사용 대기'}\n교란 · ${disruptStatus}`,
        tip: '[WASD] 이동\n[Q] 집중 공격 · [E] 교란',
        warning: this.attackCombat.commander.health / this.attackCombat.commander.maxHealth < 0.35,
      };
    }

    if (this.combat !== null) {
      return {
        phaseLabel: `${this.roundLabel()} · 방어`,
        title: this.phase === 'combat' ? '코어를 지켜보세요' : '방어 종료',
        objective: '타워는 자동 공격합니다. 누수는 비용만큼 코어에 피해를 줍니다.',
        stats: [
          `코어 ${this.combat.coreHealth}/${this.combat.config.coreMaxHealth}`,
          `남은 적 ${this.combat.enemies.length} (+${this.combat.remainingSpawnCount})`,
          `처치 ${this.combat.killCount} · 누수 ${this.combat.leakCount}`,
          this.projectedSortieRewardText(),
        ],
        selection: `남은 시설 ${this.editor.battlefield.structures.length}\n처치와 코어 체력 → 출격 포인트`,
        tip: '어느 진입로가 새는지 확인하세요.\n[Esc] 일시정지',
        warning: this.combat.coreHealth / this.combat.config.coreMaxHealth < 0.35,
      };
    }

    return {
      phaseLabel: '작전 대기',
      title: '다음 단계를 준비합니다',
      objective: '잠시만 기다려주세요.',
      stats: [],
      tip: '[Esc] 일시정지',
    };
  }

  private currentSelectionSummary(): string {
    const selected =
      this.selectedStructureId === null
        ? null
        : (this.editor.battlefield.structures.find(
            (structure) => structure.id === this.selectedStructureId,
          ) ?? null);
    if (selected !== null) {
      const name =
        selected.kind === 'tower' && selected.towerArchetype !== null
          ? `${TOWER_NAMES[selected.towerArchetype]} Lv.${selected.upgradeLevel}`
          : '블록 벽';
      return `${name}\n체력 ${selected.health}/${selected.maxHealth}\n${selected.kind === 'tower' ? `강화 ${this.editor.upgradeCost(selected) === null ? '최대' : `${this.editor.upgradeCost(selected)} 부품`}` : '길목을 지연시킴'}`;
    }
    const name =
      this.activeKind === 'tower'
        ? TOWER_NAMES[this.activeTowerArchetype]
        : '블록 벽';
    const counter =
      this.activeKind === 'tower'
        ? `강함 · ${towerCounterSummary(this.activeTowerArchetype)}`
        : '공격 없음 · 이동 지연';
    return `${name}\n${counter}\n보유 ${this.editor.constructionFunds} 부품 · 강화 최대 Lv.${MAX_TOWER_LEVEL}`;
  }

  private projectedSortieRewardText(): string {
    const resolvedEnemies =
      (this.combat?.killCount ?? 0) + (this.combat?.leakCount ?? 0);
    const reward = defenseSortieRewardForRound(
      this.roundSession.currentRound,
      resolvedEnemies === 0
        ? {
            defeatedEnemies: 1,
            breachedEnemies: 0,
            remainingCoreHealth: 1,
            coreMaxHealth: 1,
          }
        : {
            defeatedEnemies: this.combat?.killCount ?? 0,
            breachedEnemies: this.combat?.leakCount ?? 0,
            remainingCoreHealth: this.combat?.coreHealth ?? 1,
            coreMaxHealth: this.combat?.config.coreMaxHealth ?? 1,
          },
    );
    return `${resolvedEnemies === 0 ? '최대' : '현재 예상'} 출격 ${reward.totalPoints}P`;
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

  private renderPreparationDecks(): void {
    const isDefensePreparation = this.phase === 'preparation';
    this.defenseBuildDeck.setVisible(isDefensePreparation);
    if (isDefensePreparation) {
      const selected =
        this.selectedStructureId === null
          ? null
          : (this.editor.battlefield.structures.find(
              (structure) => structure.id === this.selectedStructureId,
            ) ?? null);
      const upgradeCost =
        selected === null ? null : this.editor.upgradeCost(selected);
      this.defenseBuildDeck.render({
        activeKind: this.activeKind,
        activeTower: this.activeTowerArchetype,
        availableTowers: availableTowerArchetypes(
          this.roundSession.currentRound,
        ),
        funds: this.editor.constructionFunds,
        canUndo: this.editor.canUndo,
        canRedo: this.editor.canRedo,
        canUpgrade:
          selected?.kind === 'tower' &&
          upgradeCost !== null &&
          this.editor.constructionFunds >= upgradeCost,
      });
    }

    const isAttackPreparation =
      this.phase === 'attack-preparation' && this.squadPlan !== null;
    this.attackFormationDeck.setVisible(isAttackPreparation);
    if (isAttackPreparation && this.squadPlan !== null) {
      this.attackFormationDeck.render({
        selectedUnit: this.selectedAttackUnitKind,
        availableUnits: availableUnitArchetypes(
          this.roundSession.currentRound,
        ),
        lanes: this.squadPlan.lanes,
        remainingPoints: this.squadPlan.remainingSortiePoints,
        totalPoints: this.squadPlan.totalSortiePoints,
      });
    }
  }

  private setStatus(message: string, isWarning = false): void {
    this.statusText.setColor(isWarning ? '#ff7b8f' : GAME_COLORS.secondary);
    this.statusText.setText(message);
    if (isWarning) this.audioDirector.playUi('error');
  }
}
