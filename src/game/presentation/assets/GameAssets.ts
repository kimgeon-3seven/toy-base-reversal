import type Phaser from 'phaser';

export const IMAGE_ASSETS = {
  battlefieldBackground: 'battlefield-background',
  towerPopgun: 'tower-popgun',
  towerMortar: 'tower-mortar',
  towerPiercer: 'tower-piercer',
  obstacle: 'obstacle',
  defenderTank: 'defender-tank',
  defenderSwarm: 'defender-swarm',
  defenderRanger: 'defender-ranger',
  attackerTank: 'attacker-tank',
  attackerTankWalk: 'attacker-tank-walk-8way',
  attackerTankAttack: 'attacker-tank-attack-8way',
  attackerSwarm: 'attacker-swarm',
  attackerSwarmWalk: 'attacker-swarm-walk-8way',
  attackerSwarmAttack: 'attacker-swarm-attack-8way',
  attackerRanger: 'attacker-ranger',
  attackerRangerWalk: 'attacker-ranger-walk-8way',
  attackerRangerAttack: 'attacker-ranger-attack-8way',
  commander: 'commander',
  core: 'core',
  paperTexture: 'ui-paper-texture',
  roleReversalEmblem: 'ui-role-reversal-emblem',
  impactSpark: 'impact-spark',
  muzzleFlash: 'muzzle-flash',
  abilityBurst: 'ability-burst',
  smokePuff: 'smoke-puff',
  explosionFlash: 'explosion-flash',
} as const;

export const AUDIO_ASSETS = {
  music: 'music-loop-town',
  uiClick: 'sfx-ui-click',
  uiConfirm: 'sfx-ui-confirm',
  uiError: 'sfx-ui-error',
  impactLight: 'sfx-impact-light',
  impactHeavy: 'sfx-impact-heavy',
  structureBreak: 'sfx-structure-break',
  shotPopgun: 'sfx-shot-popgun',
  shotMortar: 'sfx-shot-mortar',
  shotPiercer: 'sfx-shot-piercer',
  focusFire: 'sfx-focus-fire',
  disrupt: 'sfx-disrupt',
  coreHit: 'sfx-core-hit',
} as const;

function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}assets/${path}`;
}

export function preloadGameAssets(loader: Phaser.Loader.LoaderPlugin): void {
  const sprites = 'sprites/tower-defense';
  loader.image(
    IMAGE_ASSETS.battlefieldBackground,
    assetUrl('backgrounds/toy-battlefield-v1.png'),
  );
  loader.image(IMAGE_ASSETS.towerPopgun, assetUrl(`${sprites}/tower-popgun-v2.png`));
  loader.image(IMAGE_ASSETS.towerMortar, assetUrl(`${sprites}/tower-mortar-v2.png`));
  loader.image(IMAGE_ASSETS.towerPiercer, assetUrl(`${sprites}/tower-piercer-v2.png`));
  loader.image(IMAGE_ASSETS.obstacle, assetUrl(`${sprites}/obstacle-v2.png`));
  loader.image(IMAGE_ASSETS.defenderTank, assetUrl(`${sprites}/unit-shield-v2.png`));
  loader.image(IMAGE_ASSETS.defenderSwarm, assetUrl(`${sprites}/unit-windup-v2.png`));
  loader.image(IMAGE_ASSETS.defenderRanger, assetUrl(`${sprites}/unit-ranger-v2.png`));
  loader.image(IMAGE_ASSETS.attackerTank, assetUrl(`${sprites}/unit-shield-v2.png`));
  loader.spritesheet(
    IMAGE_ASSETS.attackerTankWalk,
    assetUrl(`${sprites}/unit-shield-walk-8way-v2.png`),
    { frameWidth: 160, frameHeight: 160 },
  );
  loader.spritesheet(
    IMAGE_ASSETS.attackerTankAttack,
    assetUrl(`${sprites}/unit-shield-attack-8way-v1.png`),
    { frameWidth: 160, frameHeight: 160 },
  );
  loader.image(IMAGE_ASSETS.attackerSwarm, assetUrl(`${sprites}/unit-windup-v2.png`));
  loader.spritesheet(
    IMAGE_ASSETS.attackerSwarmWalk,
    assetUrl(`${sprites}/unit-windup-walk-8way-v1.png`),
    { frameWidth: 160, frameHeight: 160 },
  );
  loader.spritesheet(
    IMAGE_ASSETS.attackerSwarmAttack,
    assetUrl(`${sprites}/unit-windup-attack-8way-v1.png`),
    { frameWidth: 160, frameHeight: 160 },
  );
  loader.image(IMAGE_ASSETS.attackerRanger, assetUrl(`${sprites}/unit-ranger-v2.png`));
  loader.spritesheet(
    IMAGE_ASSETS.attackerRangerWalk,
    assetUrl(`${sprites}/unit-ranger-walk-8way-v1.png`),
    { frameWidth: 160, frameHeight: 160 },
  );
  loader.spritesheet(
    IMAGE_ASSETS.attackerRangerAttack,
    assetUrl(`${sprites}/unit-ranger-attack-8way-v1.png`),
    { frameWidth: 160, frameHeight: 160 },
  );
  loader.image(IMAGE_ASSETS.commander, assetUrl(`${sprites}/commander-v2.png`));
  loader.image(IMAGE_ASSETS.core, assetUrl(`${sprites}/core-v2.png`));
  loader.image(
    IMAGE_ASSETS.paperTexture,
    assetUrl('ui/paper-texture-v1.png'),
  );
  loader.image(
    IMAGE_ASSETS.roleReversalEmblem,
    assetUrl('ui/role-reversal-emblem-v1.png'),
  );

  loader.image(IMAGE_ASSETS.impactSpark, assetUrl('vfx/impact-spark.png'));
  loader.image(IMAGE_ASSETS.muzzleFlash, assetUrl('vfx/muzzle-flash.png'));
  loader.image(IMAGE_ASSETS.abilityBurst, assetUrl('vfx/ability-burst.png'));
  loader.image(IMAGE_ASSETS.smokePuff, assetUrl('vfx/smoke-puff.png'));
  loader.image(IMAGE_ASSETS.explosionFlash, assetUrl('vfx/explosion-flash.png'));

  loader.audio(AUDIO_ASSETS.music, assetUrl('audio/music/loop-town.ogg'));
  loader.audio(AUDIO_ASSETS.uiClick, assetUrl('audio/sfx/ui-click.ogg'));
  loader.audio(AUDIO_ASSETS.uiConfirm, assetUrl('audio/sfx/ui-confirm.ogg'));
  loader.audio(AUDIO_ASSETS.uiError, assetUrl('audio/sfx/ui-error.ogg'));
  loader.audio(AUDIO_ASSETS.impactLight, assetUrl('audio/sfx/impact-light.ogg'));
  loader.audio(AUDIO_ASSETS.impactHeavy, assetUrl('audio/sfx/impact-heavy.ogg'));
  loader.audio(AUDIO_ASSETS.structureBreak, assetUrl('audio/sfx/structure-break.ogg'));
  loader.audio(AUDIO_ASSETS.shotPopgun, assetUrl('audio/sfx/shot-popgun.ogg'));
  loader.audio(AUDIO_ASSETS.shotMortar, assetUrl('audio/sfx/shot-mortar.ogg'));
  loader.audio(AUDIO_ASSETS.shotPiercer, assetUrl('audio/sfx/shot-piercer.ogg'));
  loader.audio(AUDIO_ASSETS.focusFire, assetUrl('audio/sfx/focus-fire.ogg'));
  loader.audio(AUDIO_ASSETS.disrupt, assetUrl('audio/sfx/disrupt.ogg'));
  loader.audio(AUDIO_ASSETS.coreHit, assetUrl('audio/sfx/core-hit.ogg'));
}
