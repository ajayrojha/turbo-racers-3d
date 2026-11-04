import * as THREE from 'three';
import { CarRig } from './carBuilder';
import { AIRacer, ControlsInput, PlayerCarState, StuntNotification } from './types';
import { WorldData } from './worldBuilder';
import { sounds } from './audio';

export interface PhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  speedKmh: number;
  steerAngle: number;
  isGrounded: boolean;
  isDrifting: boolean;
  nitroRemaining: number; // 0 - 100
  airTime: number;
  currentLapTime: number;
  currentLap: number;
  currentCheckpoint: number;
  coinsCount: number;
  starsCount: number;
  pinsKnockedCount: number;
  racePosition: number; // 1 to 5
}

export class CarPhysics {
  public state: PhysicsState;
  private carRig: CarRig;
  private world: WorldData;
  private carConfig: PlayerCarState;

  // Kinematic parameters tuned for responsive arcade kart racing
  private maxForwardSpeed: number = 32; // ~115 km/h base
  private maxReverseSpeed: number = -11; // ~40 km/h reverse
  private accelPower: number = 32;
  private brakePower: number = 44;
  private steerSpeed: number = 2.4;
  private maxSteerAngle: number = 0.55; // visual wheel turn in radians

  private isAirborne: boolean = false;
  private airTimeAccum: number = 0;
  private driftDuration: number = 0;
  private previousRacePosition: number = 5;
  private crashCooldown: number = 0;

  public onStuntAwarded?: (notification: StuntNotification) => void;
  public onCoinCollected?: (id: string, total: number) => void;
  public onStarCollected?: (id: string, total: number) => void;
  public onCheckpointPassed?: (index: number, lap: number) => void;
  public onSpeedTrapTriggered?: (speedKmh: number) => void;
  public onPositionChanged?: (pos: number) => void;

  constructor(carRig: CarRig, world: WorldData, carConfig: PlayerCarState) {
    this.carRig = carRig;
    this.world = world;
    this.carConfig = carConfig;

    // Apply upgrade modifiers
    const speedMult = 1 + (carConfig.speedLevel || 0) * 0.08;
    const accelMult = 1 + (carConfig.accelLevel || 0) * 0.1;
    this.maxForwardSpeed *= speedMult;
    this.accelPower *= accelMult;

    this.state = {
      position: new THREE.Vector3(0, 0.60, -40), // Starting grid safely clear of gantry arch
      velocity: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
      speedKmh: 0,
      steerAngle: 0,
      isGrounded: true,
      isDrifting: false,
      nitroRemaining: 100,
      airTime: 0,
      currentLapTime: 0,
      currentLap: 1,
      currentCheckpoint: 0,
      coinsCount: 0,
      starsCount: 0,
      pinsKnockedCount: 0,
      racePosition: 5,
    };
  }

  public resetCar(pos: [number, number, number] = [0, 0.60, -40], rotY: number = 0) {
    this.state.position.set(pos[0], pos[1], pos[2]);
    this.state.velocity.set(0, 0, 0);
    this.state.rotation.set(0, rotY, 0);
    this.state.speedKmh = 0;
    this.state.steerAngle = 0;
    this.state.isGrounded = true;
    this.state.isDrifting = false;
    this.carRig.root.position.copy(this.state.position);
    this.carRig.root.rotation.copy(this.state.rotation);
  }

  public update(delta: number, input: ControlsInput) {
    if (this.crashCooldown > 0) {
      this.crashCooldown -= delta;
    }

    // 1. Rescue / Reset Car to Track Centerline
    if (input.reset) {
      if (this.world.circuitWaypoints && this.world.circuitWaypoints.length > 0) {
        let bestWp = this.world.circuitWaypoints[0];
        let bestDistSq = Infinity;
        let bestIdx = 0;
        this.world.circuitWaypoints.forEach((wp, idx) => {
          const dSq = Math.hypot(this.state.position.x - wp.x, this.state.position.z - wp.z);
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestWp = wp;
            bestIdx = idx;
          }
        });
        const nextWp = this.world.circuitWaypoints[(bestIdx + 1) % this.world.circuitWaypoints.length];
        const forwardDir = new THREE.Vector3().subVectors(nextWp, bestWp).normalize();
        const rotY = Math.atan2(forwardDir.x, forwardDir.z);
        this.resetCar([bestWp.x, 0.60, bestWp.z], rotY);
      } else {
        this.resetCar([0, 0.60, -40], 0);
      }
      return;
    }

    // 2. Nitro Handling
    let activeNitro = false;
    if (input.nitro && this.state.nitroRemaining > 2) {
      activeNitro = true;
      this.state.nitroRemaining = Math.max(0, this.state.nitroRemaining - delta * 25);
      sounds.playNitro();
    } else {
      this.state.nitroRemaining = Math.min(100, this.state.nitroRemaining + delta * 8);
    }

    const currentMaxSpeed = this.maxForwardSpeed * (activeNitro ? 1.45 : 1.0);
    const currentAccel = this.accelPower * (activeNitro ? 2.0 : 1.0);

    // 3. Ground & Height Check
    const terrainY = this.world.getTerrainHeight(this.state.position.x, this.state.position.z);
    const roadBaseY = 0.22;
    const effectiveGroundY = Math.max(terrainY, roadBaseY);
    const groundLimitY = effectiveGroundY + this.carRig.chassisOffset;

    const wasGrounded = this.state.isGrounded;
    this.state.isGrounded = this.state.position.y <= groundLimitY + 0.15;

    // Hard floor boundary: car can never sink below the track/ground
    if (this.state.position.y <= groundLimitY) {
      this.state.position.y = groundLimitY;
      this.state.velocity.y = 0;
      this.state.isGrounded = true;
    }

    if (!wasGrounded && this.state.isGrounded) {
      sounds.playLand();
      if (this.airTimeAccum > 0.6) {
        const points = Math.floor(this.airTimeAccum * 160);
        this.onStuntAwarded?.({
          id: Date.now(),
          text: `AIR TIME! ${this.airTimeAccum.toFixed(1)}s`,
          points,
          subtext: 'Super Jump Stunt!',
        });
      }
      this.airTimeAccum = 0;
      this.isAirborne = false;
    }

    if (wasGrounded && !this.state.isGrounded) {
      this.isAirborne = true;
      sounds.playJump();
    }

    if (this.isAirborne) {
      this.airTimeAccum += delta;
      this.state.airTime = this.airTimeAccum;
    }

    // 4. Orientation & Heading Vectors
    // Facing along +Z at rotY = 0.
    const forward = new THREE.Vector3(
      Math.sin(this.state.rotation.y),
      0,
      Math.cos(this.state.rotation.y)
    );
    const right = new THREE.Vector3(
      Math.cos(this.state.rotation.y),
      0,
      -Math.sin(this.state.rotation.y)
    );

    let forwardSpeed = this.state.velocity.dot(forward);
    let lateralSpeed = this.state.velocity.dot(right);

    // 5. Steering Dynamics:
    // Left input (steer < 0) turns LEFT on screen. Right input (steer > 0) turns RIGHT on screen.
    const targetSteerAngle = input.steer * this.maxSteerAngle;
    this.state.steerAngle = THREE.MathUtils.damp(this.state.steerAngle, targetSteerAngle, 18, delta);

    // Turn visual front wheels to match steering angle towards screen left / screen right
    this.carRig.frontLeftWheel.rotation.y = -this.state.steerAngle;
    this.carRig.frontRightWheel.rotation.y = -this.state.steerAngle;

    const absSpeed = Math.abs(forwardSpeed);
    // Allow responsive steering from standstill so kids never get stuck!
    const steerResponsiveness = Math.max(0.65, Math.min(absSpeed / 6, 1.0));

    // Drifting / Handbrake Check
    const isTryingDrift = (input.handbrake || (input.throttle < -0.1 && Math.abs(input.steer) > 0.35)) && absSpeed > 8;
    this.state.isDrifting = isTryingDrift;

    if (this.state.isDrifting) {
      this.driftDuration += delta;
      sounds.playDrift();
      this.state.rotation.y -= input.steer * this.steerSpeed * 1.6 * delta;
      lateralSpeed *= Math.pow(0.85, delta * 60);
    } else {
      if (this.driftDuration > 0.8) {
        const pts = Math.floor(this.driftDuration * 120);
        this.onStuntAwarded?.({
          id: Date.now(),
          text: `DRIFT POWER! +${pts}`,
          points: pts,
          subtext: `Drift: ${this.driftDuration.toFixed(1)}s`,
        });
      }
      this.driftDuration = 0;
      // Subtract input.steer so pressing Left turns LEFT on screen, pressing Right turns RIGHT on screen!
      this.state.rotation.y -= input.steer * this.steerSpeed * steerResponsiveness * delta;
      lateralSpeed *= Math.pow(0.012, delta * 25);
    }

    // 6. Acceleration, Braking & Reverse (ALWAYS ACTIVE, guaranteed forward response!)
    if (input.throttle > 0.05) {
      // Accelerate forward instantly
      if (forwardSpeed < currentMaxSpeed) {
        forwardSpeed += input.throttle * currentAccel * delta;
      }
    } else if (input.throttle < -0.05) {
      if (forwardSpeed > 0.5) {
        // Firm brake to a stop
        forwardSpeed = Math.max(0, forwardSpeed - this.brakePower * delta);
      } else if (forwardSpeed > this.maxReverseSpeed) {
        // Smooth reverse once stopped
        forwardSpeed += input.throttle * (this.accelPower * 0.7) * delta;
      }
    } else {
      // Rolling drag deceleration
      forwardSpeed *= Math.pow(0.97, delta * 60);
    }

    if (this.state.isGrounded) {
      // Keep car on ground surface smoothly
      this.state.position.y = THREE.MathUtils.damp(this.state.position.y, groundLimitY, 20, delta);
      this.state.velocity.y = 0;
      // Body roll into turns
      this.state.rotation.z = THREE.MathUtils.damp(this.state.rotation.z, this.state.steerAngle * 0.1, 10, delta);
    } else {
      // In air physics: apply gravity and slight pitch control
      this.state.velocity.y -= 24 * delta;
      this.state.rotation.x += input.throttle * 0.6 * delta;
    }

    // Reconstruct velocity from forward & lateral components
    this.state.velocity.x = forward.x * forwardSpeed + right.x * lateralSpeed;
    this.state.velocity.z = forward.z * forwardSpeed + right.z * lateralSpeed;

    // Integrate Position
    this.state.position.addScaledVector(this.state.velocity, delta);

    // 7. SMOOTH GUARDRAIL / BARRIER COLLISION & TANGENTIAL SLIDING
    const carRadius = 1.3;
    const carPos = this.state.position;

    if (this.world.railSegments) {
      for (const seg of this.world.railSegments) {
        const dx = seg.x2 - seg.x1;
        const dz = seg.z2 - seg.z1;
        const lenSq = dx * dx + dz * dz;
        if (lenSq < 0.001) continue;

        // Closest point on rail line segment
        const t = Math.max(0, Math.min(1, ((carPos.x - seg.x1) * dx + (carPos.z - seg.z1) * dz) / lenSq));
        const projX = seg.x1 + t * dx;
        const projZ = seg.z1 + t * dz;

        const toCarX = carPos.x - projX;
        const toCarZ = carPos.z - projZ;
        const distSq = toCarX * toCarX + toCarZ * toCarZ;
        const minDist = carRadius + 0.35; // Car radius + rail thickness

        if (distSq < minDist * minDist && distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;
          const normX = toCarX / dist;
          const normZ = toCarZ / dist;

          // Push gently away from the rail
          carPos.x += normX * overlap;
          carPos.z += normZ * overlap;

          // Velocity normal projection
          const normalVel = this.state.velocity.x * normX + this.state.velocity.z * normZ;
          if (normalVel < 0) {
            // Tangent along rail direction
            const tangX = -normZ;
            const tangZ = normX;
            const tangVel = this.state.velocity.x * tangX + this.state.velocity.z * tangZ;

            // Slide smoothly along barrier (preserves speed, zero chattering!)
            this.state.velocity.x = tangX * (tangVel * 0.97);
            this.state.velocity.z = tangZ * (tangVel * 0.97);

            // Slight cushion rebound on high impact
            if (normalVel < -4) {
              this.state.velocity.x += normX * Math.abs(normalVel) * 0.15;
              this.state.velocity.z += normZ * Math.abs(normalVel) * 0.15;
            }

            if (this.crashCooldown <= 0) {
              sounds.playCrash();
              this.crashCooldown = 0.3;
            }
          }
        }
      }
    }

    // STATIC SOLID OBJECTS (grandstands, billboards, gantry pillars, buildings)
    for (const collider of this.world.colliders) {
      if (collider.type === 'guardrail') continue; // Handled by exact rail segments
      const box = collider.box;
      const isInside = box.containsPoint(carPos);
      let normX = 0;
      let normZ = 0;
      let overlap = 0;

      if (isInside) {
        // Car center is inside box - push immediately out to nearest horizontal side
        const dLeft = Math.abs(carPos.x - box.min.x);
        const dRight = Math.abs(box.max.x - carPos.x);
        const dBack = Math.abs(carPos.z - box.min.z);
        const dFront = Math.abs(box.max.z - carPos.z);
        const minD = Math.min(dLeft, dRight, dBack, dFront);

        if (minD === dLeft) { normX = -1; overlap = dLeft + carRadius; }
        else if (minD === dRight) { normX = 1; overlap = dRight + carRadius; }
        else if (minD === dBack) { normZ = -1; overlap = dBack + carRadius; }
        else { normZ = 1; overlap = dFront + carRadius; }

        carPos.x += normX * overlap;
        carPos.z += normZ * overlap;
      } else {
        const clampedX = Math.max(box.min.x, Math.min(carPos.x, box.max.x));
        const clampedY = Math.max(box.min.y, Math.min(carPos.y, box.max.y));
        const clampedZ = Math.max(box.min.z, Math.min(carPos.z, box.max.z));

        const dx = carPos.x - clampedX;
        const dy = carPos.y - clampedY;
        const dz = carPos.z - clampedZ;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < carRadius * carRadius && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          overlap = carRadius - dist;
          normX = dx / dist;
          normZ = dz / dist;

          carPos.x += normX * overlap * 1.05;
          carPos.z += normZ * overlap * 1.05;
        }
      }

      if (overlap > 0) {
        const dot = this.state.velocity.x * normX + this.state.velocity.z * normZ;
        if (dot < 0) {
          const bounceFactor = collider.bounce || 0.25;
          this.state.velocity.x -= (1 + bounceFactor) * dot * normX;
          this.state.velocity.z -= (1 + bounceFactor) * dot * normZ;
          // Smooth slide preservation so kids never get jammed
          this.state.velocity.multiplyScalar(0.85);
        }

        if (this.crashCooldown <= 0) {
          sounds.playCrash();
          this.crashCooldown = 0.3;
        }
      }
    }

    // SOLID AI RACER BUMP COLLISIONS
    this.world.aiRacers.forEach((ai) => {
      const aiDist = carPos.distanceTo(ai.pos);
      if (aiDist < 2.4 && aiDist > 0.01) {
        const overlap = 2.4 - aiDist;
        const pushDir = new THREE.Vector3().subVectors(carPos, ai.pos).normalize();
        pushDir.y = 0;

        carPos.addScaledVector(pushDir, overlap * 0.55);
        ai.pos.addScaledVector(pushDir, -overlap * 0.45);

        if (this.crashCooldown <= 0) {
          sounds.playCrash();
          this.crashCooldown = 0.3;
        }
      }
    });

    const currentSpeedMag = Math.hypot(this.state.velocity.x, this.state.velocity.z);
    this.state.speedKmh = Math.round(currentSpeedMag * 3.6);

    // Audio update
    sounds.updateEngineSound(this.state.speedKmh, input.throttle > 0.1, activeNitro);
    if (input.horn) {
      // If near the farm pasture (x ~ 56, z between -40 and 20), trigger farm animal responses!
      if (this.state.position.x > 40 && this.state.position.z > -45 && this.state.position.z < 25) {
        if (Math.random() > 0.5) {
          sounds.playMoo();
          this.onStuntAwarded?.({
            id: Date.now(),
            text: 'FRIENDLY COW MOO! 🐮',
            points: 50,
            subtext: 'The cows love your car!',
          });
        } else {
          sounds.playBaa();
          this.onStuntAwarded?.({
            id: Date.now(),
            text: 'FLUFFY SHEEP BAA! 🐑',
            points: 50,
            subtext: 'Happy farm animals!',
          });
        }
      } else {
        sounds.playHorn();
      }
    }

    // Wheel spin
    const spinAmount = (currentSpeedMag * delta) / 0.4;
    this.carRig.wheels.forEach((w) => {
      w.rotation.x += spinAmount;
    });

    // Stunt Ramp Launches
    this.world.ramps.forEach((ramp) => {
      const rampBox = new THREE.Box3().setFromObject(ramp.mesh);
      if (rampBox.containsPoint(this.state.position)) {
        this.state.velocity.y = Math.max(this.state.velocity.y, currentSpeedMag * 0.65 + 6);
        this.state.isGrounded = false;
        sounds.playJump();
      }
    });

    // Neon Boost Acceleration Pads
    this.world.boostPads.forEach((pad) => {
      const dist = this.state.position.distanceTo(pad.position);
      if (dist < pad.radius) {
        this.state.velocity.addScaledVector(pad.direction, 26 * delta);
        this.state.nitroRemaining = Math.min(100, this.state.nitroRemaining + 35);
        sounds.playNitro();
      }
    });

    // Bowling Pins Knocking
    this.world.bowlingPins.forEach((pin) => {
      if (!pin.knocked) {
        const pinPos = new THREE.Vector3(pin.pos[0], pin.pos[1], pin.pos[2]);
        if (this.state.position.distanceTo(pinPos) < 2.2) {
          pin.knocked = true;
          this.state.pinsKnockedCount++;
          sounds.playPinSmash();
          const hitDir = pinPos.clone().sub(this.state.position).normalize();
          hitDir.y = 0.4;
          const hitPower = Math.max(14, currentSpeedMag * 1.3);
          pin.velocity = [hitDir.x * hitPower, hitDir.y * hitPower, hitDir.z * hitPower];
          pin.angularVelocity = [(Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18];
          this.onStuntAwarded?.({
            id: Date.now() + pin.id,
            text: 'PIN STRIKE! +100',
            points: 100,
          });
        }
      }
    });

    // Collectibles (Coins & Stars)
    this.world.coins.forEach((coin) => {
      if (!coin.collected) {
        const coinPos = new THREE.Vector3(coin.position[0], coin.position[1], coin.position[2]);
        if (this.state.position.distanceTo(coinPos) < 3.0) {
          coin.collected = true;
          if (coin.mesh) coin.mesh.visible = false;
          this.state.coinsCount++;
          sounds.playCoin();
          this.onCoinCollected?.(coin.id, this.state.coinsCount);
        }
      }
    });

    this.world.stars.forEach((star) => {
      if (!star.collected) {
        const starPos = new THREE.Vector3(star.position[0], star.position[1], star.position[2]);
        if (this.state.position.distanceTo(starPos) < 3.2) {
          star.collected = true;
          if (star.mesh) star.mesh.visible = false;
          this.state.starsCount++;
          sounds.playStar();
          this.onStarCollected?.(star.id, this.state.starsCount);
          this.onStuntAwarded?.({
            id: Date.now(),
            text: 'SECRET STAR! ★',
            points: 500,
            subtext: '+500 Bonus Points!',
          });
        }
      }
    });

    // Checkpoint & Lap Tracking
    if (this.world.checkpoints.length > 0) {
      const nextCpIdx = this.state.currentCheckpoint % this.world.checkpoints.length;
      const nextCp = this.world.checkpoints[nextCpIdx];
      const cpPos = new THREE.Vector3(nextCp.position[0], nextCp.position[1], nextCp.position[2]);

      if (this.state.position.distanceTo(cpPos) < nextCp.radius) {
        sounds.playCheckpoint();
        this.state.currentCheckpoint++;

        if (nextCpIdx === 0 && this.state.currentCheckpoint > 1) {
          // Completed full lap!
          this.state.currentLap++;
        }

        this.onCheckpointPassed?.(this.state.currentCheckpoint, this.state.currentLap);
      }
    }

    // Dynamic Race Position vs 4 AI Racers
    const playerTrackProgress =
      this.state.currentLap + (this.state.currentCheckpoint % this.world.checkpoints.length) / this.world.checkpoints.length;

    let aheadCount = 0;
    this.world.aiRacers.forEach((ai) => {
      if (ai.lapProgress > playerTrackProgress) {
        aheadCount++;
      }
    });

    const currentPos = aheadCount + 1;
    if (currentPos < this.state.racePosition) {
      sounds.playOvertake();
      this.onStuntAwarded?.({
        id: Date.now(),
        text: `OVERTAKE! P${currentPos} 🏎️`,
        points: 75,
        subtext: 'Passed a rival racer!',
      });
    }

    this.state.racePosition = currentPos;
    if (currentPos !== this.previousRacePosition) {
      this.previousRacePosition = currentPos;
      this.onPositionChanged?.(currentPos);
    }

    // Fall Protection
    if (this.state.position.y < -1.5) {
      this.resetCar([0, 0.60, -40], 0);
    }

    this.carRig.root.position.copy(this.state.position);
    this.carRig.root.rotation.copy(this.state.rotation);
  }
}
