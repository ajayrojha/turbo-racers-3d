import * as THREE from 'three';
import { AIRacer, BowlingPin, CheckpointGate, CollectibleItem } from './types';
import { buildCar } from './carBuilder';
import brothersBillboardUrl from '../assets/images/brothers_billboard_1793722144982.jpg';

export interface WorldData {
  sceneGroup: THREE.Group;
  colliders: { box: THREE.Box3; type: string; bounce?: number }[];
  railSegments: { x1: number; z1: number; x2: number; z2: number }[];
  ramps: { mesh: THREE.Mesh; normal: THREE.Vector3 }[];
  boostPads: { position: THREE.Vector3; direction: THREE.Vector3; radius: number }[];
  coins: CollectibleItem[];
  stars: CollectibleItem[];
  checkpoints: CheckpointGate[];
  bowlingPins: BowlingPin[];
  aiRacers: AIRacer[];
  circuitWaypoints: THREE.Vector3[];
  clouds: THREE.Group[];
  update: (delta: number) => void;
  getTerrainHeight: (x: number, z: number) => number;
}

export function buildSunnyIslandWorld(): WorldData {
  const sceneGroup = new THREE.Group();
  sceneGroup.name = 'SunnyParkKidsRaceway';

  const colliders: { box: THREE.Box3; type: string; bounce?: number }[] = [];
  const railSegments: { x1: number; z1: number; x2: number; z2: number }[] = [];
  const ramps: { mesh: THREE.Mesh; normal: THREE.Vector3 }[] = [];
  const boostPads: { position: THREE.Vector3; direction: THREE.Vector3; radius: number }[] = [];
  const coins: CollectibleItem[] = [];
  const stars: CollectibleItem[] = [];
  const checkpoints: CheckpointGate[] = [];
  const bowlingPins: BowlingPin[] = [];
  const clouds: THREE.Group[] = [];

  // Duck and swing animation references
  const ducks: { mesh: THREE.Group; baseY: number; phase: number }[] = [];
  const swings: { mesh: THREE.Mesh; phase: number }[] = [];
  const cows: { head: THREE.Group; phase: number }[] = [];

  // 1. Terrain & Materials
  // The central racing area is flat at y = 0.05 so everything is clean and easy to see
  const getTerrainHeight = (x: number, z: number): number => {
    const dist = Math.hypot(x - 28, z + 8);
    if (dist < 110) return 0.05;
    const hillDist = dist - 110;
    return 0.05 + Math.min(18, Math.pow(hillDist * 0.12, 1.5));
  };

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e, // Bright sunny kid-friendly green
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });

  const groundGeo = new THREE.PlaneGeometry(450, 450, 70, 70);
  groundGeo.rotateX(-Math.PI / 2);
  const posAttr = groundGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, getTerrainHeight(vx, vz));
  }
  groundGeo.computeVertexNormals();
  const groundMesh = new THREE.Mesh(groundGeo, grassMat);
  groundMesh.receiveShadow = true;
  sceneGroup.add(groundMesh);

  // Core Track Materials
  const trackAsphaltMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark racing asphalt
    roughness: 0.65,
    metalness: 0.15,
  });
  const curbRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const curbWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const stripeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const stripeYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
  const barrierSteelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });

  // 2. SIMPLE, SMALLER, GENTLE ROUNDED PARK CIRCUIT (Perfect for ages 4-7!)
  const trackWidth = 16;
  const roadY = 0.22;

  const trackWaypoints = [
    new THREE.Vector3(0, roadY, -45),   // 0: Start / Finish Line Grid (Town Straight)
    new THREE.Vector3(0, roadY, -10),   // 1: Passing Toy Shop & Bakery
    new THREE.Vector3(0, roadY, 20),    // 2: Main Straight End
    new THREE.Vector3(12, roadY, 44),   // 3: Turn 1 Entry (sweeping gently around playground)
    new THREE.Vector3(30, roadY, 50),   // 4: Turn 1 Apex
    new THREE.Vector3(48, roadY, 40),   // 5: Turn 1 Exit into East Straight
    new THREE.Vector3(56, roadY, 15),   // 6: East Straight (passing Duck Pond)
    new THREE.Vector3(56, roadY, -15),  // 7: East Straight (passing Animal Farm)
    new THREE.Vector3(56, roadY, -40),  // 8: South Turn Entry
    new THREE.Vector3(44, roadY, -60),  // 9: South Turn Apex (passing Cottages)
    new THREE.Vector3(26, roadY, -64),  // 10: South Turn Mid
    new THREE.Vector3(8, roadY, -58),   // 11: Final Turn merging back to Main Straight
  ];

  const trackCurve = new THREE.CatmullRomCurve3(trackWaypoints, true, 'centripetal', 0.5);

  const numDivs = 240;
  const leftRoadPts: THREE.Vector3[] = [];
  const rightRoadPts: THREE.Vector3[] = [];
  const centerRoadPts: THREE.Vector3[] = [];
  const tangents: THREE.Vector3[] = [];
  const binormals: THREE.Vector3[] = [];
  const leftRailPts: THREE.Vector3[] = [];
  const rightRailPts: THREE.Vector3[] = [];

  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= numDivs; i++) {
    const t = i / numDivs;
    const P = trackCurve.getPointAt(t);
    const T = trackCurve.getTangentAt(t);
    const B = new THREE.Vector3().crossVectors(T, up).normalize();

    centerRoadPts.push(P);
    tangents.push(T);
    binormals.push(B);

    leftRoadPts.push(P.clone().addScaledVector(B, trackWidth / 2));
    rightRoadPts.push(P.clone().addScaledVector(B, -trackWidth / 2));

    leftRailPts.push(P.clone().addScaledVector(B, trackWidth / 2 + 1.25));
    rightRailPts.push(P.clone().addScaledVector(B, -trackWidth / 2 - 1.25));
  }

  // A. Seamless Asphalt Mesh
  const asphaltPositions = new Float32Array(numDivs * 6 * 3);
  const asphaltNormals = new Float32Array(numDivs * 6 * 3);
  let vIdx = 0;

  for (let i = 0; i < numDivs; i++) {
    const l1 = leftRoadPts[i];
    const r1 = rightRoadPts[i];
    const l2 = leftRoadPts[i + 1];
    const r2 = rightRoadPts[i + 1];

    const setV = (p: THREE.Vector3) => {
      asphaltPositions[vIdx] = p.x;
      asphaltPositions[vIdx + 1] = p.y;
      asphaltPositions[vIdx + 2] = p.z;
      asphaltNormals[vIdx] = 0;
      asphaltNormals[vIdx + 1] = 1;
      asphaltNormals[vIdx + 2] = 0;
      vIdx += 3;
    };

    setV(l1); setV(r1); setV(l2);
    setV(r1); setV(r2); setV(l2);
  }

  const asphaltGeo = new THREE.BufferGeometry();
  asphaltGeo.setAttribute('position', new THREE.BufferAttribute(asphaltPositions, 3));
  asphaltGeo.setAttribute('normal', new THREE.BufferAttribute(asphaltNormals, 3));
  const asphaltMesh = new THREE.Mesh(asphaltGeo, trackAsphaltMat);
  asphaltMesh.receiveShadow = true;
  sceneGroup.add(asphaltMesh);

  // B. Yellow Dashed Center Line
  const centerDashesGeo = new THREE.BufferGeometry();
  const dashPositions: number[] = [];
  const dashWidth = 0.35;

  for (let i = 0; i < numDivs; i++) {
    if (i % 6 < 3) {
      const c1 = centerRoadPts[i];
      const c2 = centerRoadPts[i + 1];
      const b1 = binormals[i];
      const b2 = binormals[i + 1];

      const p1 = c1.clone().addScaledVector(b1, dashWidth / 2);
      const p2 = c1.clone().addScaledVector(b1, -dashWidth / 2);
      const p3 = c2.clone().addScaledVector(b2, dashWidth / 2);
      const p4 = c2.clone().addScaledVector(b2, -dashWidth / 2);

      const yOff = 0.02;
      p1.y += yOff; p2.y += yOff; p3.y += yOff; p4.y += yOff;

      dashPositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
      dashPositions.push(p2.x, p2.y, p2.z, p4.x, p4.y, p4.z, p3.x, p3.y, p3.z);
    }
  }

  centerDashesGeo.setAttribute('position', new THREE.Float32BufferAttribute(dashPositions, 3));
  centerDashesGeo.computeVertexNormals();
  sceneGroup.add(new THREE.Mesh(centerDashesGeo, stripeYellowMat));

  // C. White Solid Border Lines
  const edgeLinesGeo = new THREE.BufferGeometry();
  const edgePositions: number[] = [];
  const edgeLineW = 0.35;

  for (let i = 0; i < numDivs; i++) {
    const b1 = binormals[i];
    const b2 = binormals[i + 1];

    const lp1 = leftRoadPts[i].clone().addScaledVector(b1, -0.6);
    const lp2 = leftRoadPts[i].clone().addScaledVector(b1, -0.6 - edgeLineW);
    const lp3 = leftRoadPts[i + 1].clone().addScaledVector(b2, -0.6);
    const lp4 = leftRoadPts[i + 1].clone().addScaledVector(b2, -0.6 - edgeLineW);

    const yOff = 0.02;
    lp1.y += yOff; lp2.y += yOff; lp3.y += yOff; lp4.y += yOff;
    edgePositions.push(lp1.x, lp1.y, lp1.z, lp2.x, lp2.y, lp2.z, lp3.x, lp3.y, lp3.z);
    edgePositions.push(lp2.x, lp2.y, lp2.z, lp4.x, lp4.y, lp4.z, lp3.x, lp3.y, lp3.z);

    const rp1 = rightRoadPts[i].clone().addScaledVector(b1, 0.6 + edgeLineW);
    const rp2 = rightRoadPts[i].clone().addScaledVector(b1, 0.6);
    const rp3 = rightRoadPts[i + 1].clone().addScaledVector(b2, 0.6 + edgeLineW);
    const rp4 = rightRoadPts[i + 1].clone().addScaledVector(b2, 0.6);

    rp1.y += yOff; rp2.y += yOff; rp3.y += yOff; rp4.y += yOff;
    edgePositions.push(rp1.x, rp1.y, rp1.z, rp2.x, rp2.y, rp2.z, rp3.x, rp3.y, rp3.z);
    edgePositions.push(rp2.x, rp2.y, rp2.z, rp4.x, rp4.y, rp4.z, rp3.x, rp3.y, rp3.z);
  }

  edgeLinesGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
  edgeLinesGeo.computeVertexNormals();
  sceneGroup.add(new THREE.Mesh(edgeLinesGeo, stripeWhiteMat));

  // D. Red & White 3D Rumble Kerbs
  const curbRedPositions: number[] = [];
  const curbWhitePositions: number[] = [];
  const curbW = 0.75;

  for (let i = 0; i < numDivs; i++) {
    const isRed = Math.floor(i / 3) % 2 === 0;
    const targetArr = isRed ? curbRedPositions : curbWhitePositions;
    const b1 = binormals[i];
    const b2 = binormals[i + 1];

    const cl1 = leftRoadPts[i].clone();
    const cl2 = leftRoadPts[i].clone().addScaledVector(b1, curbW);
    const cl3 = leftRoadPts[i + 1].clone();
    const cl4 = leftRoadPts[i + 1].clone().addScaledVector(b2, curbW);
    cl1.y += 0.05; cl2.y += 0.08; cl3.y += 0.05; cl4.y += 0.08;

    targetArr.push(cl1.x, cl1.y, cl1.z, cl2.x, cl2.y, cl2.z, cl3.x, cl3.y, cl3.z);
    targetArr.push(cl2.x, cl2.y, cl2.z, cl4.x, cl4.y, cl4.z, cl3.x, cl3.y, cl3.z);

    const cr1 = rightRoadPts[i].clone().addScaledVector(b1, -curbW);
    const cr2 = rightRoadPts[i].clone();
    const cr3 = rightRoadPts[i + 1].clone().addScaledVector(b2, -curbW);
    const cr4 = rightRoadPts[i + 1].clone();
    cr1.y += 0.08; cr2.y += 0.05; cr3.y += 0.08; cr4.y += 0.05;

    targetArr.push(cr1.x, cr1.y, cr1.z, cr2.x, cr2.y, cr2.z, cr3.x, cr3.y, cr3.z);
    targetArr.push(cr2.x, cr2.y, cr2.z, cr4.x, cr4.y, cr4.z, cr3.x, cr3.y, cr3.z);
  }

  const curbRedGeo = new THREE.BufferGeometry();
  curbRedGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbRedPositions, 3));
  curbRedGeo.computeVertexNormals();
  sceneGroup.add(new THREE.Mesh(curbRedGeo, curbRedMat));

  const curbWhiteGeo = new THREE.BufferGeometry();
  curbWhiteGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbWhitePositions, 3));
  curbWhiteGeo.computeVertexNormals();
  sceneGroup.add(new THREE.Mesh(curbWhiteGeo, curbWhiteMat));

  // E. Outer Armco Steel Guardrails & Continuous Colliders
  const railPositions: number[] = [];
  const railH = 0.85;

  for (let i = 0; i < numDivs; i++) {
    const l1 = leftRailPts[i];
    const l2 = leftRailPts[i + 1];
    railPositions.push(l1.x, l1.y, l1.z, l1.x, l1.y + railH, l1.z, l2.x, l2.y, l2.z);
    railPositions.push(l1.x, l1.y + railH, l1.z, l2.x, l2.y + railH, l2.z, l2.x, l2.y, l2.z);

    const r1 = rightRailPts[i];
    const r2 = rightRailPts[i + 1];
    railPositions.push(r1.x, r1.y + railH, r1.z, r1.x, r1.y, r1.z, r2.x, r2.y, r2.z);
    railPositions.push(r1.x, r1.y + railH, r1.z, r2.x, r2.y, r2.z, r2.x, r2.y + railH, r2.z);

    railSegments.push({ x1: l1.x, z1: l1.z, x2: l2.x, z2: l2.z });
    railSegments.push({ x1: r1.x, z1: r1.z, x2: r2.x, z2: r2.z });

    if (i % 8 === 0) {
      const postGeo = new THREE.CylinderGeometry(0.12, 0.12, railH + 0.2, 8);
      const postL = new THREE.Mesh(postGeo, barrierSteelMat);
      postL.position.set(l1.x, l1.y + railH / 2, l1.z);
      const postR = new THREE.Mesh(postGeo, barrierSteelMat);
      postR.position.set(r1.x, r1.y + railH / 2, r1.z);
      sceneGroup.add(postL, postR);
    }
  }

  const railsGeo = new THREE.BufferGeometry();
  railsGeo.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3));
  railsGeo.computeVertexNormals();
  const railsMesh = new THREE.Mesh(railsGeo, barrierSteelMat);
  sceneGroup.add(railsMesh);

  // 3. START / FINISH LINE GANTRY (at z = -45)
  const gantryGroup = new THREE.Group();
  gantryGroup.position.set(0, roadY, -45);

  const pillarGeo = new THREE.BoxGeometry(1.6, 9.5, 1.6);
  const pillarL = new THREE.Mesh(pillarGeo, barrierSteelMat);
  pillarL.position.set(-trackWidth / 2 - 2.8, 4.75, 0);
  const pillarR = new THREE.Mesh(pillarGeo, barrierSteelMat);
  pillarR.position.set(trackWidth / 2 + 2.8, 4.75, 0);

  const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(trackWidth + 6.5, 1.6, 1.6), barrierSteelMat);
  crossBeam.position.set(0, 9.2, 0);
  gantryGroup.add(pillarL, pillarR, crossBeam);

  // Checkered banner
  const bannerCanvas = document.createElement('canvas');
  bannerCanvas.width = 512; bannerCanvas.height = 128;
  const bctx = bannerCanvas.getContext('2d')!;
  bctx.fillStyle = '#0f172a'; bctx.fillRect(0, 0, 512, 128);
  for (let y = 0; y < 128; y += 32) {
    for (let x = 0; x < 512; x += 32) {
      if ((Math.floor(x / 32) + Math.floor(y / 32)) % 2 === 0) {
        bctx.fillStyle = '#ffffff'; bctx.fillRect(x, y, 32, 32);
      }
    }
  }
  bctx.fillStyle = '#ef4444'; bctx.fillRect(0, 36, 512, 56);
  bctx.fillStyle = '#ffffff'; bctx.font = 'bold 36px sans-serif'; bctx.textAlign = 'center';
  bctx.fillText('FINISH LINE · KIDS GP', 256, 76);

  const bannerTex = new THREE.CanvasTexture(bannerCanvas);
  const bannerMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(trackWidth + 4, 2.6),
    new THREE.MeshStandardMaterial({ map: bannerTex, side: THREE.DoubleSide })
  );
  bannerMesh.position.set(0, 9.2, 0.85);
  gantryGroup.add(bannerMesh);

  // 5 Active Starting Lanterns
  for (let i = -2; i <= 2; i++) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.5 })
    );
    lamp.position.set(i * 2.2, 7.8, 0.85);
    gantryGroup.add(lamp);
  }

  // Checkered road finish line
  const lineCanvas = document.createElement('canvas');
  lineCanvas.width = 512; lineCanvas.height = 128;
  const lctx = lineCanvas.getContext('2d')!;
  for (let y = 0; y < 128; y += 32) {
    for (let x = 0; x < 512; x += 32) {
      lctx.fillStyle = (Math.floor(x / 32) + Math.floor(y / 32)) % 2 === 0 ? '#ffffff' : '#111827';
      lctx.fillRect(x, y, 32, 32);
    }
  }
  const roadFinish = new THREE.Mesh(
    new THREE.PlaneGeometry(trackWidth, 4.5),
    new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(lineCanvas) })
  );
  roadFinish.rotateX(-Math.PI / 2);
  roadFinish.position.set(0, 0.05, 0);
  gantryGroup.add(roadFinish);

  sceneGroup.add(gantryGroup);
  gantryGroup.updateMatrixWorld(true);
  colliders.push({ box: new THREE.Box3().setFromObject(pillarL), type: 'gantry_pillar', bounce: 0.3 });
  colliders.push({ box: new THREE.Box3().setFromObject(pillarR), type: 'gantry_pillar', bounce: 0.3 });

  // 4. THE BILLBOARDS STAY! (Giant Illuminated Cartoon Brothers Billboards)
  const textureLoader = new THREE.TextureLoader();
  const brothersTexture = textureLoader.load(brothersBillboardUrl);
  brothersTexture.colorSpace = THREE.SRGBColorSpace;
  brothersTexture.generateMipmaps = true;
  brothersTexture.minFilter = THREE.LinearMipmapLinearFilter;

  const photoMat = new THREE.MeshStandardMaterial({
    map: brothersTexture,
    roughness: 0.4,
    metalness: 0.1,
  });

  const neonTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 2.5,
  });

  const billboardFrameMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.85,
    roughness: 0.25,
  });

  const createPhotoBillboard = (
    title: string,
    x: number,
    z: number,
    rotY: number,
    w: number = 15,
    h: number = 8.44
  ) => {
    const bbGroup = new THREE.Group();
    bbGroup.position.set(x, roadY, z);
    bbGroup.rotation.y = rotY;

    const colHeight = 11.0;
    const colGeo = new THREE.CylinderGeometry(0.35, 0.45, colHeight, 12);

    const colL = new THREE.Mesh(colGeo, barrierSteelMat);
    colL.position.set(-w * 0.35, colHeight / 2, 0);
    const colR = new THREE.Mesh(colGeo, barrierSteelMat);
    colR.position.set(w * 0.35, colHeight / 2, 0);

    for (let ty = 2.5; ty < colHeight - 1; ty += 2.5) {
      const truss = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.18, 0.18), barrierSteelMat);
      truss.position.set(0, ty, 0);
      bbGroup.add(truss);
    }
    bbGroup.add(colL, colR);

    const frameCenterY = colHeight + h / 2 - 2.0;
    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(w + 1.0, h + 1.4, 0.6),
      billboardFrameMat
    );
    frameMesh.position.set(0, frameCenterY, 0);
    bbGroup.add(frameMesh);

    const photoMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), photoMat);
    photoMesh.position.set(0, frameCenterY - 0.2, 0.32);
    bbGroup.add(photoMesh);

    const topTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.2, 0.2), neonTrimMat);
    topTrim.position.set(0, frameCenterY + h / 2 + 0.45, 0.35);
    const bottomTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.2, 0.2), neonTrimMat);
    bottomTrim.position.set(0, frameCenterY - h / 2 - 0.45, 0.35);
    bbGroup.add(topTrim, bottomTrim);

    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 512; badgeCanvas.height = 96;
    const bctx2 = badgeCanvas.getContext('2d')!;
    bctx2.fillStyle = '#0f172a'; bctx2.fillRect(0, 0, 512, 96);
    bctx2.fillStyle = '#f59e0b'; bctx2.fillRect(0, 0, 512, 6); bctx2.fillRect(0, 90, 512, 6);
    bctx2.fillStyle = '#ffffff'; bctx2.font = 'bold 36px sans-serif'; bctx2.textAlign = 'center';
    bctx2.fillText(title, 256, 60);

    const badgeTex = new THREE.CanvasTexture(badgeCanvas);
    const badgeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.75, 1.2),
      new THREE.MeshStandardMaterial({ map: badgeTex })
    );
    badgeMesh.position.set(0, frameCenterY + h / 2 + 0.1, 0.33);
    bbGroup.add(badgeMesh);

    // 3 Overhead floodlight lamps
    for (let fl = -w * 0.35; fl <= w * 0.35; fl += w * 0.35) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), barrierSteelMat);
      arm.position.set(fl, frameCenterY + h / 2 + 0.6, 0.8);
      arm.rotation.x = Math.PI / 4;
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffedd5, emissiveIntensity: 2.8 })
      );
      bulb.position.set(fl, frameCenterY + h / 2 + 1.0, 1.4);
      bbGroup.add(arm, bulb);
    }

    sceneGroup.add(bbGroup);
    bbGroup.updateMatrixWorld(true);
    colliders.push({ box: new THREE.Box3().setFromObject(colL), type: 'billboard_col', bounce: 0.35 });
    colliders.push({ box: new THREE.Box3().setFromObject(colR), type: 'billboard_col', bounce: 0.35 });
  };

  // 3 Giant Cartoon Billboards placed in high-visibility spots:
  createPhotoBillboard('⭐ SUPERSTAR BROTHERS GP ⭐', 15, 68, Math.PI, 15, 8.44);
  createPhotoBillboard('🔥 BROTHERS SPEED RACING 🔥', 75, -12, -Math.PI / 2, 15, 8.44);
  createPhotoBillboard('🏆 CHAMPIONSHIP HEROES 🏆', 26, -80, 0, 15, 8.44);

  // 5. SCENIC DUCK POND (Infield at x = 28, z = -5)
  const pondGroup = new THREE.Group();
  pondGroup.position.set(28, roadY + 0.02, -5);

  // Sandy shoreline ring
  const shoreMesh = new THREE.Mesh(
    new THREE.RingGeometry(11, 14, 32),
    new THREE.MeshStandardMaterial({ color: 0xd4b996, roughness: 0.9 })
  );
  shoreMesh.rotateX(-Math.PI / 2);
  pondGroup.add(shoreMesh);

  // Water Surface
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88,
  });
  const waterMesh = new THREE.Mesh(new THREE.CircleGeometry(11.5, 32), waterMat);
  waterMesh.rotateX(-Math.PI / 2);
  waterMesh.position.y = 0.01;
  pondGroup.add(waterMesh);

  // 4 Cute Cartoon Ducks with orange beaks
  const duckMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.2 });

  const duckCoords = [
    { x: -3.5, z: 2.2 },
    { x: 2.8, z: 3.5 },
    { x: -2.0, z: -4.0 },
    { x: 4.2, z: -1.8 },
  ];

  duckCoords.forEach((dCoord, idx) => {
    const dGroup = new THREE.Group();
    dGroup.position.set(dCoord.x, 0.15, dCoord.z);
    dGroup.rotation.y = idx * 1.5;

    // Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), duckMat);
    body.scale.set(1.0, 0.7, 1.3);
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), duckMat);
    head.position.set(0, 0.35, 0.35);
    // Beak
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 8), beakMat);
    beak.rotateX(Math.PI / 2);
    beak.position.set(0, 0.32, 0.58);

    dGroup.add(body, head, beak);
    pondGroup.add(dGroup);
    ducks.push({ mesh: dGroup, baseY: 0.15, phase: idx * 1.6 });
  });

  // Lily Pads with Pink Lotus flowers
  const padMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.3 });

  for (let lp = 0; lp < 6; lp++) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.75, 12), padMat);
    pad.rotateX(-Math.PI / 2);
    const ang = lp * 1.1;
    const rad = 4 + (lp % 3) * 2.2;
    pad.position.set(Math.cos(ang) * rad, 0.02, Math.sin(ang) * rad);
    pondGroup.add(pad);

    if (lp % 2 === 0) {
      const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), flowerMat);
      flower.position.set(pad.position.x, 0.15, pad.position.z);
      pondGroup.add(flower);
    }
  }

  sceneGroup.add(pondGroup);

  // 6. FARM PASTURE & FRIENDLY ANIMALS (East roadside: cows, sheep, dog, wooden fence)
  const farmGroup = new THREE.Group();
  farmGroup.position.set(74, roadY, -15);

  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }); // White wooden picket fence
  // Fence posts & rails along road
  for (let fz = -30; fz <= 25; fz += 5) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.4, 0.25), fenceMat);
    post.position.set(-6, 0.7, fz);
    farmGroup.add(post);

    if (fz < 25) {
      const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 5), fenceMat);
      rail1.position.set(-6, 0.5, fz + 2.5);
      const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 5), fenceMat);
      rail2.position.set(-6, 1.0, fz + 2.5);
      farmGroup.add(rail1, rail2);
    }
  }

  // A. Cute Cartoon Cows (Black & White spotted)
  const cowWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const cowBlackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
  const cowPinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.3 });

  const createCow = (cx: number, cz: number, rotY: number) => {
    const cow = new THREE.Group();
    cow.position.set(cx, 0, cz);
    cow.rotation.y = rotY;

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 2.8), cowWhiteMat);
    body.position.set(0, 1.4, 0);
    // Black spots
    const spot1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 1.1), cowBlackMat);
    spot1.position.set(0.5, 1.5, 0.3);
    const spot2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.9), cowBlackMat);
    spot2.position.set(-0.55, 1.4, -0.6);
    cow.add(body, spot1, spot2);

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.16, 0.14, 1.0, 8);
    [[-0.6, -0.9], [0.6, -0.9], [-0.6, 0.9], [0.6, 0.9]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, cowWhiteMat);
      leg.position.set(lx, 0.5, lz);
      cow.add(leg);
    });

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.8, 1.5);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.9), cowWhiteMat);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), cowPinkMat);
    muzzle.position.set(0, -0.2, 0.55);
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.15), cowBlackMat);
    earL.position.set(-0.55, 0.2, 0);
    const earR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.15), cowBlackMat);
    earR.position.set(0.55, 0.2, 0);
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), hornMat);
    hornL.position.set(-0.35, 0.55, 0);
    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), hornMat);
    hornR.position.set(0.35, 0.55, 0);

    headGroup.add(head, muzzle, earL, earR, hornL, hornR);
    cow.add(headGroup);
    cows.push({ head: headGroup, phase: cx });

    farmGroup.add(cow);
  };

  createCow(3, -12, Math.PI / 4);
  createCow(6, 4, -Math.PI / 3);

  // B. Fluffy White Sheep
  const createSheep = (sx: number, sz: number, rotY: number) => {
    const sheep = new THREE.Group();
    sheep.position.set(sx, 0, sz);
    sheep.rotation.y = rotY;

    // Fluffy cloud body made of overlapping white spheres
    const woolMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
    const woolBody = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), woolMat);
    woolBody.scale.set(1.1, 0.9, 1.4);
    woolBody.position.set(0, 0.95, 0);
    sheep.add(woolBody);

    // Cute black head
    const headMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), headMat);
    head.position.set(0, 1.15, 0.85);
    sheep.add(head);

    // 4 Little black legs
    const sLegGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6);
    [[-0.35, -0.4], [0.35, -0.4], [-0.35, 0.4], [0.35, 0.4]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(sLegGeo, headMat);
      leg.position.set(lx, 0.3, lz);
      sheep.add(leg);
    });

    farmGroup.add(sheep);
  };

  createSheep(1, -22, Math.PI / 6);
  createSheep(5, -18, -Math.PI / 4);
  createSheep(2, 14, Math.PI / 2);

  // C. Friendly Cartoon Puppy Dog by the fence
  const dogGroup = new THREE.Group();
  dogGroup.position.set(-3.5, 0, -2);
  dogGroup.rotation.y = -Math.PI / 3;

  const dogMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 }); // Golden pup
  const dogBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.65, 1.2), dogMat);
  dogBody.position.set(0, 0.65, 0);
  const dogHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.55), dogMat);
  dogHead.position.set(0, 1.05, 0.5);
  const dogSnout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.3), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  dogSnout.position.set(0, 0.95, 0.8);
  const dogEarL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.35, 0.16), new THREE.MeshStandardMaterial({ color: 0x92400e }));
  dogEarL.position.set(-0.28, 1.0, 0.5);
  const dogEarR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.35, 0.16), new THREE.MeshStandardMaterial({ color: 0x92400e }));
  dogEarR.position.set(0.28, 1.0, 0.5);
  const dogTail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6), dogMat);
  dogTail.position.set(0, 0.95, -0.7);
  dogTail.rotation.x = Math.PI / 4;

  dogGroup.add(dogBody, dogHead, dogSnout, dogEarL, dogEarR, dogTail);
  farmGroup.add(dogGroup);

  sceneGroup.add(farmGroup);

  // 7. TOWN PARK & PLAYGROUND (Infield North: slide, swing set, benches, flowers)
  const parkGroup = new THREE.Group();
  parkGroup.position.set(26, roadY, 24);

  // A. Bright Yellow Playground Slide
  const slideGroup = new THREE.Group();
  slideGroup.position.set(-6, 0, -3);

  const ladderMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 }); // Bright blue
  const slideMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.1 }); // Sunny yellow
  const platMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }); // Red platform

  // Platform at top
  const platform = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 2.0), platMat);
  platform.position.set(0, 3.2, 0);
  // 4 Support posts
  const pPostGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.2, 8);
  [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(([px, pz]) => {
    const post = new THREE.Mesh(pPostGeo, ladderMat);
    post.position.set(px, 1.6, pz);
    slideGroup.add(post);
  });
  // Slide chute
  const chute = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 6.5), slideMat);
  chute.position.set(0, 1.6, 3.2);
  chute.rotation.x = Math.PI / 6;
  slideGroup.add(platform, chute);
  parkGroup.add(slideGroup);

  // B. Swing Set (Red A-frame + 2 blue swings)
  const swingGroup = new THREE.Group();
  swingGroup.position.set(5, 0, 0);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 8), frameMat);
  topBar.rotation.z = Math.PI / 2;
  topBar.position.set(0, 3.5, 0);
  swingGroup.add(topBar);

  // A-frame side legs
  const legBarGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.8, 8);
  [-3, 3].forEach((lx) => {
    const leg1 = new THREE.Mesh(legBarGeo, frameMat);
    leg1.position.set(lx, 1.75, -1.0);
    leg1.rotation.x = -Math.PI / 10;
    const leg2 = new THREE.Mesh(legBarGeo, frameMat);
    leg2.position.set(lx, 1.75, 1.0);
    leg2.rotation.x = Math.PI / 10;
    swingGroup.add(leg1, leg2);
  });

  // 2 Swings
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
  [-1.2, 1.2].forEach((sx, idx) => {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.4), seatMat);
    seat.position.set(sx, 0.7, 0);
    swingGroup.add(seat);
    swings.push({ mesh: seat, phase: idx * 1.5 });
  });

  parkGroup.add(swingGroup);

  // C. Colorful Flower Beds
  const flowerBedColors = [0xef4444, 0xf59e0b, 0xa855f7, 0xec4899, 0x38bdf8];
  for (let fb = 0; fb < 16; fb++) {
    const fx = (Math.random() - 0.5) * 18;
    const fz = (Math.random() - 0.5) * 14;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x16a34a })
    );
    stem.position.set(fx, 0.2, fz);
    const blossom = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 6),
      new THREE.MeshStandardMaterial({ color: flowerBedColors[fb % flowerBedColors.length] })
    );
    blossom.position.set(fx, 0.42, fz);
    parkGroup.add(stem, blossom);
  }

  sceneGroup.add(parkGroup);

  // 8. COLORFUL TOY TOWN BUILDINGS (West Roadside: Toy Shop, Bakery, Ice Cream, Cottages)
  const townGroup = new THREE.Group();
  townGroup.position.set(-24, roadY, -10);
  sceneGroup.add(townGroup);
  sceneGroup.updateMatrixWorld(true);

  const createToyBuilding = (
    name: string,
    wallColor: number,
    roofColor: number,
    bx: number,
    bz: number,
    roofType: 'pitched' | 'icecream' | 'flat' = 'pitched'
  ) => {
    const b = new THREE.Group();
    b.position.set(bx, 0, bz);

    const bW = 8; const bH = 6; const bD = 7;
    // Walls
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(bW, bH, bD),
      new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.5 })
    );
    walls.position.set(0, bH / 2, 0);
    b.add(walls);

    // Windows & Door
    const winMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.1 });
    const win1 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), winMat);
    win1.position.set(-2.2, 3.8, bD / 2 + 0.02);
    const win2 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), winMat);
    win2.position.set(2.2, 3.8, bD / 2 + 0.02);

    const doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.8), doorMat);
    door.position.set(0, 1.4, bD / 2 + 0.02);
    b.add(win1, win2, door);

    // Roof
    if (roofType === 'pitched') {
      const roofGeo = new THREE.ConeGeometry(bW * 0.75, 3.5, 4);
      roofGeo.rotateY(Math.PI / 4);
      const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.4 }));
      roof.position.set(0, bH + 1.75, 0);
      b.add(roof);

      // Red brick chimney
      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 2.0, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 })
      );
      chimney.position.set(2.2, bH + 2.0, -1.2);
      b.add(chimney);
    } else if (roofType === 'icecream') {
      // Ice Cream Parlor: Giant 3D Ice Cream Cone on roof!
      const roofFlat = new THREE.Mesh(
        new THREE.BoxGeometry(bW + 0.6, 0.8, bD + 0.6),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
      );
      roofFlat.position.set(0, bH + 0.4, 0);

      const coneMesh = new THREE.Mesh(
        new THREE.ConeGeometry(1.2, 2.8, 12),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 })
      );
      coneMesh.rotation.z = Math.PI;
      coneMesh.position.set(0, bH + 2.8, 0);

      const scoop1 = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xf472b6 }) // Strawberry
      );
      scoop1.position.set(0, bH + 4.2, 0);

      const scoop2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8 }) // Blue raspberry
      );
      scoop2.position.set(0, bH + 5.5, 0);

      b.add(roofFlat, coneMesh, scoop1, scoop2);
    }

    // Shop Sign Canvas
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 256; sCanvas.height = 64;
    const sctx = sCanvas.getContext('2d')!;
    sctx.fillStyle = '#ffffff'; sctx.fillRect(0, 0, 256, 64);
    sctx.fillStyle = '#0f172a'; sctx.font = 'bold 26px sans-serif'; sctx.textAlign = 'center';
    sctx.fillText(name, 128, 42);

    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 1.1),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(sCanvas) })
    );
    signMesh.position.set(0, bH - 0.4, bD / 2 + 0.05);
    b.add(signMesh);

    townGroup.add(b);
    sceneGroup.updateMatrixWorld(true);
    colliders.push({ box: new THREE.Box3().setFromObject(walls), type: 'building', bounce: 0.3 });
  };

  createToyBuilding('TOY SHOP 🧸', 0x38bdf8, 0xfacc15, 0, -25);
  createToyBuilding('BAKERY 🧁', 0xf472b6, 0xef4444, 0, -10);
  createToyBuilding('ICE CREAM 🍦', 0xfde047, 0xf59e0b, 0, 6, 'icecream');
  createToyBuilding('PIZZA 🍕', 0xef4444, 0x16a34a, 0, 22);

  // 9. FLUFFY CARTOON TREES & PINE TREES (Abundant throughout the landscape)
  const treeWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const oakFoliageMat1 = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 });
  const oakFoliageMat2 = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.85 });
  const pineFoliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
  const appleMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });

  const createOakTree = (tx: number, tz: number, scale: number = 1.0, withApples: boolean = false) => {
    const tree = new THREE.Group();
    tree.position.set(tx, roadY, tz);
    tree.scale.set(scale, scale, scale);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3.2, 8), treeWoodMat);
    trunk.position.y = 1.6;
    tree.add(trunk);

    const f1 = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), oakFoliageMat1);
    f1.position.set(0, 3.8, 0);
    const f2 = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), oakFoliageMat2);
    f2.position.set(0.8, 4.4, 0.4);
    const f3 = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), oakFoliageMat1);
    f3.position.set(-0.7, 4.2, -0.4);
    tree.add(f1, f2, f3);

    if (withApples) {
      for (let ap = 0; ap < 6; ap++) {
        const apple = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), appleMat);
        const ang = ap * 1.05;
        apple.position.set(Math.cos(ang) * 1.5, 3.6 + Math.sin(ang) * 0.6, Math.sin(ang) * 1.5);
        tree.add(apple);
      }
    }

    sceneGroup.add(tree);
  };

  const createPineTree = (tx: number, tz: number, scale: number = 1.0) => {
    const tree = new THREE.Group();
    tree.position.set(tx, roadY, tz);
    tree.scale.set(scale, scale, scale);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 2.0, 8), treeWoodMat);
    trunk.position.y = 1.0;
    tree.add(trunk);

    const c1 = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.2, 8), pineFoliageMat);
    c1.position.y = 2.4;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.9, 8), pineFoliageMat);
    c2.position.y = 3.6;
    const c3 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.6, 8), pineFoliageMat);
    c3.position.y = 4.8;
    tree.add(c1, c2, c3);

    sceneGroup.add(tree);
  };

  // Place clusters of trees along the roadside and in the park
  const treeLocations = [
    // Infield park trees
    { x: 18, z: 12, type: 'oak', apples: true },
    { x: 38, z: 18, type: 'pine' },
    { x: 22, z: 36, type: 'oak' },
    { x: 36, z: 32, type: 'oak', apples: true },
    { x: 12, z: -18, type: 'pine' },
    { x: 15, z: -32, type: 'oak' },
    { x: 38, z: -28, type: 'pine' },
    // Outer border trees
    { x: -16, z: -55, type: 'pine' },
    { x: -18, z: 35, type: 'oak' },
    { x: -12, z: 52, type: 'pine' },
    { x: 10, z: 62, type: 'oak', apples: true },
    { x: 35, z: 65, type: 'pine' },
    { x: 58, z: 55, type: 'oak' },
    { x: 74, z: 30, type: 'pine' },
    { x: 78, z: -45, type: 'oak' },
    { x: 62, z: -68, type: 'pine' },
    { x: 40, z: -75, type: 'oak', apples: true },
    { x: 14, z: -76, type: 'pine' },
    { x: -8, z: -72, type: 'oak' },
  ];

  treeLocations.forEach((tl, idx) => {
    const sc = 0.85 + (idx % 3) * 0.15;
    if (tl.type === 'oak') {
      createOakTree(tl.x, tl.z, sc, !!tl.apples);
    } else {
      createPineTree(tl.x, tl.z, sc);
    }
  });

  // 10. CHECKPOINT GATES (6 Colorful Neon Arches)
  const gateMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });

  for (let idx = 0; idx < 6; idx++) {
    const frac = idx / 6;
    const pt = trackCurve.getPointAt(frac);
    const tan = trackCurve.getTangentAt(frac);
    const rotY = Math.atan2(tan.x, tan.z);

    const gateGroup = new THREE.Group();
    gateGroup.position.set(pt.x, roadY + 2.5, pt.z);
    gateGroup.rotation.y = rotY;

    const archGeo = new THREE.TorusGeometry(trackWidth * 0.55, 0.38, 8, 24, Math.PI);
    const arch = new THREE.Mesh(archGeo, gateMat);
    arch.position.y = 1.0;
    gateGroup.add(arch);

    sceneGroup.add(gateGroup);

    checkpoints.push({
      id: idx + 1,
      position: [pt.x, roadY + 2.5, pt.z],
      rotationY: rotY,
      radius: 12.0,
      mesh: gateGroup,
    });
  }

  // 11. GOLD COINS & SECRET STARS
  const coinMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.9,
    roughness: 0.2,
    emissive: 0xd97706,
    emissiveIntensity: 0.6,
  });
  const coinGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.25, 16);
  coinGeo.rotateX(Math.PI / 2);

  for (let idx = 0; idx < 8; idx++) {
    const frac = idx / 8 + 0.05;
    const pt = trackCurve.getPointAt(frac % 1.0);
    const tan = trackCurve.getTangentAt(frac % 1.0);
    const binorm = new THREE.Vector3().crossVectors(tan, up).normalize();

    for (let c = -1; c <= 1; c += 2) {
      const cPos = pt.clone().addScaledVector(binorm, c * 3.5);
      cPos.y = roadY + 1.2;

      const coinMesh = new THREE.Mesh(coinGeo, coinMat);
      coinMesh.position.copy(cPos);
      sceneGroup.add(coinMesh);

      coins.push({
        id: `coin_${idx}_${c}`,
        type: 'coin',
        position: [cPos.x, cPos.y, cPos.z],
        collected: false,
        mesh: coinMesh,
      });
    }
  }

  // 4 Secret Stars (near Duck Pond, Farm, Park, Town)
  const starMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 2.2,
    metalness: 0.8,
  });
  const starGeo = new THREE.OctahedronGeometry(1.2, 0);

  const starLocations: [number, number, number][] = [
    [0, roadY + 2.5, 5],     // Town Main Straight
    [26, roadY + 3.0, 35],   // Town Playground
    [28, roadY + 2.5, -5],   // Duck Pond
    [56, roadY + 2.5, -15],  // Farm Pasture
  ];

  starLocations.forEach((loc, idx) => {
    const starMesh = new THREE.Mesh(starGeo, starMat);
    starMesh.position.set(loc[0], loc[1], loc[2]);
    sceneGroup.add(starMesh);

    stars.push({
      id: `star_${idx}`,
      type: 'star',
      position: loc,
      collected: false,
      mesh: starMesh,
    });
  });

  // 12. SLOWER AI RACERS (Tuned so kids 4-7 can easily pass them and win 1st place!)
  const circuitWaypoints: THREE.Vector3[] = [];
  const numWaypoints = 24;
  for (let w = 0; w < numWaypoints; w++) {
    circuitWaypoints.push(trackCurve.getPointAt(w / numWaypoints));
  }

  // Slower speeds (~11 - 12 m/s, player is 24 m/s)
  const aiRacers: AIRacer[] = [
    {
      id: 'ai_blaze',
      name: 'Blaze #9',
      modelType: 'drifter',
      color: '#dc2626',
      accentColor: '#facc15',
      speed: 11.5,
      baseMaxSpeed: 12.5,
      pos: new THREE.Vector3(-3.2, roadY + 0.8, -36),
      rotY: 0,
      waypointIndex: 1,
      lap: 1,
      lapProgress: 0.05,
    },
    {
      id: 'ai_sparky',
      name: 'Sparky #7',
      modelType: 'formula',
      color: '#eab308',
      accentColor: '#3b82f6',
      speed: 12.0,
      baseMaxSpeed: 13.0,
      pos: new THREE.Vector3(3.2, roadY + 0.8, -30),
      rotY: 0,
      waypointIndex: 1,
      lap: 1,
      lapProgress: 0.08,
    },
    {
      id: 'ai_viper',
      name: 'Viper #3',
      modelType: 'cyber',
      color: '#06b6d4',
      accentColor: '#a855f7',
      speed: 11.0,
      baseMaxSpeed: 12.0,
      pos: new THREE.Vector3(-3.0, roadY + 0.8, -22),
      rotY: 0,
      waypointIndex: 2,
      lap: 1,
      lapProgress: 0.12,
    },
    {
      id: 'ai_crusher',
      name: 'Crusher #88',
      modelType: 'monster',
      color: '#10b981',
      accentColor: '#1e293b',
      speed: 10.5,
      baseMaxSpeed: 11.5,
      pos: new THREE.Vector3(3.0, roadY + 0.8, -14),
      rotY: 0,
      waypointIndex: 2,
      lap: 1,
      lapProgress: 0.15,
    },
  ];

  aiRacers.forEach((ai) => {
    const rig = buildCar({
      modelType: ai.modelType,
      color: ai.color,
      accentColor: ai.accentColor,
      decal: 'checkered',
      speedLevel: 1,
      accelLevel: 1,
      nitroLevel: 1,
    });
    rig.root.position.copy(ai.pos);
    rig.root.rotation.y = ai.rotY;
    sceneGroup.add(rig.root);
    ai.rig = rig;
  });

  // 13. FLUFFY CLOUDS IN SKY
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.05,
    transparent: true,
    opacity: 0.9,
  });

  for (let i = 0; i < 10; i++) {
    const cloudGroup = new THREE.Group();
    const cx = (Math.random() - 0.5) * 300;
    const cy = 30 + Math.random() * 12;
    const cz = (Math.random() - 0.5) * 300;
    cloudGroup.position.set(cx, cy, cz);

    const puffCount = 4 + Math.floor(Math.random() * 3);
    for (let p = 0; p < puffCount; p++) {
      const r = 3.5 + Math.random() * 4.0;
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), cloudMat);
      puff.position.set(p * 3.5 - 5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2.0);
      cloudGroup.add(puff);
    }
    sceneGroup.add(cloudGroup);
    clouds.push(cloudGroup);
  }

  // Animation Loop: Ducks bobbing, Swings moving, Cows grazing, Coins spinning
  let elapsed = 0;
  const update = (delta: number) => {
    elapsed += delta;

    // Ducks bobbing gently on pond water
    ducks.forEach((duck) => {
      duck.mesh.position.y = duck.baseY + Math.sin(elapsed * 2.5 + duck.phase) * 0.08;
      duck.mesh.rotation.y += Math.sin(elapsed * 1.5 + duck.phase) * 0.01;
    });

    // Swings swaying gently in playground
    swings.forEach((swing) => {
      swing.mesh.position.z = Math.sin(elapsed * 2.2 + swing.phase) * 0.45;
      swing.mesh.rotation.x = Math.sin(elapsed * 2.2 + swing.phase) * 0.25;
    });

    // Cows gently bobbing heads while grazing
    cows.forEach((cow) => {
      cow.head.rotation.x = Math.sin(elapsed * 1.4 + cow.phase) * 0.12;
    });

    // Spin coins & stars
    coins.forEach((c) => {
      if (!c.collected && c.mesh) {
        c.mesh.rotation.z += delta * 3.5;
        c.mesh.position.y = c.position[1] + Math.sin(elapsed * 4 + c.position[0]) * 0.2;
      }
    });

    stars.forEach((s) => {
      if (!s.collected && s.mesh) {
        s.mesh.rotation.y += delta * 2.5;
        s.mesh.position.y = s.position[1] + Math.sin(elapsed * 3 + s.position[2]) * 0.3;
      }
    });

    // Slower AI Racers Navigation along circuit waypoints
    aiRacers.forEach((ai) => {
      if (!ai.rig) return;
      const targetWaypoint = circuitWaypoints[ai.waypointIndex % circuitWaypoints.length];
      const dir = new THREE.Vector3().subVectors(targetWaypoint, ai.pos);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 8.0) {
        ai.waypointIndex = (ai.waypointIndex + 1) % circuitWaypoints.length;
        if (ai.waypointIndex === 0) {
          ai.lap++;
        }
      }

      dir.normalize();
      const targetRotY = Math.atan2(dir.x, dir.z);
      ai.rotY = THREE.MathUtils.damp(ai.rotY, targetRotY, 4, delta);

      ai.pos.x += Math.sin(ai.rotY) * ai.speed * delta;
      ai.pos.z += Math.cos(ai.rotY) * ai.speed * delta;
      ai.pos.y = roadY + ai.rig.chassisOffset;

      ai.rig.root.position.copy(ai.pos);
      ai.rig.root.rotation.y = ai.rotY;

      ai.rig.wheels.forEach((w: any) => {
        w.rotation.x += (ai.speed * delta) / 0.4;
      });

      ai.lapProgress = ai.lap + ai.waypointIndex / circuitWaypoints.length;
    });

    // Cloud drift
    clouds.forEach((cloud) => {
      cloud.position.x += delta * 1.8;
      if (cloud.position.x > 200) cloud.position.x = -200;
    });
  };

  return {
    sceneGroup,
    colliders,
    railSegments,
    ramps,
    boostPads,
    coins,
    stars,
    checkpoints,
    bowlingPins,
    aiRacers,
    circuitWaypoints,
    clouds,
    update,
    getTerrainHeight,
  };
}
