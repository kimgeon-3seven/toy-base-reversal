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
  attackerSwarm: 'attacker-swarm',
  attackerRanger: 'attacker-ranger',
  commander: 'commander',
  core: 'core',
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
  loader.image(IMAGE_ASSETS.towerPopgun, assetUrl(`${sprites}/tower-popgun.png`));
  loader.image(IMAGE_ASSETS.towerMortar, assetUrl(`${sprites}/tower-mortar.png`));
  loader.image(IMAGE_ASSETS.towerPiercer, assetUrl(`${sprites}/tower-piercer.png`));
  loader.image(IMAGE_ASSETS.obstacle, assetUrl(`${sprites}/obstacle.png`));
  loader.image(IMAGE_ASSETS.defenderTank, assetUrl(`${sprites}/defender-tank.png`));
  loader.image(IMAGE_ASSETS.defenderSwarm, assetUrl(`${sprites}/defender-swarm.png`));
  loader.image(IMAGE_ASSETS.defenderRanger, assetUrl(`${sprites}/defender-ranger.png`));
  loader.image(IMAGE_ASSETS.attackerTank, assetUrl(`${sprites}/attacker-tank.png`));
  loader.image(IMAGE_ASSETS.attackerSwarm, assetUrl(`${sprites}/attacker-swarm.png`));
  loader.image(IMAGE_ASSETS.attackerRanger, assetUrl(`${sprites}/attacker-ranger.png`));
  loader.image(IMAGE_ASSETS.commander, assetUrl(`${sprites}/commander.png`));
  loader.image(IMAGE_ASSETS.core, assetUrl(`${sprites}/core.png`));

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
