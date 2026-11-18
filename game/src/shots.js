// CINDER FALLS — shots: the four screenshot scenes. Each one stages
// the real game — the real town, the real systems, a short autopilot
// drive — and then paints it, so every screenshot is a frame the game
// itself produced, never a mock-up. ?shot=chase|street|mission|start
// picks one.
import { STEP } from './config.js';

function autopilotDrive(game, seconds) {
  const ticks = Math.floor(seconds / STEP);
  for (let i = 0; i < ticks; i += 1) {
    game.debugDrive({ forward: true, steer: 0 });
    game.step(STEP);
  }
}

function autopilotWalk(game, seconds) {
  const ticks = Math.floor(seconds / STEP);
  for (let i = 0; i < ticks; i += 1) {
    game.debugWalk({ forward: true });
    game.step(STEP);
  }
}

const STAGES = {
  chase(game) {
    // On the bridge at sunset, five stars, two patrol cars closing in
    // and the helicopter overhead — the cover shot. Dana drives WEST
    // off the east bank, so the river and the city skyline are ahead
    // of her and the chase reads in one frame.
    game.debugPlaceCar(280, 0, -Math.PI / 2);
    game.debugSetWanted(5);
    game.debugCamera('chase');
    autopilotDrive(game, 1.2);
    game.debugSpawnPolice(2);
    autopilotDrive(game, 0.6);
    return 'play';
  },
  street(game) {
    // On foot outside the Neon Palms: crowd, traffic, neon, full HUD.
    game.debugStartMission(1);
    game.debugPlacePlayer(28, -108);
    game.debugGatherPeds(28, -108, 12);
    game.debugCamera('walk');
    autopilotWalk(game, 1.4);
    return 'play';
  },
  mission(game) {
    // The Vault Job in progress: beacon on the pawn shop, briefing on
    // screen, Dana driving in with the gold column ahead.
    game.debugStartMission(4);
    game.debugPlaceCar(-12, 96, Math.PI);
    game.debugCamera('chase');
    autopilotDrive(game, 1.6);
    return 'play';
  },
  start(game) {
    // An aerial look at the whole canyon town at sunset, title on top.
    game.debugCamera('aerial');
    game.step(STEP);
    return 'start';
  },
};

// Stage `name` (chase | street | mission | start) on a fresh game and
// hand back the screen the HUD should show over the finished frame.
export function stageShot(name, game) {
  game.resetWorld();
  const stage = STAGES[name] ?? STAGES.start;
  return stage(game);
}
