import './styles.css';
import { StartGame } from './game/application/StartGame';
import { PhaserGameRuntime } from './game/infrastructure/phaser/PhaserGameRuntime';

const runtime = new PhaserGameRuntime('app');
const startGame = new StartGame(runtime);

startGame.execute();
