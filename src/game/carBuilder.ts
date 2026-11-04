import * as THREE from 'three';
import { CarModelType, PlayerCarState } from './types';

export interface CarRig {
  root: THREE.Group;
  bodyMesh: THREE.Mesh | THREE.Group;
  wheels: THREE.Group[];
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  exhaustPipes: THREE.Vector3[];
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  chassisOffset: number;
}

/**
 * Procedural texture generator for race car decals
 */
function createDecalTexture(decalType: string, baseHex: string, accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  if (decalType === 'checkered') {
    // Grand Prix Checkered Flag Pattern
    ctx.fillStyle = accentHex;
    const size = 32;
    for (let y = 140; y < 370; y += size) {
      for (let x = 0; x < 512; x += size) {
        if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
    // Bold racing number 1
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(256, 256, 75, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 90px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', 256, 260);
  } else if (decalType === 'stripes') {
    // Twin bold Le Mans racing stripes
    ctx.fillStyle = accentHex;
    ctx.fillRect(190, 0, 50, 512);
    ctx.fillRect(272, 0, 50, 512);
    ctx.fillRect(160, 0, 12, 512);
    ctx.fillRect(340, 0, 12, 512);
  } else if (decalType === 'flames') {
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.moveTo(120, 512);
    ctx.quadraticCurveTo(180, 260, 256, 120);
    ctx.quadraticCurveTo(332, 260, 392, 512);
    ctx.lineTo(330, 512);
    ctx.quadraticCurveTo(280, 300, 256, 200);
    ctx.quadraticCurveTo(232, 300, 180, 512);
    ctx.closePath();
    ctx.fill();
  } else if (decalType === 'lightning') {
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.moveTo(280, 0);
    ctx.lineTo(200, 240);
    ctx.lineTo(270, 240);
    ctx.lineTo(230, 512);
    ctx.lineTo(312, 220);
    ctx.lineTo(250, 220);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates a high-detail wheel assembly with tires, brake calipers, and chrome rims
 */
function createWheel(radius: number, width: number, isMonster: boolean = false): THREE.Group {
  const wheelGroup = new THREE.Group();

  // Rubber tire
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, isMonster ? 16 : 24);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.85,
    metalness: 0.05,
  });
  const tireMesh = new THREE.Mesh(tireGeo, tireMat);
  tireMesh.castShadow = true;
  wheelGroup.add(tireMesh);

  // Chrome rim
  const rimRadius = radius * (isMonster ? 0.55 : 0.65);
  const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, width * 1.02, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.95,
    roughness: 0.15,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  wheelGroup.add(rimMesh);

  // Red racing center nut
  const nutGeo = new THREE.CylinderGeometry(rimRadius * 0.3, rimRadius * 0.3, width * 1.06, 8);
  nutGeo.rotateZ(Math.PI / 2);
  const nutMesh = new THREE.Mesh(nutGeo, new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2, metalness: 0.8 }));
  wheelGroup.add(nutMesh);

  return wheelGroup;
}

export function buildCar(carState: PlayerCarState): CarRig {
  const root = new THREE.Group();
  root.name = 'RaceCar';

  const { modelType, color, accentColor, decal } = carState;
  const decalTexture = createDecalTexture(decal, color, accentColor);

  const carPaintMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    map: decal !== 'none' ? decalTexture : null,
    roughness: 0.22,
    metalness: 0.7,
  });

  const secondaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentColor),
    roughness: 0.3,
    metalness: 0.5,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.6,
    metalness: 0.3,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.65,
    transparent: true,
    opacity: 0.85,
  });

  const glowLightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef08a,
    emissiveIntensity: 2.0,
    roughness: 0.1,
  });

  const tailGlowMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 2.5,
    roughness: 0.1,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.95,
    roughness: 0.1,
  });

  const wheels: THREE.Group[] = [];
  const headlights: THREE.Mesh[] = [];
  const taillights: THREE.Mesh[] = [];
  let exhaustPipes: THREE.Vector3[] = [];
  let bodyGroup = new THREE.Group();

  let wheelRadius = 0.4;
  let wheelWidth = 0.3;
  let trackWidth = 1.7;
  let wheelBase = 2.4;
  let rideHeight = 0.4;

  if (modelType === 'formula') {
    // Formula Blitz (F1 / Open-Wheel Grand Prix Racer)
    wheelRadius = 0.42;
    wheelWidth = 0.34;
    trackWidth = 1.85;
    wheelBase = 2.7;
    rideHeight = 0.35;

    // 1. Tapered Needle Nose & Cockpit
    const noseGeo = new THREE.ConeGeometry(0.55, 3.8, 6);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, carPaintMat);
    nose.position.set(0, 0.35, 0.3);
    nose.castShadow = true;
    bodyGroup.add(nose);

    // Engine Cowling / Airbox Intake behind driver
    const airboxGeo = new THREE.BoxGeometry(0.65, 0.55, 1.4);
    const airbox = new THREE.Mesh(airboxGeo, secondaryMat);
    airbox.position.set(0, 0.75, -0.4);
    bodyGroup.add(airbox);

    // Driver Helmet
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 })
    );
    helmet.position.set(0, 0.65, 0.3);
    bodyGroup.add(helmet);

    // 2. Wide Front Aerodynamic Wing
    const fWing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.55), carbonMat);
    fWing.position.set(0, 0.18, 2.1);
    fWing.castShadow = true;
    bodyGroup.add(fWing);

    // Front Wing Endplates
    for (const side of [-0.95, 0.95]) {
      const ep = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.58), secondaryMat);
      ep.position.set(side, 0.25, 2.1);
      bodyGroup.add(ep);
    }

    // 3. Giant Dual-Tier Rear GT Wing
    const rWing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.5), secondaryMat);
    rWing.position.set(0, 1.15, -1.9);
    rWing.castShadow = true;
    const rWingSupport1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.3), carbonMat);
    rWingSupport1.position.set(-0.45, 0.85, -1.85);
    const rWingSupport2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.3), carbonMat);
    rWingSupport2.position.set(0.45, 0.85, -1.85);
    bodyGroup.add(rWing, rWingSupport1, rWingSupport2);

    // 4. Center Flashing F1 Rain Light
    const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.06), tailGlowMat);
    rainLight.position.set(0, 0.35, -2.05);
    taillights.push(rainLight);
    bodyGroup.add(rainLight);

    exhaustPipes.push(new THREE.Vector3(0, 0.5, -2.05));
  } else if (modelType === 'drifter') {
    // Street Drifter Tuner Car (Widebody kit, intercooler, ducktail spoiler)
    wheelRadius = 0.38;
    wheelWidth = 0.32;
    trackWidth = 1.72;
    wheelBase = 2.35;
    rideHeight = 0.36;

    // Body
    const bodyGeo = new THREE.BoxGeometry(1.68, 0.44, 3.7);
    const body = new THREE.Mesh(bodyGeo, carPaintMat);
    body.position.y = 0.34;
    body.castShadow = true;
    bodyGroup.add(body);

    // Widebody Riveted Fender Flares
    const flareGeo = new THREE.BoxGeometry(1.82, 0.32, 1.2);
    const flareF = new THREE.Mesh(flareGeo, carbonMat);
    flareF.position.set(0, 0.34, 1.1);
    const flareR = new THREE.Mesh(flareGeo, carbonMat);
    flareR.position.set(0, 0.34, -1.1);
    bodyGroup.add(flareF, flareR);

    // Cabin Glass
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.46, 1.9), glassMat);
    cabin.position.set(0, 0.72, -0.2);
    bodyGroup.add(cabin);

    // Front Intercooler Grille
    const ic = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.08), chromeMat);
    ic.position.set(0, 0.26, 1.88);
    bodyGroup.add(ic);

    // Ducktail Trunk Spoiler
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.35), secondaryMat);
    spoiler.position.set(0, 0.65, -1.75);
    spoiler.rotation.x = Math.PI / 5;
    bodyGroup.add(spoiler);

    // Quad Exhaust Tips
    for (const x of [-0.45, -0.32, 0.32, 0.45]) {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10), chromeMat);
      tip.rotateX(Math.PI / 2);
      tip.position.set(x, 0.22, -1.9);
      bodyGroup.add(tip);
    }

    exhaustPipes.push(new THREE.Vector3(-0.38, 0.22, -2.0));
    exhaustPipes.push(new THREE.Vector3(0.38, 0.22, -2.0));

    // LED headlights & taillights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), glowLightMat);
    hlL.position.set(-0.55, 0.42, 1.86);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), glowLightMat);
    hlR.position.set(0.55, 0.42, 1.86);
    headlights.push(hlL, hlR);
    bodyGroup.add(hlL, hlR);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.08), tailGlowMat);
    tl.position.set(0, 0.48, -1.86);
    taillights.push(tl);
    bodyGroup.add(tl);
  } else if (modelType === 'monster') {
    // Thunder Monster Truck
    wheelRadius = 0.62;
    wheelWidth = 0.45;
    trackWidth = 2.15;
    wheelBase = 2.6;
    rideHeight = 0.62;

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 3.2), carbonMat);
    chassis.position.y = 0.65;
    bodyGroup.add(chassis);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.85, 2.0), carPaintMat);
    cab.position.set(0, 1.15, -0.2);
    cab.castShadow = true;
    bodyGroup.add(cab);

    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 1.2), secondaryMat);
    bed.position.set(0, 0.95, -1.4);
    bodyGroup.add(bed);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.5, 1.1), carPaintMat);
    hood.position.set(0, 0.95, 1.1);
    bodyGroup.add(hood);

    // Chrome Bull Bar
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8), chromeMat);
    bar.rotateZ(Math.PI / 2);
    bar.position.set(0, 0.75, 1.75);
    bodyGroup.add(bar);

    // Roof lightbar (4 round lamps)
    for (let i = -1.5; i <= 1.5; i += 1) {
      const rl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glowLightMat);
      rl.position.set(i * 0.38, 1.68, 0.1);
      bodyGroup.add(rl);
      headlights.push(rl);
    }

    exhaustPipes.push(new THREE.Vector3(-0.9, 1.75, -0.8));
    exhaustPipes.push(new THREE.Vector3(0.9, 1.75, -0.8));
  } else if (modelType === 'cyber') {
    // Cyber Phantom
    wheelRadius = 0.38;
    wheelWidth = 0.3;
    trackWidth = 1.75;
    wheelBase = 2.45;
    rideHeight = 0.38;

    const wedge = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.38, 3.9), carPaintMat);
    wedge.position.set(0, 0.34, 0);
    wedge.castShadow = true;
    bodyGroup.add(wedge);

    const stealth = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 4), glassMat);
    stealth.rotateY(Math.PI / 4);
    stealth.rotateX(Math.PI / 2);
    stealth.scale.set(1.2, 0.38, 1);
    stealth.position.set(0, 0.65, -0.2);
    bodyGroup.add(stealth);

    // Front Laser Strip
    const laserMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 3.0 });
    const laser = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.06), laserMat);
    laser.position.set(0, 0.36, 1.95);
    headlights.push(laser);
    bodyGroup.add(laser);

    // Rear Cyber Taillight
    const cTailMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 3.5 });
    const cTail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.06), cTailMat);
    cTail.position.set(0, 0.42, -1.95);
    taillights.push(cTail);
    bodyGroup.add(cTail);

    exhaustPipes.push(new THREE.Vector3(-0.4, 0.25, -2.0));
    exhaustPipes.push(new THREE.Vector3(0.4, 0.25, -2.0));
  } else {
    // Apex GT Supercar (Default)
    wheelRadius = 0.38;
    wheelWidth = 0.28;
    trackWidth = 1.62;
    wheelBase = 2.3;
    rideHeight = 0.38;

    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 3.8), carPaintMat);
    lowerBody.position.y = 0.35;
    lowerBody.castShadow = true;
    bodyGroup.add(lowerBody);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.45, 1.8), glassMat);
    cabin.position.set(0, 0.7, -0.2);
    bodyGroup.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 1.4), secondaryMat);
    roof.position.set(0, 0.94, -0.2);
    bodyGroup.add(roof);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.42), secondaryMat);
    wing.position.set(0, 0.95, -1.8);
    bodyGroup.add(wing);

    const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.1), glowLightMat);
    hlLeft.position.set(-0.55, 0.4, 1.9);
    const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.1), glowLightMat);
    hlRight.position.set(0.55, 0.4, 1.9);
    headlights.push(hlLeft, hlRight);
    bodyGroup.add(hlLeft, hlRight);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.12, 0.08), tailGlowMat);
    tl.position.set(0, 0.45, -1.9);
    taillights.push(tl);
    bodyGroup.add(tl);

    exhaustPipes.push(new THREE.Vector3(-0.35, 0.22, -2.0));
    exhaustPipes.push(new THREE.Vector3(0.35, 0.22, -2.0));
  }

  bodyGroup.position.y = rideHeight;
  root.add(bodyGroup);

  // Wheels
  const isMonster = modelType === 'monster';
  const frontLeft = createWheel(wheelRadius, wheelWidth, isMonster);
  frontLeft.position.set(-trackWidth / 2, rideHeight, wheelBase / 2);

  const frontRight = createWheel(wheelRadius, wheelWidth, isMonster);
  frontRight.position.set(trackWidth / 2, rideHeight, wheelBase / 2);

  const rearLeft = createWheel(wheelRadius, wheelWidth, isMonster);
  rearLeft.position.set(-trackWidth / 2, rideHeight, -wheelBase / 2);

  const rearRight = createWheel(wheelRadius, wheelWidth, isMonster);
  rearRight.position.set(trackWidth / 2, rideHeight, -wheelBase / 2);

  root.add(frontLeft, frontRight, rearLeft, rearRight);
  wheels.push(frontLeft, frontRight, rearLeft, rearRight);

  return {
    root,
    bodyMesh: bodyGroup,
    wheels,
    frontLeftWheel: frontLeft,
    frontRightWheel: frontRight,
    rearLeftWheel: rearLeft,
    rearRightWheel: rearRight,
    exhaustPipes,
    headlights,
    taillights,
    chassisOffset: rideHeight,
  };
}
