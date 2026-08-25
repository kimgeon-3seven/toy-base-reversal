import './styles.css';
import { StartGame } from './game/application/StartGame';
import { WebEntryCoordinator } from './game/application/WebEntryCoordinator';
import { WebEntryDeviceAdvisor } from './game/application/WebEntryDeviceAdvisor';
import { BrowserFullscreenGateway } from './game/infrastructure/dom/BrowserFullscreenGateway';
import { BrowserPageActivityMonitor } from './game/infrastructure/dom/BrowserPageActivityMonitor';
import { DomWebEntryView } from './game/infrastructure/dom/DomWebEntryView';
import { PhaserGameRuntime } from './game/infrastructure/phaser/PhaserGameRuntime';

const shell = document.getElementById('game-shell');
if (shell === null) throw new Error('Game shell was not found.');

const deviceAdvice = new WebEntryDeviceAdvisor().advise({
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight,
  hasFinePointer: window.matchMedia('(pointer: fine)').matches,
});
const entryView = new DomWebEntryView(document, deviceAdvice);
const fullscreen = new BrowserFullscreenGateway(document, shell);
const webEntry = new WebEntryCoordinator(entryView, fullscreen);
const pageActivity = new BrowserPageActivityMonitor(document, window);
const runtime = new PhaserGameRuntime('app', webEntry, pageActivity);
const startGame = new StartGame(runtime);

startGame.execute();
