// CINDER FALLS — player: Dana Cole on foot. A box-built third-person
// walker with a walk/run cycle, a camera that hangs behind her
// shoulder, and a punch swing the combat system triggers. She moves
// relative to where the camera looks, so WASD always feels like the
// screen's directions, and she slides along walls instead of sticking
// to them.
import { THREE } from './three.js';
import { PLAYER } from './config.js';
import { resolveCollisions } from './city.js';

export function createPlayer(scene) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0xc23a2e });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.36), jacket);
  torso.position.y = 1.05;
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.42, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xd8a070 }),
  );
  head.position.y = 1.7;
  const hair = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.2, 0.46),
    new THREE.MeshLambertMaterial({ color: 0x2a1a0a }),
  );
  hair.position.y = 1.95;
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.6, 0.32),
    new THREE.MeshLambertMaterial({ color: 0x2a2a3a }),
  );
  legs.position.y = 0.3;
  // Arms: the right one swings when Dana punches.
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), jacket);
  armL.position.set(-0.42, 1.05, 0);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), jacket);
  armR.position.set(0.42, 1.05, 0);
  group.add(torso, head, hair, legs, armL, armR);
  scene.add(group);

  const pos = group.position;
  pos.set(0, 0, 30);

  const player = {
    group,
    pos,
    heading: 0,
    camYaw: 0,
    health: PLAYER.maxHealth,
    walkPhase: 0,
    punchAnim: 0,
    punchCooldown: 0,
    reset(x, z) {
      pos.set(x, 0, z);
      this.health = PLAYER.maxHealth;
      this.camYaw = 0;
      this.heading = 0;
      group.visible = true;
    },
    update(dt, input, colliders, half) {
      this.punchCooldown = Math.max(0, this.punchCooldown - dt);
      const forward = input.isDown('KeyW');
      const back = input.isDown('KeyS');
      const left = input.isDown('KeyA');
      const right = input.isDown('KeyD');
      const run = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      const moveZ = (forward ? 1 : 0) - (back ? 1 : 0);
      const moveX = (right ? 1 : 0) - (left ? 1 : 0);
      if (moveZ !== 0 || moveX !== 0) {
        // Movement is camera-relative: W walks away from the camera.
        const sin = Math.sin(this.camYaw);
        const cos = Math.cos(this.camYaw);
        let dx = sin * moveZ + cos * moveX;
        let dz = cos * moveZ - sin * moveX;
        const len = Math.hypot(dx, dz);
        dx /= len;
        dz /= len;
        pos.x += dx * speed * dt;
        pos.z += dz * speed * dt;
        this.heading = Math.atan2(dx, dz);
        this.walkPhase += dt * speed * 1.6;
        group.rotation.y = this.heading;
        group.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.07;
        legs.rotation.x = Math.sin(this.walkPhase) * 0.5;
      } else {
        group.position.y = 0;
        legs.rotation.x = 0;
      }
      // Punch swing: the right arm snaps forward and back.
      if (this.punchAnim > 0) {
        this.punchAnim -= dt;
        const t = 1 - Math.max(0, this.punchAnim) / 0.25;
        armR.position.z = Math.sin(t * Math.PI) * 0.55;
        armR.rotation.x = -Math.sin(t * Math.PI) * 1.2;
      } else {
        armR.position.z = 0;
        armR.rotation.x = 0;
      }
      const drag = input.consumeDrag();
      this.camYaw -= drag.x * 0.004;
      resolveCollisions(colliders, half, pos, PLAYER.radius);
    },
    swingPunch() {
      this.punchAnim = 0.25;
    },
    cameraTarget() {
      return { x: pos.x, y: 1.6, z: pos.z };
    },
    cameraOffset() {
      // Behind the shoulder, slightly above, looking where Dana looks.
      return {
        x: -Math.sin(this.camYaw) * 5.2,
        y: 2.6,
        z: -Math.cos(this.camYaw) * 5.2,
      };
    },
  };
  return player;
}
