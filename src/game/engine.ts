import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildCar, CarRig } from './carBuilder';
import { CarPhysics, PhysicsState } from './physics';
import { CameraViewMode, ControlsInput, PlayerCarState } from './types';
import { buildSunnyIslandWorld, WorldData } from './worldBuilder';

// Module-level pre-allocated math helpers to ensure ZERO garbage collection in render loop
const _camOffset = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _forward = new THREE.Vector3();

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public world: WorldData;
  public carRig: CarRig;
  public physics: CarPhysics;
  public cameraMode: CameraViewMode = 'chase';

  public onTick?: (delta: number, state: PhysicsState) => void;
  public currentControls: ControlsInput = {
    throttle: 0,
    steer: 0,
    nitro: false,
    handbrake: false,
    horn: false,
    reset: false,
  };

  private isSoftwareGl: boolean;
  private container: HTMLElement;
  private animFrameId: number = 0;
  private clock: THREE.Clock;
  private isDestroyed: boolean = false;
  private smoothLookTarget: THREE.Vector3 = new THREE.Vector3(0, 1.2, -40);

  // Particle systems
  private nitroParticles: THREE.Points;
  private nitroGeo: THREE.BufferGeometry;
  private driftParticles: THREE.Points;
  private driftGeo: THREE.BufferGeometry;

  constructor(container: HTMLElement, initialCarState: PlayerCarState) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. Software WebGL Guard per Three.js directives
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Scene & Sunny Island Atmosphere
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x7dd3fc); // Sunny vibrant sky blue
    this.scene.background = skyColor;
    this.scene.fog = new THREE.Fog(skyColor, 90, 450);

    // 3. Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.1, 1000);

    // 4. Renderer with Color Pipeline
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 5. Studio Environment Reflection (RoomEnvironment) per guidelines
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 6. Balanced Lighting Rig (Key, Fill, Rim)
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.2); // Warm sun
    keyLight.position.set(70, 110, 60);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 300;
      const d = 120;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0004;
    }
    this.scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x4ade80, 1.1); // Sky blue to grass green
    this.scene.add(hemiLight);

    // 7. Build Island World
    this.world = buildSunnyIslandWorld();
    this.scene.add(this.world.sceneGroup);

    // 8. Build Hero Vehicle
    this.carRig = buildCar(initialCarState);
    this.scene.add(this.carRig.root);

    // 9. Initialize Physics Engine
    this.physics = new CarPhysics(this.carRig, this.world, initialCarState);
    this.physics.resetCar([0, 0.60, -40], 0);
    this.snapCamera();

    // 10. Particle Systems
    const nitroCount = 50;
    this.nitroGeo = new THREE.BufferGeometry();
    const nitroPos = new Float32Array(nitroCount * 3);
    this.nitroGeo.setAttribute('position', new THREE.BufferAttribute(nitroPos, 3));
    const nitroMat = new THREE.PointsMaterial({
      color: 0xf97316,
      size: 0.6,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    this.nitroParticles = new THREE.Points(this.nitroGeo, nitroMat);
    this.scene.add(this.nitroParticles);

    const driftCount = 60;
    this.driftGeo = new THREE.BufferGeometry();
    const driftPos = new Float32Array(driftCount * 3);
    this.driftGeo.setAttribute('position', new THREE.BufferAttribute(driftPos, 3));
    const driftMat = new THREE.PointsMaterial({
      color: 0xf1f5f9,
      size: 0.8,
      transparent: true,
      opacity: 0.5,
    });
    this.driftParticles = new THREE.Points(this.driftGeo, driftMat);
    this.scene.add(this.driftParticles);

    // Resize observer
    window.addEventListener('resize', this.handleResize);

    // Start Animation Loop
    this.startLoop();
  }

  public updateCar(newCarState: PlayerCarState) {
    // Remove old car rig
    this.scene.remove(this.carRig.root);
    // Build new car
    this.carRig = buildCar(newCarState);
    this.scene.add(this.carRig.root);
    // Re-link physics
    const oldPos = this.physics.state.position.clone();
    const oldRot = this.physics.state.rotation.clone();
    this.physics = new CarPhysics(this.carRig, this.world, newCarState);
    this.physics.state.position.copy(oldPos);
    this.physics.state.rotation.copy(oldRot);
    this.carRig.root.position.copy(oldPos);
    this.carRig.root.rotation.copy(oldRot);
  }

  public setCameraMode(mode: CameraViewMode) {
    this.cameraMode = mode;
  }

  public snapCamera() {
    const carPos = this.physics.state.position;
    const carRot = this.physics.state.rotation;
    _camOffset.set(0, 3.2, -7.2).applyEuler(carRot);
    this.camera.position.copy(carPos).add(_camOffset);

    _forward.set(0, 0, 3.0).applyEuler(carRot);
    _lookTarget.copy(carPos).add(new THREE.Vector3(0, 1.2, 0)).add(_forward);
    this.smoothLookTarget.copy(_lookTarget);
    this.camera.lookAt(this.smoothLookTarget);
    this.camera.updateProjectionMatrix();
  }

  private handleResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private updateParticles(activeNitro: boolean, isDrifting: boolean) {
    const carPos = this.physics.state.position;
    const carRot = this.physics.state.rotation;
    _forward.set(0, 0, -1).applyEuler(carRot);

    // Nitro exhaust flames
    const nPosAttr = this.nitroGeo.attributes.position as THREE.BufferAttribute;
    const nArray = nPosAttr.array as Float32Array;
    if (activeNitro) {
      this.nitroParticles.visible = true;
      for (let i = 0; i < nArray.length; i += 3) {
        if (Math.random() < 0.25) {
          // Spawn near exhaust pipes
          const side = Math.random() > 0.5 ? 0.35 : -0.35;
          const pipe = new THREE.Vector3(side, 0.3, -1.8).applyEuler(carRot).add(carPos);
          nArray[i] = pipe.x;
          nArray[i + 1] = pipe.y;
          nArray[i + 2] = pipe.z;
        } else {
          nArray[i] += _forward.x * 0.4 + (Math.random() - 0.5) * 0.1;
          nArray[i + 1] += 0.05;
          nArray[i + 2] += _forward.z * 0.4 + (Math.random() - 0.5) * 0.1;
        }
      }
    } else {
      this.nitroParticles.visible = false;
    }
    nPosAttr.needsUpdate = true;

    // Tire drift smoke
    const dPosAttr = this.driftGeo.attributes.position as THREE.BufferAttribute;
    const dArray = dPosAttr.array as Float32Array;
    if (isDrifting) {
      this.driftParticles.visible = true;
      for (let i = 0; i < dArray.length; i += 3) {
        if (Math.random() < 0.2) {
          const wheelOffset = new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.1, -1.2)
            .applyEuler(carRot)
            .add(carPos);
          dArray[i] = wheelOffset.x;
          dArray[i + 1] = wheelOffset.y;
          dArray[i + 2] = wheelOffset.z;
        } else {
          dArray[i + 1] += 0.08;
          dArray[i] += (Math.random() - 0.5) * 0.05;
          dArray[i + 2] += (Math.random() - 0.5) * 0.05;
        }
      }
    } else {
      this.driftParticles.visible = false;
    }
    dPosAttr.needsUpdate = true;
  }

  private updateCamera(delta: number) {
    const carPos = this.physics.state.position;
    const carRot = this.physics.state.rotation;
    const speed = this.physics.state.speedKmh;

    if (this.cameraMode === 'chase') {
      // Dynamic third-person camera with speed-dependent distance and FOV
      const distance = 7.2 + (speed / 130) * 1.8;
      const height = 3.1 + (speed / 130) * 0.6;

      _camOffset.set(0, height, -distance).applyEuler(carRot);
      _targetPos.copy(carPos).add(_camOffset);

      // Smooth exponential position lerp
      this.camera.position.lerp(_targetPos, Math.min(1.0, delta * 11));

      // Focal lookahead: look slightly ahead of the car for natural forward perspective
      _forward.set(0, 0, 3.2).applyEuler(carRot);
      _lookTarget.copy(carPos).add(new THREE.Vector3(0, 1.2, 0)).add(_forward);

      // Smooth focal damping eliminates camera yaw jitter on turns
      this.smoothLookTarget.lerp(_lookTarget, Math.min(1.0, delta * 14));
      this.camera.lookAt(this.smoothLookTarget);

      // Dynamic FOV widening on turbo speed
      const targetFov = 62 + (speed / 130) * 14;
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, delta);
      this.camera.updateProjectionMatrix();
    } else if (this.cameraMode === 'close') {
      _camOffset.set(0, 2.1, -4.6).applyEuler(carRot);
      _targetPos.copy(carPos).add(_camOffset);
      this.camera.position.lerp(_targetPos, Math.min(1.0, delta * 14));

      _forward.set(0, 0, 2.0).applyEuler(carRot);
      _lookTarget.copy(carPos).add(new THREE.Vector3(0, 0.9, 0)).add(_forward);
      this.smoothLookTarget.lerp(_lookTarget, Math.min(1.0, delta * 16));
      this.camera.lookAt(this.smoothLookTarget);
    } else if (this.cameraMode === 'hood') {
      _camOffset.set(0, 1.15, 0.4).applyEuler(carRot);
      this.camera.position.copy(carPos).add(_camOffset);
      _forward.set(0, 0, 15).applyEuler(carRot);
      _lookTarget.copy(this.camera.position).add(_forward);
      this.smoothLookTarget.lerp(_lookTarget, Math.min(1.0, delta * 20));
      this.camera.lookAt(this.smoothLookTarget);
    } else if (this.cameraMode === 'arcade') {
      // Top down bird's eye view
      _targetPos.set(carPos.x, carPos.y + 24, carPos.z - 12);
      this.camera.position.lerp(_targetPos, Math.min(1.0, delta * 8));
      this.smoothLookTarget.lerp(carPos, Math.min(1.0, delta * 12));
      this.camera.lookAt(this.smoothLookTarget);
    }
  }

  public setControls(input: ControlsInput) {
    this.currentControls.throttle = input.throttle;
    this.currentControls.steer = input.steer;
    this.currentControls.nitro = input.nitro;
    this.currentControls.handbrake = input.handbrake;
    this.currentControls.horn = input.horn;
    this.currentControls.reset = input.reset;
  }

  private startLoop() {
    const tick = () => {
      if (this.isDestroyed) return;

      const delta = Math.min(this.clock.getDelta(), 0.05);

      // 1. Step physics in exact lockstep with rendering
      this.physics.update(delta, this.currentControls);

      // 2. Step world animations (coins spinning, clouds floating, bowling pins)
      this.world.update(delta);

      // 3. Smoothly update camera tracking
      this.updateCamera(delta);

      // 4. Update dynamic particles
      this.updateParticles(this.physics.state.nitroRemaining < 98, this.physics.state.isDrifting);

      // 5. Render pristine 3D scene
      this.renderer.render(this.scene, this.camera);

      // 6. Notify telemetry listeners
      this.onTick?.(delta, this.physics.state);

      // Consistent 60 FPS requestAnimationFrame
      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  public stepPhysics(delta: number, input: ControlsInput) {
    this.setControls(input);
    this.physics.update(delta, input);
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}
