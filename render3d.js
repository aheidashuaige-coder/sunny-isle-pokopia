(() => {
  "use strict";

  const api = {
    ready: false,
    init,
    resize,
    render,
    pick,
    emit,
    checkFrame,
  };

  let canvas;
  let renderer;
  let scene;
  let camera;
  let config;
  let elapsed = 0;
  let lastDynamicSignature = "";
  let playerView;
  let selectionRing;
  let selectionGlow;
  let cameraFocus;
  let sunLight;
  let hemiLight;
  let particles = [];
  let particleGroup;
  let cloudGroup;
  let dynamicGroup;
  let residentViews = {};
  let objectViews = new Map();
  let pickMeshes = [];
  let rippleMeshes = [];
  let flameLights = [];
  let firstCamera = true;
  let renderedFrames = 0;
  let pickGroup;

  const cameraOffset = new THREE.Vector3(8.4, 10.8, 12.2);
  const tempVector = new THREE.Vector3();
  const tempColor = new THREE.Color();

  const COLORS = {
    grass: [0x82bf6d, 0x8cca76, 0x77b763],
    grassSide: 0x7caf68,
    soil: 0xd8b77d,
    path: 0xe6c58b,
    pond: 0x65bdb8,
    pondDeep: 0x3c9699,
    water: 0x68bcb9,
    foam: 0xd8fff0,
    trunk: 0x886043,
    leaf: [0x4e9562, 0x63a96c, 0x3e8655],
    leafLight: 0x82bd72,
    berry: 0xdc6d76,
    stone: 0x8d9992,
    stoneLight: 0xb8c0b4,
    cream: 0xf8edce,
    coral: 0xdc806f,
    wood: 0xb98256,
    woodDark: 0x7d5b42,
    pink: 0xe894ad,
    pinkDark: 0xc86f8d,
    skin: 0xf0c5aa,
    skinLight: 0xf7d7bd,
    teal: 0x4e857d,
    tealDark: 0x356a67,
    yellow: 0xf3c943,
    yellowLight: 0xffdf69,
    eevee: 0xb57e50,
    eeveeDark: 0x8d603e,
    eeveeCream: 0xeed8b4,
    bulba: 0x69ab8d,
    bulbaDark: 0x3f806e,
    bulbaBulb: 0x71a97b,
    dark: 0x293d45,
    white: 0xfffdf4,
  };

  function init(options) {
    if (!window.THREE) return false;

    try {
      config = options;
      canvas = options.canvas;
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
      renderer.setSize(options.width, options.height, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.02;
      renderer.setClearColor(0x92d3c9, 0);

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x94d3c9, 0.018);
      camera = new THREE.PerspectiveCamera(
        options.width < 620 ? 42 : 36,
        options.width / options.height,
        0.1,
        70,
      );
      cameraFocus = new THREE.Vector3(-0.5, 0.72, 0.5);
      camera.position.copy(cameraFocus).add(cameraOffset);
      camera.lookAt(cameraFocus);

      createLights();
      createSkyDecor();
      createIsland();
      createStaticObjects();
      createResidents();
      playerView = createPlayer();
      scene.add(playerView.root);
      createSelection();
      createParticles();

      api.ready = true;
      canvas.classList.add("ready");
      resize(options);
      return true;
    } catch (error) {
      console.error("3D scene could not start", error);
      api.ready = false;
      return false;
    }
  }

  function createLights() {
    hemiLight = new THREE.HemisphereLight(0xfff5d6, 0x3d6d63, 1.7);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xffedbd, 2.1);
    sunLight.position.set(-7, 13, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(768, 768);
    sunLight.shadow.camera.left = -10;
    sunLight.shadow.camera.right = 10;
    sunLight.shadow.camera.top = 10;
    sunLight.shadow.camera.bottom = -10;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 34;
    sunLight.shadow.bias = -0.0008;
    sunLight.shadow.normalBias = 0.025;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const fill = new THREE.DirectionalLight(0x8bcfc9, 0.48);
    fill.position.set(7, 7, -6);
    scene.add(fill);
  }

  function createSkyDecor() {
    cloudGroup = new THREE.Group();
    cloudGroup.position.y = 5.6;
    scene.add(cloudGroup);

    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xfffff2,
      roughness: 1,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const cloudGeometry = new THREE.IcosahedronGeometry(1, 1);
    [
      [-10, 1.2, -7, 2.5],
      [8, 2.5, -9, 3.2],
      [-1, 3.2, -12, 2.1],
      [14, 0.5, -3, 2.6],
    ].forEach(([x, y, z, scale], index) => {
      const cloud = new THREE.Group();
      for (let i = 0; i < 4; i += 1) {
        const puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
        puff.position.set((i - 1.5) * scale * 0.62, (i % 2) * scale * 0.16, 0);
        puff.scale.set(scale * (0.75 + i * 0.08), scale * 0.42, scale * 0.5);
        cloud.add(puff);
      }
      cloud.position.set(x, y, z);
      cloud.userData.drift = 0.08 + index * 0.015;
      cloudGroup.add(cloud);
    });

    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(48, 44, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x6fc2bd,
        roughness: 0.32,
        metalness: 0.02,
        transparent: true,
        opacity: 0.88,
      }),
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.5;
    ocean.receiveShadow = true;
    scene.add(ocean);

    const oceanDeep = new THREE.Mesh(
      new THREE.CircleGeometry(21, 48),
      new THREE.MeshStandardMaterial({
        color: 0x3a9292,
        roughness: 0.55,
        transparent: true,
        opacity: 0.25,
      }),
    );
    oceanDeep.rotation.x = -Math.PI / 2;
    oceanDeep.position.y = -0.56;
    scene.add(oceanDeep);
  }

  function createIsland() {
    const islandGroup = new THREE.Group();
    scene.add(islandGroup);
    pickGroup = new THREE.Group();

    const baseShape = new THREE.Shape();
    const width = 11.9;
    const height = 9.9;
    const radius = 0.8;
    baseShape.moveTo(-width / 2 + radius, -height / 2);
    baseShape.lineTo(width / 2 - radius, -height / 2);
    baseShape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
    baseShape.lineTo(width / 2, height / 2 - radius);
    baseShape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
    baseShape.lineTo(-width / 2 + radius, height / 2);
    baseShape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
    baseShape.lineTo(-width / 2, -height / 2 + radius);
    baseShape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);

    const baseGeometry = new THREE.ExtrudeGeometry(baseShape, {
      depth: 1.35,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.12,
    });
    baseGeometry.rotateX(Math.PI / 2);
    const base = new THREE.Mesh(
      baseGeometry,
      new THREE.MeshStandardMaterial({
        color: 0xd9bb82,
        roughness: 0.94,
        flatShading: true,
      }),
    );
    base.position.y = -1.35;
    base.receiveShadow = true;
    base.castShadow = true;
    islandGroup.add(base);

    const underRockMaterial = new THREE.MeshStandardMaterial({
      color: 0x9e876a,
      roughness: 1,
      flatShading: true,
    });
    const underRock = new THREE.Mesh(new THREE.ConeGeometry(5.3, 2.7, 9), underRockMaterial);
    underRock.position.set(0, -2.1, 0);
    underRock.rotation.x = Math.PI;
    underRock.rotation.y = 0.45;
    underRock.scale.z = 0.78;
    islandGroup.add(underRock);

    const grassMaterials = COLORS.grass.map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.92,
          flatShading: true,
        }),
    );
    const pathMaterial = material(COLORS.path, 0.9);
    const pondBedMaterial = material(COLORS.pondDeep, 0.65);
    const pondMaterial = new THREE.MeshPhysicalMaterial({
      color: COLORS.pond,
      roughness: 0.16,
      metalness: 0.05,
      transparent: true,
      opacity: 0.78,
      transmission: 0.08,
      depthWrite: true,
    });

    const pickMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const grassTilePositions = [[], [], []];
    const pathTilePositions = [];
    const grassTuftMatrices = [[], []];

    for (let y = 0; y < config.worldHeight; y += 1) {
      for (let x = 0; x < config.worldWidth; x += 1) {
        const type = config.tileType(x, y);
        const position = gridPosition(x, y);
        const pick = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.7, 0.98), pickMaterial);
        pick.position.set(position.x, 0.15, position.z);
        pick.userData.tile = { x, y };
        pickGroup.add(pick);
        pickMeshes.push(pick);

        if (type === "sea") continue;

        if (type === "water") {
          const bed = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), pondBedMaterial);
          bed.rotation.x = -Math.PI / 2;
          bed.position.set(position.x, 0.052, position.z);
          bed.receiveShadow = true;
          islandGroup.add(bed);

          const water = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), pondMaterial);
          water.rotation.x = -Math.PI / 2;
          water.position.set(position.x, 0.082, position.z);
          water.receiveShadow = true;
          islandGroup.add(water);
          addRipple(islandGroup, position, (x + y) % 3);
          continue;
        }

        if (type === "path") {
          pathTilePositions.push(position);
        } else {
          grassTilePositions[Math.floor(hash(x, y) * grassMaterials.length)].push(position);
        }

        if (type === "grass") {
          if (hash(x, y, 3) > 0.48) {
            for (let bladeIndex = 0; bladeIndex < 3; bladeIndex += 1) {
              const bladePosition = new THREE.Vector3(
                position.x + (hash(x, y, bladeIndex) - 0.5) * 0.4,
                0.13,
                position.z + (hash(y, x, bladeIndex) - 0.5) * 0.4,
              );
              const bladeRotation = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 0, 1),
                (hash(x, y, bladeIndex + 9) - 0.5) * 0.45,
              );
              const bladeHeight = 0.9 + bladeIndex * 0.14;
              const bladeMatrix = new THREE.Matrix4().compose(
                bladePosition,
                bladeRotation,
                new THREE.Vector3(1, bladeHeight, 1),
              );
              grassTuftMatrices[bladeIndex % 2].push(bladeMatrix);
            }
          }
          if (hash(y, x, 5) > 0.86) addPebble(islandGroup, position, x, y);
        }
      }
    }
    grassTilePositions.forEach((positions, index) => {
      addInstancedTiles(islandGroup, positions, grassMaterials[index]);
    });
    addInstancedTiles(islandGroup, pathTilePositions, pathMaterial);
    addInstancedGrass(islandGroup, grassTuftMatrices);
    pickGroup.updateMatrixWorld(true);

    const foamMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.foam,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const foamGeometry = new THREE.IcosahedronGeometry(0.1, 1);
    const foam = new THREE.InstancedMesh(foamGeometry, foamMaterial, 36);
    for (let i = 0; i < 36; i += 1) {
      const t = i / 36;
      const angle = t * Math.PI * 2;
      const matrix = new THREE.Matrix4();
      matrix.compose(
        new THREE.Vector3(Math.cos(angle) * 6.25, -0.38, Math.sin(angle) * 5.1),
        new THREE.Quaternion(),
        new THREE.Vector3(1.8, 0.28, 0.7),
      );
      foam.setMatrixAt(i, matrix);
    }
    foam.instanceMatrix.needsUpdate = true;
    islandGroup.add(foam);
  }

  function addInstancedTiles(parent, positions, tileMaterial) {
    if (!positions.length) return;
    const geometry = new THREE.PlaneGeometry(0.94, 0.94);
    const tiles = new THREE.InstancedMesh(geometry, tileMaterial, positions.length);
    const rotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      -Math.PI / 2,
    );
    const scale = new THREE.Vector3(1, 1, 1);
    positions.forEach((position, index) => {
      const matrix = new THREE.Matrix4().compose(
        new THREE.Vector3(position.x, 0.061, position.z),
        rotation,
        scale,
      );
      tiles.setMatrixAt(index, matrix);
    });
    tiles.instanceMatrix.needsUpdate = true;
    tiles.receiveShadow = true;
    parent.add(tiles);
  }

  function addInstancedGrass(parent, matrixGroups) {
    const geometry = new THREE.ConeGeometry(0.025, 0.14, 3);
    const materials = [material(0x5c9658, 0.95), material(0x78ad62, 0.95)];
    matrixGroups.forEach((matrices, index) => {
      if (!matrices.length) return;
      const blades = new THREE.InstancedMesh(geometry, materials[index], matrices.length);
      matrices.forEach((matrix, matrixIndex) => blades.setMatrixAt(matrixIndex, matrix));
      blades.instanceMatrix.needsUpdate = true;
      parent.add(blades);
    });
  }

  function addRipple(parent, position, offset) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xdcfff5,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ripple = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.2, 24), material);
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.set(position.x, 0.095, position.z);
    ripple.userData.phase = offset * 1.7;
    rippleMeshes.push(ripple);
    parent.add(ripple);
  }

  function addPebble(parent, position, x, y) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.07, 0),
      new THREE.MeshStandardMaterial({ color: 0xa9afa4, roughness: 1, flatShading: true }),
    );
    rock.position.set(
      position.x + (hash(x, y, 6) - 0.5) * 0.52,
      0.11,
      position.z + (hash(y, x, 8) - 0.5) * 0.52,
    );
    rock.scale.y = 0.55;
    parent.add(rock);
  }

  function createStaticObjects() {
    const group = new THREE.Group();
    group.name = "static-objects";
    scene.add(group);

    config.worldObjects.forEach((object) => {
      let view;
      if (object.type === "tree") view = createTree(object);
      else if (object.type === "bush") view = createBush(object);
      else if (object.type === "rock") view = createRock(object);
      else if (object.type === "flower") view = createFlower(object);
      else if (object.type === "house") view = createHouse(object);
      else if (object.type === "campfire") view = createCampfire(object);
      else if (object.type === "sign") view = createSign(object);
      else if (object.type === "stump") view = createStump(object);
      if (!view) return;
      const position = gridPosition(object.x, object.y);
      view.root.position.set(position.x, 0.12, position.z);
      view.root.userData.objectId = object.id;
      optimizeShadows(view.root);
      group.add(view.root);
      objectViews.set(object.id, { object, ...view });
    });

    dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);
  }

  function createTree(object) {
    const root = new THREE.Group();
    const trunkMaterial = material(COLORS.trunk, 0.97);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.55, 8), trunkMaterial);
    trunk.position.y = 0.78;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    root.add(trunk);

    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.8, 7), trunkMaterial);
    branch.position.set(-0.22, 1.15, 0);
    branch.rotation.z = 0.75;
    branch.castShadow = true;
    root.add(branch);

    const canopy = new THREE.Group();
    const leafMaterials = COLORS.leaf.map((color) => material(color, 0.95, true));
    const leafGeometry = new THREE.DodecahedronGeometry(0.74, 0);
    [
      [-0.45, 1.8, 0.05, 1.0],
      [0.24, 2.05, 0.02, 1.12],
      [0.65, 1.7, -0.08, 0.82],
      [0.05, 1.65, 0.55, 0.78],
      [-0.2, 1.64, -0.46, 0.76],
    ].forEach(([x, y, z, scale], index) => {
      const leaf = new THREE.Mesh(leafGeometry, leafMaterials[index % leafMaterials.length]);
      leaf.position.set(x, y, z);
      leaf.scale.set(scale * 1.05, scale * 0.92, scale);
      leaf.rotation.set(index * 0.23, index * 0.5, index * 0.1);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      canopy.add(leaf);
    });
    root.add(canopy);

    const fruitMaterial = material(COLORS.berry, 0.55);
    const fruits = [];
    [
      [-0.57, 1.92, 0.47],
      [0.51, 2.12, 0.4],
      [0.18, 1.66, 0.77],
    ].forEach(([x, y, z]) => {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), fruitMaterial);
      fruit.position.set(x, y, z);
      fruit.castShadow = true;
      fruits.push(fruit);
      canopy.add(fruit);
    });
    addBlobShadow(root, 0.75, 0.33);
    return {
      root,
      update: (currentObject) => {
        const available = currentObject.cooldownUntil <= performance.now();
        fruits.forEach((fruit) => {
          fruit.visible = available;
        });
        canopy.rotation.z = Math.sin(elapsed * 1.6 + object.x) * 0.018;
        canopy.rotation.x = Math.cos(elapsed * 1.3 + object.y) * 0.012;
      },
    };
  }

  function createBush(object) {
    const root = new THREE.Group();
    const leafMaterial = material(0x4c9861, 0.95, true);
    const leafLight = material(0x72b56e, 0.9, true);
    const geometry = new THREE.DodecahedronGeometry(0.38, 0);
    [
      [-0.27, 0.34, 0.04, 1.0],
      [0.25, 0.38, 0.0, 1.12],
      [0.02, 0.57, 0.05, 0.86],
      [0.05, 0.32, -0.3, 0.82],
    ].forEach(([x, y, z, scale], index) => {
      const leaf = new THREE.Mesh(geometry, index === 2 ? leafLight : leafMaterial);
      leaf.position.set(x, y, z);
      leaf.scale.set(scale, scale * 0.85, scale);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      root.add(leaf);
    });
    const berryMaterial = material(COLORS.berry, 0.5);
    const berryGeometry = new THREE.SphereGeometry(0.07, 8, 6);
    const fruits = [];
    [
      [-0.34, 0.34, 0.31],
      [0.3, 0.44, 0.3],
      [0.08, 0.6, 0.35],
      [-0.02, 0.3, 0.43],
    ].forEach(([x, y, z]) => {
      const berry = new THREE.Mesh(berryGeometry, berryMaterial);
      berry.position.set(x, y, z);
      berry.castShadow = true;
      fruits.push(berry);
      root.add(berry);
    });
    addBlobShadow(root, 0.54, 0.26);
    return {
      root,
      update: (currentObject) => {
        const available = currentObject.cooldownUntil <= performance.now();
        fruits.forEach((fruit) => {
          fruit.visible = available;
        });
        root.rotation.y = Math.sin(elapsed * 1.1 + object.y) * 0.02;
      },
    };
  }

  function createRock(object) {
    const root = new THREE.Group();
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.stone,
      roughness: 0.96,
      flatShading: true,
    });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 0), rockMaterial);
    rock.position.y = 0.44;
    rock.scale.set(0.92, 1.18, 0.94);
    rock.rotation.set(0.16, object.x * 0.4, -0.12);
    rock.castShadow = true;
    rock.receiveShadow = true;
    root.add(rock);
    const chip = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.22, 0),
      material(COLORS.stoneLight, 0.95, true),
    );
    chip.position.set(0.4, 0.2, 0.15);
    chip.castShadow = true;
    root.add(chip);
    addBlobShadow(root, 0.58, 0.28);
    return { root, update: () => {} };
  }

  function createFlower(object) {
    const root = new THREE.Group();
    const stemMaterial = material(0x57945d, 0.9);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.55, 6), stemMaterial);
    stem.position.y = 0.32;
    stem.castShadow = true;
    root.add(stem);

    const leafMaterial = material(0x76ae61, 0.9);
    [-1, 1].forEach((direction) => {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), leafMaterial);
      leaf.scale.set(0.16, 0.045, 0.075);
      leaf.position.set(direction * 0.11, 0.31, 0);
      leaf.rotation.z = direction * 0.45;
      leaf.castShadow = true;
      root.add(leaf);
    });

    const blossom = new THREE.Group();
    blossom.position.y = 0.63;
    const petalColors = [0xed8ea8, 0xeab85e, 0xe88975, 0xcf8fc7];
    const petalMaterial = material(petalColors[(object.x + object.y) % petalColors.length], 0.7);
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.09, 9, 6), petalMaterial);
      petal.scale.set(1, 0.45, 0.75);
      petal.position.set(Math.cos(angle) * 0.11, 0, Math.sin(angle) * 0.11);
      petal.rotation.y = -angle;
      petal.castShadow = true;
      blossom.add(petal);
    }
    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 10, 8),
      material(0xf4cb5a, 0.55),
    );
    blossom.add(center);
    root.add(blossom);
    return {
      root,
      update: (currentObject) => {
        const waterScale = currentObject.waterLevel > 1 ? 1.1 : 0.94;
        blossom.scale.setScalar(waterScale + Math.sin(elapsed * 1.8 + object.x) * 0.015);
      },
    };
  }

  function createHouse() {
    const root = new THREE.Group();
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.45, 1.55),
      material(0xf4e4c2, 0.88),
    );
    wall.position.y = 0.82;
    wall.castShadow = true;
    wall.receiveShadow = true;
    root.add(wall);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.58, 0.72, 4),
      material(COLORS.coral, 0.82, true),
    );
    roof.position.y = 1.87;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    root.add(roof);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.9, 0.08),
      material(0x9e6750, 0.9),
    );
    door.position.set(0.34, 0.52, 0.82);
    root.add(door);
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 6),
      material(0xf1cc68, 0.45),
    );
    handle.position.set(0.47, 0.54, 0.88);
    root.add(handle);
    [-0.55].forEach((x) => {
      const windowMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.45, 0.07),
        new THREE.MeshStandardMaterial({
          color: 0x88c8ca,
          roughness: 0.12,
          metalness: 0.08,
          emissive: 0x315f63,
          emissiveIntensity: 0.18,
        }),
      );
      windowMesh.position.set(x, 0.98, 0.82);
      root.add(windowMesh);
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.46, 0.08),
        material(0xefdfc4, 0.85),
      );
      frame.position.set(x, 0.98, 0.87);
      root.add(frame);
    });
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.62, 0.28),
      material(0x9a6954, 0.95),
    );
    chimney.position.set(-0.55, 2.04, -0.25);
    chimney.castShadow = true;
    root.add(chimney);
    addBlobShadow(root, 1.2, 0.8);
    return { root, update: () => {} };
  }

  function createCampfire() {
    const root = new THREE.Group();
    const stoneMaterial = material(0x777e76, 0.98, true);
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), stoneMaterial);
      stone.position.set(Math.cos(angle) * 0.42, 0.13, Math.sin(angle) * 0.42);
      stone.scale.y = 0.72;
      stone.castShadow = true;
      root.add(stone);
    }

    const logMaterial = material(COLORS.woodDark, 0.97);
    [-0.25, 0.25].forEach((rotation) => {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.75, 8), logMaterial);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = rotation;
      log.position.y = 0.2;
      log.castShadow = true;
      root.add(log);
    });

    const flameOuter = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.58, 7),
      new THREE.MeshStandardMaterial({
        color: 0xf0a24c,
        emissive: 0xff8b31,
        emissiveIntensity: 2.2,
        roughness: 0.5,
      }),
    );
    flameOuter.position.y = 0.55;
    root.add(flameOuter);
    const flameInner = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.38, 7),
      new THREE.MeshStandardMaterial({
        color: 0xffe890,
        emissive: 0xffd05a,
        emissiveIntensity: 2.8,
      }),
    );
    flameInner.position.y = 0.5;
    root.add(flameInner);

    const light = new THREE.PointLight(0xffad55, 1.3, 3.2, 2);
    light.position.y = 0.7;
    root.add(light);
    flameLights.push(light);
    return {
      root,
      update: () => {
        const flicker = 0.9 + Math.sin(elapsed * 11) * 0.08 + Math.cos(elapsed * 7.5) * 0.05;
        flameOuter.scale.set(1, flicker, 1);
        flameInner.scale.set(0.9, flicker * 1.08, 0.9);
        light.intensity = 1.15 + flicker * 0.35;
      },
    };
  }

  function createSign() {
    const root = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.08, 0.82, 8),
      material(COLORS.woodDark, 0.95),
    );
    post.position.y = 0.46;
    post.castShadow = true;
    root.add(post);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.41, 0.09),
      material(COLORS.wood, 0.9),
    );
    board.position.y = 0.91;
    board.castShadow = true;
    root.add(board);
    for (let i = 0; i < 2; i += 1) {
      const mark = new THREE.Mesh(
        new THREE.BoxGeometry(0.48 - i * 0.14, 0.035, 0.012),
        material(0xffe9c1, 0.8),
      );
      mark.position.set(0, 0.96 - i * 0.13, 0.052);
      root.add(mark);
    }
    addBlobShadow(root, 0.46, 0.19);
    return { root, update: () => {} };
  }

  function createStump() {
    const root = new THREE.Group();
    const stump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.34, 0.34, 10),
      material(COLORS.wood, 0.95),
    );
    stump.position.y = 0.2;
    stump.castShadow = true;
    stump.receiveShadow = true;
    root.add(stump);
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(0.26, 12),
      material(0xd6a771, 0.88),
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.377;
    root.add(top);
    addBlobShadow(root, 0.38, 0.2);
    return { root, update: () => {} };
  }

  function createResidents() {
    const residentRoot = new THREE.Group();
    scene.add(residentRoot);
    residentViews.pikachu = createPikachu();
    residentViews.eevee = createEevee();
    residentViews.bulbasaur = createBulbasaur();
    Object.entries(residentViews).forEach(([id, view]) => {
      const resident = config.residents[id];
      const position = gridPosition(resident.x, resident.y);
      view.root.position.set(position.x, 0.12, position.z);
      view.root.visible = false;
      optimizeShadows(view.root);
      residentRoot.add(view.root);
    });
  }

  function createPlayer() {
    const root = new THREE.Group();
    const shadow = addBlobShadow(root, 0.42, 0.24);

    const leftLeg = createLimb(
      root,
      -0.14,
      0.52,
      0.01,
      0.13,
      0.58,
      material(0x536d78, 0.88),
    );
    const rightLeg = createLimb(
      root,
      0.14,
      0.52,
      0.01,
      0.13,
      0.58,
      material(0x536d78, 0.88),
    );
    const leftBoot = new THREE.Mesh(
      new THREE.BoxGeometry(0.23, 0.16, 0.34),
      material(0x3e4c57, 0.9),
    );
    leftBoot.position.set(-0.14, 0.12, 0.07);
    leftBoot.castShadow = true;
    root.add(leftBoot);
    const rightBoot = leftBoot.clone();
    rightBoot.position.x = 0.14;
    root.add(rightBoot);

    const backpack = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.56, 0.24),
      material(0x855f43, 0.9),
    );
    backpack.position.set(0, 1.03, -0.26);
    backpack.castShadow = true;
    root.add(backpack);
    const packStrap = new THREE.Mesh(
      new THREE.BoxGeometry(0.33, 0.06, 0.03),
      material(0x5e4433, 0.9),
    );
    packStrap.position.set(0, 1.04, -0.39);
    root.add(packStrap);

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.31, 0.42, 5, 12),
      material(COLORS.cream, 0.9),
    );
    torso.position.y = 1.05;
    torso.scale.z = 0.82;
    torso.castShadow = true;
    torso.receiveShadow = true;
    root.add(torso);

    const vestLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.52, 0.06),
      material(COLORS.teal, 0.9),
    );
    vestLeft.position.set(-0.23, 1.03, 0.3);
    vestLeft.rotation.z = 0.04;
    root.add(vestLeft);
    const vestRight = vestLeft.clone();
    vestRight.position.x = 0.23;
    vestRight.rotation.z = -0.04;
    root.add(vestRight);
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.08, 0.46),
      material(0xd5ad62, 0.85),
    );
    belt.position.y = 0.74;
    root.add(belt);

    const leftArm = createLimb(
      root,
      -0.39,
      1.16,
      0,
      0.16,
      0.52,
      material(COLORS.skin, 0.85),
      0.22,
    );
    const rightArm = createLimb(
      root,
      0.39,
      1.16,
      0,
      0.16,
      0.52,
      material(COLORS.skin, 0.85),
      -0.22,
    );

    const hairBack = ellipsoid(
      root,
      0,
      1.66,
      -0.035,
      0.46,
      0.43,
      0.42,
      material(COLORS.pinkDark, 0.92),
    );
    const head = ellipsoid(
      root,
      0,
      1.65,
      0.06,
      0.37,
      0.4,
      0.36,
      material(COLORS.skinLight, 0.86),
    );
    hairBack.position.y = 1.68;
    head.castShadow = true;

    const bangMaterial = material(COLORS.pink, 0.88);
    ellipsoid(root, -0.2, 1.91, 0.22, 0.22, 0.11, 0.16, bangMaterial);
    ellipsoid(root, 0.15, 1.94, 0.18, 0.25, 0.12, 0.17, bangMaterial);
    ellipsoid(root, -0.42, 1.63, 0.04, 0.1, 0.26, 0.13, bangMaterial);
    ellipsoid(root, 0.42, 1.64, 0.03, 0.09, 0.24, 0.12, bangMaterial);

    const eyeMaterial = material(COLORS.dark, 0.4);
    [-0.13, 0.13].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), eyeMaterial);
      eye.position.set(x, 1.68, 0.39);
      eye.scale.y = 1.25;
      root.add(eye);
    });
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.011, 6, 12, Math.PI),
      material(0x8e5d58, 0.7),
    );
    mouth.position.set(0, 1.54, 0.405);
    mouth.rotation.z = Math.PI;
    root.add(mouth);
    [-1, 1].forEach((direction) => {
      const blush = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 10, 6),
        new THREE.MeshBasicMaterial({ color: 0xdf8d91, transparent: true, opacity: 0.36 }),
      );
      blush.position.set(direction * 0.24, 1.58, 0.35);
      blush.scale.set(1.3, 0.45, 0.25);
      root.add(blush);
    });

    const hairClip = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 9, 6),
      material(0xf2c85c, 0.55),
    );
    hairClip.position.set(-0.33, 1.86, 0.29);
    hairClip.scale.set(1.15, 0.55, 0.65);
    root.add(hairClip);

    root.scale.setScalar(0.82);
    optimizeShadows(root);
    return {
      root,
      shadow,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      head,
      baseY: 0.12,
    };
  }

  function createLimb(parent, x, y, z, radius, length, limbMaterial, angle = 0) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    pivot.rotation.z = angle;
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), limbMaterial);
    limb.position.y = -length * 0.48;
    limb.castShadow = true;
    pivot.add(limb);
    parent.add(pivot);
    return pivot;
  }

  function createPikachu() {
    const root = new THREE.Group();
    addBlobShadow(root, 0.42, 0.22);
    const yellow = material(COLORS.yellow, 0.8);
    const yellowLight = material(COLORS.yellowLight, 0.75);
    const dark = material(COLORS.dark, 0.45);
    const red = material(0xde6666, 0.65);

    ellipsoid(root, 0, 0.52, 0, 0.34, 0.47, 0.31, yellow);
    const head = ellipsoid(root, 0, 1.02, 0.04, 0.41, 0.39, 0.37, yellowLight);
    head.castShadow = true;

    [-1, 1].forEach((direction) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.64, 8), yellow);
      ear.position.set(direction * 0.24, 1.47, 0.02);
      ear.rotation.z = direction * -0.25;
      ear.castShadow = true;
      root.add(ear);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 8), dark);
      tip.position.set(direction * 0.33, 1.72, 0.02);
      tip.rotation.z = direction * -0.25;
      root.add(tip);
    });

    [-0.16, 0.16].forEach((x) => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.083, 10, 8), red);
      cheek.position.set(x, 0.97, 0.37);
      cheek.scale.y = 0.82;
      root.add(cheek);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), dark);
      eye.position.set(x * 0.62, 1.1, 0.38);
      eye.scale.y = 1.25;
      root.add(eye);
    });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), dark);
    nose.position.set(0, 1.02, 0.415);
    root.add(nose);

    const tail = new THREE.Group();
    tail.position.set(0.27, 0.55, -0.25);
    tail.rotation.z = -0.25;
    const part1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.09), yellow);
    part1.position.set(0.05, 0.15, 0);
    part1.rotation.z = -0.45;
    part1.castShadow = true;
    tail.add(part1);
    const part2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.09), yellow);
    part2.position.set(0.22, 0.48, 0);
    part2.rotation.z = -0.18;
    part2.castShadow = true;
    tail.add(part2);
    const part3 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.09), yellowLight);
    part3.position.set(0.35, 0.68, 0);
    part3.rotation.z = 0.15;
    part3.castShadow = true;
    tail.add(part3);
    root.add(tail);

    [-0.2, 0.2].forEach((x) => {
      const foot = ellipsoid(root, x, 0.16, 0.1, 0.16, 0.1, 0.21, yellow);
      foot.rotation.y = x * 0.3;
    });
    root.scale.setScalar(0.84);
    optimizeShadows(root);
    return { root, tail, idleOffset: 0.2 };
  }

  function createEevee() {
    const root = new THREE.Group();
    addBlobShadow(root, 0.43, 0.22);
    const brown = material(COLORS.eevee, 0.92);
    const brownDark = material(COLORS.eeveeDark, 0.96);
    const cream = material(COLORS.eeveeCream, 0.9);
    const dark = material(COLORS.dark, 0.4);

    ellipsoid(root, 0, 0.56, -0.02, 0.34, 0.48, 0.3, brown);
    const head = ellipsoid(root, 0, 1.06, 0.08, 0.39, 0.38, 0.35, brown);
    head.castShadow = true;

    [-1, 1].forEach((direction) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 9), brown);
      ear.position.set(direction * 0.25, 1.5, 0.02);
      ear.rotation.z = direction * -0.18;
      ear.castShadow = true;
      root.add(ear);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 9), brownDark);
      tip.position.set(direction * 0.32, 1.78, 0.02);
      tip.rotation.z = direction * -0.18;
      root.add(tip);
    });

    ellipsoid(root, -0.29, 0.99, 0.24, 0.18, 0.18, 0.1, cream);
    ellipsoid(root, 0.29, 0.99, 0.24, 0.18, 0.18, 0.1, cream);
    ellipsoid(root, 0, 0.76, 0.22, 0.27, 0.18, 0.12, cream);
    [-0.15, 0.15].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), dark);
      eye.position.set(x, 1.1, 0.39);
      eye.scale.y = 1.22;
      root.add(eye);
    });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), dark);
    nose.position.set(0, 1.01, 0.425);
    root.add(nose);

    const tail = new THREE.Group();
    tail.position.set(0.26, 0.6, -0.28);
    ellipsoid(tail, 0.02, 0, 0, 0.26, 0.19, 0.17, brown);
    ellipsoid(tail, 0.2, 0.13, 0, 0.25, 0.18, 0.16, brown);
    const tip = ellipsoid(tail, 0.43, 0.28, 0, 0.22, 0.2, 0.17, cream);
    tip.castShadow = true;
    root.add(tail);

    root.scale.setScalar(0.84);
    optimizeShadows(root);
    return { root, tail, idleOffset: 1.3 };
  }

  function createBulbasaur() {
    const root = new THREE.Group();
    addBlobShadow(root, 0.5, 0.28);
    const green = material(COLORS.bulba, 0.9);
    const greenDark = material(COLORS.bulbaDark, 0.95);
    const bulbMaterial = material(COLORS.bulbaBulb, 0.92, true);
    const dark = material(COLORS.dark, 0.42);
    const cream = material(0xf0f4ea, 0.8);

    ellipsoid(root, 0, 0.48, -0.12, 0.5, 0.4, 0.54, green);
    const head = ellipsoid(root, 0, 0.62, 0.46, 0.38, 0.34, 0.33, green);
    head.castShadow = true;

    const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 1), bulbMaterial);
    bulb.position.set(0, 0.96, -0.24);
    bulb.scale.set(0.92, 0.88, 0.9);
    bulb.castShadow = true;
    root.add(bulb);
    const bulbLeaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 7), greenDark);
    bulbLeaf.position.set(0.03, 1.24, -0.2);
    bulbLeaf.rotation.z = 0.2;
    root.add(bulbLeaf);

    [-0.14, 0.14].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), cream);
      eye.position.set(x, 0.7, 0.74);
      root.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), dark);
      pupil.position.set(x, 0.7, 0.79);
      root.add(pupil);
    });
    [-0.28, 0.28].forEach((x) => {
      ellipsoid(root, x, 0.53, 0.64, 0.075, 0.06, 0.03, material(0xde7775, 0.65));
    });
    [-0.3, 0.3].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.32, 8), greenDark);
      leg.position.set(x, 0.21, 0.15);
      leg.castShadow = true;
      root.add(leg);
    });
    const spotMaterial = material(0x3d806c, 0.9);
    [
      [-0.33, 0.55, -0.35],
      [0.3, 0.45, -0.39],
      [-0.26, 0.4, 0.16],
    ].forEach(([x, y, z]) => {
      const spot = new THREE.Mesh(new THREE.CircleGeometry(0.08, 10), spotMaterial);
      spot.position.set(x, y, z);
      spot.rotation.x = -Math.PI / 2;
      spot.scale.set(1.4, 0.7, 1);
      root.add(spot);
    });

    root.scale.setScalar(0.84);
    optimizeShadows(root);
    return { root, bulb, idleOffset: 2.5 };
  }

  function createSelection() {
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff6c7,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    selectionRing = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.52, 32), ringMaterial);
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.y = 0.14;
    selectionRing.visible = false;
    scene.add(selectionRing);

    selectionGlow = new THREE.Mesh(
      new THREE.CircleGeometry(0.48, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffefaa,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    selectionGlow.rotation.x = -Math.PI / 2;
    selectionGlow.position.y = 0.13;
    selectionGlow.visible = false;
    scene.add(selectionGlow);
  }

  function createParticles() {
    particleGroup = new THREE.Group();
    scene.add(particleGroup);
    particles = [];
  }

  function syncDynamic(state) {
    const signature = [
      state.placed.map((item) => `${item.id}:${item.type}:${item.x}:${item.y}`).join("|"),
      state.plants.map((item) => `${item.id}:${item.stage}:${item.x}:${item.y}`).join("|"),
    ].join("//");
    if (signature === lastDynamicSignature) return;
    lastDynamicSignature = signature;

    clearGroup(dynamicGroup);
    state.placed.forEach((object) => {
      const view = createPlaced(object);
      if (!view) return;
      const position = gridPosition(object.x, object.y);
      view.root.position.set(position.x, 0.12, position.z);
      dynamicGroup.add(view.root);
    });
    state.plants.forEach((plant) => {
      const root = createPlant(plant);
      const position = gridPosition(plant.x, plant.y);
      root.position.set(position.x, 0.12, position.z);
      optimizeShadows(root);
      dynamicGroup.add(root);
    });
  }

  function createPlaced(object) {
    const root = new THREE.Group();
    if (object.type === "bench") {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(1.42, 0.14, 0.5),
        material(COLORS.wood, 0.9),
      );
      seat.position.y = 0.42;
      seat.castShadow = true;
      root.add(seat);
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(1.42, 0.15, 0.42),
        material(0xd19a68, 0.9),
      );
      back.position.set(0, 0.7, -0.22);
      back.rotation.x = -0.14;
      back.castShadow = true;
      root.add(back);
      [-0.56, 0.56].forEach((x) => {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.4, 0.36),
          material(COLORS.woodDark, 0.95),
        );
        leg.position.set(x, 0.2, 0);
        leg.castShadow = true;
        root.add(leg);
      });
    } else if (object.type === "flowerbed") {
      const bed = new THREE.Mesh(
        new THREE.BoxGeometry(1.38, 0.22, 0.82),
        material(COLORS.woodDark, 0.92),
      );
      bed.position.y = 0.16;
      bed.castShadow = true;
      root.add(bed);
      const soil = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.08, 0.68),
        material(0x5f4a39, 0.98),
      );
      soil.position.y = 0.29;
      root.add(soil);
      for (let i = 0; i < 6; i += 1) {
        const flower = new THREE.Group();
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.018, 0.28, 5),
          material(0x57975b, 0.8),
        );
        stem.position.y = 0.14;
        flower.add(stem);
        const petalColor = [0xed8ea8, 0xf0bf5f, 0xde8975][i % 3];
        const petals = new THREE.Mesh(
          new THREE.SphereGeometry(0.045, 8, 6),
          material(petalColor, 0.65),
        );
        petals.position.y = 0.32;
        petals.scale.set(1.2, 0.55, 1.2);
        flower.add(petals);
        flower.position.set(-0.5 + (i % 3) * 0.5, 0.28, -0.16 + Math.floor(i / 3) * 0.32);
        root.add(flower);
      }
    } else if (object.type === "lantern") {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 1.55, 8),
        material(0x6d5d4e, 0.92),
      );
      post.position.y = 0.8;
      post.castShadow = true;
      root.add(post);
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.4, 0.34),
        material(0x594f43, 0.9),
      );
      frame.position.y = 1.55;
      frame.castShadow = true;
      root.add(frame);
      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.27, 0.25),
        new THREE.MeshStandardMaterial({
          color: 0xffe59b,
          emissive: 0xffba52,
          emissiveIntensity: 2.1,
        }),
      );
      glow.position.y = 1.54;
      root.add(glow);
      const light = new THREE.PointLight(0xffbb60, 0.9, 3.1, 2);
      light.position.y = 1.55;
      root.add(light);
      flameLights.push(light);
    } else if (object.type === "swing") {
      const wood = material(COLORS.wood, 0.92);
      [-0.65, 0.65].forEach((x) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.55, 8), wood);
        leg.position.set(x, 0.78, 0);
        leg.rotation.z = x > 0 ? -0.25 : 0.25;
        leg.castShadow = true;
        root.add(leg);
      });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.12), wood);
      bar.position.y = 1.5;
      bar.castShadow = true;
      root.add(bar);
      const ropeMaterial = material(0xe8dcc4, 0.9);
      [-0.26, 0.26].forEach((x) => {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 5), ropeMaterial);
        rope.position.set(x, 1.12, 0);
        root.add(rope);
      });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 0.25), material(0x8eb379, 0.9));
      seat.position.y = 0.75;
      seat.castShadow = true;
      root.add(seat);
    } else {
      return null;
    }
    addBlobShadow(root, object.type === "swing" ? 0.8 : 0.58, 0.28);
    optimizeShadows(root);
    return { root };
  }

  function createPlant(plant) {
    const root = new THREE.Group();
    if ((plant.stage || 0) === 0) {
      [-1, 1].forEach((direction) => {
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(1, 10, 7),
          material(0x72ae62, 0.9),
        );
        leaf.scale.set(0.14, 0.04, 0.07);
        leaf.position.set(direction * 0.07, 0.1, 0);
        leaf.rotation.z = direction * 0.45;
        root.add(leaf);
      });
    } else {
      const height = plant.stage >= 2 ? 0.88 : 0.55;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.045, height, 6),
        material(0x578b54, 0.9),
      );
      stem.position.y = height / 2 + 0.06;
      stem.castShadow = true;
      root.add(stem);
      [-1, 1].forEach((direction) => {
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(1, 10, 7),
          material(0x72ae62, 0.9),
        );
        leaf.scale.set(0.2, 0.055, 0.1);
        leaf.position.set(direction * 0.12, height * 0.64, 0);
        leaf.rotation.z = direction * 0.5;
        leaf.castShadow = true;
        root.add(leaf);
      });
      if (plant.stage >= 2) {
        [-0.1, 0.1].forEach((x, index) => {
          const berry = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 8, 6),
            material(COLORS.berry, 0.55),
          );
          berry.position.set(x, height * 0.8 + index * 0.11, 0.08);
          root.add(berry);
        });
      }
    }
    return root;
  }

  function render(frame) {
    if (!api.ready) return;
    elapsed = frame.now * 0.001;
    syncDynamic(frame.state);

    const state = frame.state;
    const player = frame.player;
    const playerPosition = gridPosition(player.renderX, player.renderY);
    playerView.root.position.set(playerPosition.x, playerView.baseY, playerPosition.z);
    playerView.root.rotation.y = 0.33 + (player.facing < 0 ? 0.38 : 0);
    const walkAmount = player.moving ? Math.sin(player.stepPhase * Math.PI * 4) : 0;
    const walkBob = player.moving ? Math.abs(walkAmount) * 0.055 : Math.sin(elapsed * 2.2) * 0.014;
    playerView.root.position.y += walkBob;
    playerView.leftLeg.rotation.x = walkAmount * 0.52;
    playerView.rightLeg.rotation.x = -walkAmount * 0.52;
    playerView.leftArm.rotation.x = -walkAmount * 0.4;
    playerView.rightArm.rotation.x = walkAmount * 0.4;
    playerView.head.rotation.y = Math.sin(elapsed * 0.65) * 0.035;

    Object.entries(residentViews).forEach(([id, view], index) => {
      const resident = config.residents[id];
      const visible = state.residents[id];
      view.root.visible = visible;
      if (!visible) return;
      const position = gridPosition(resident.x, resident.y);
      view.root.position.set(position.x, 0.12, position.z);
      view.root.position.y += Math.sin(elapsed * 2 + view.idleOffset) * 0.018;
      view.root.rotation.y = 0.2 + Math.sin(elapsed * 0.45 + index) * 0.08;
      if (view.tail) view.tail.rotation.z = Math.sin(elapsed * 1.8 + view.idleOffset) * 0.1;
      if (view.bulb) view.bulb.rotation.y = Math.sin(elapsed * 0.9) * 0.045;
    });

    objectViews.forEach((view) => {
      if (view.update) view.update(view.object, state);
    });

    updateSelection(player.pending);
    updateCamera(player);
    updateEnvironment(state);
    updateParticles();
    renderer.render(scene, camera);
    renderedFrames += 1;
    canvas.dataset.rendererReady = "true";
    canvas.dataset.frames = String(renderedFrames);
    canvas.dataset.triangles = String(renderer.info.render.triangles);
    if (renderedFrames === 12 || renderedFrames % 240 === 0) {
      canvas.dataset.frameCheck = JSON.stringify(checkFrame());
    }
  }

  function updateSelection(pending) {
    if (!pending || (!pending.object && !pending.tile)) {
      selectionRing.visible = false;
      selectionGlow.visible = false;
      return;
    }
    const target = pending.object || pending.tile;
    const position = gridPosition(target.x, target.y);
    const pulse = 1 + Math.sin(elapsed * 4.5) * 0.08;
    selectionRing.visible = true;
    selectionGlow.visible = true;
    selectionRing.position.set(position.x, 0.145, position.z);
    selectionGlow.position.set(position.x, 0.14, position.z);
    selectionRing.scale.setScalar(pulse);
    selectionRing.rotation.z = elapsed * 0.22;
    selectionGlow.material.opacity = 0.1 + Math.sin(elapsed * 4) * 0.035;
  }

  function updateCamera(player) {
    const target = tempVector.set(player.renderX - 5.5, 0.68, player.renderY - 4.5);
    if (firstCamera) {
      cameraFocus.copy(target);
      firstCamera = false;
    } else {
      cameraFocus.lerp(target, 0.075);
    }
    camera.position.copy(cameraFocus).add(cameraOffset);
    camera.lookAt(cameraFocus);
  }

  function updateEnvironment(state) {
    const minutes = state.clock || 560;
    const daylight = 0.58 + Math.max(0, Math.sin(((minutes - 360) / 720) * Math.PI)) * 0.42;
    sunLight.intensity = 1.7 + daylight * 1.15;
    hemiLight.intensity = 1.55 + daylight * 0.75;
    tempColor.setHSL(0.48, 0.36, 0.55 + daylight * 0.08);
    scene.fog.color.copy(tempColor);

    cloudGroup.children.forEach((cloud) => {
      cloud.position.x += cloud.userData.drift * 0.012;
      if (cloud.position.x > 17) cloud.position.x = -17;
    });

    rippleMeshes.forEach((ripple, index) => {
      const pulse = ((elapsed * 0.22 + ripple.userData.phase) % 1);
      const scale = 0.65 + pulse * 2.2;
      ripple.scale.setScalar(scale);
      ripple.material.opacity = (1 - pulse) * 0.28;
      ripple.position.y = 0.094 + Math.sin(elapsed * 1.3 + index) * 0.004;
    });
  }

  function addParticle(position, kind, index, count) {
    const isWater = kind === "water";
    const isHeart = kind === "heart";
    const color = isWater ? 0xb9f3ef : isHeart ? 0xe88493 : 0xffe693;
    const mesh = new THREE.Mesh(
      isHeart
        ? new THREE.OctahedronGeometry(0.065, 0)
        : new THREE.IcosahedronGeometry(isWater ? 0.045 : 0.035, 0),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: isWater ? 0.15 : 0.5,
        roughness: 0.45,
        transparent: true,
        opacity: 0.95,
      }),
    );
    const angle = (index / count) * Math.PI * 2 + Math.random() * 0.6;
    mesh.position.copy(position);
    mesh.position.y += isWater ? 0.9 : 0.65;
    mesh.userData.velocity = new THREE.Vector3(
      Math.cos(angle) * (isWater ? 0.35 : 0.65),
      isWater ? 0.4 + Math.random() * 0.35 : 0.8 + Math.random() * 0.5,
      Math.sin(angle) * (isWater ? 0.35 : 0.65),
    );
    mesh.userData.life = 0.7 + Math.random() * 0.5;
    mesh.userData.maxLife = mesh.userData.life;
    particleGroup.add(mesh);
    particles.push(mesh);
  }

  function emit(position, kind, count) {
    if (!api.ready) return;
    const world = gridPosition(position.x - 0.5, position.y - 0.5);
    for (let index = 0; index < count; index += 1) {
      addParticle(world, kind, index, count);
    }
  }

  function updateParticles() {
    const delta = 1 / 60;
    particles.forEach((particle) => {
      particle.userData.life -= delta;
      particle.userData.velocity.y -= 1.9 * delta;
      particle.position.addScaledVector(particle.userData.velocity, delta);
      const alpha = Math.max(0, particle.userData.life / particle.userData.maxLife);
      particle.material.opacity = alpha;
      particle.rotation.y += delta * 2;
    });
    particles = particles.filter((particle) => {
      if (particle.userData.life > 0) return true;
      particleGroup.remove(particle);
      particle.geometry.dispose();
      particle.material.dispose();
      return false;
    });
  }

  function pick(clientX, clientY) {
    if (!api.ready) return null;
    const pointer = new THREE.Vector2(
      (clientX / canvas.clientWidth) * 2 - 1,
      -(clientY / canvas.clientHeight) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObjects(pickMeshes, false);
    return intersections[0]?.object.userData.tile || null;
  }

  function resize(options) {
    if (!api.ready) return;
    const width = options.width;
    const height = options.height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 620 ? 1.55 : 1.8));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 620 ? 42 : 36;
    camera.updateProjectionMatrix();
  }

  function checkFrame() {
    if (!api.ready) return { ready: false };
    renderer.render(scene, camera);
    const gl = renderer.getContext();
    const sampleWidth = Math.min(96, gl.drawingBufferWidth);
    const sampleHeight = Math.min(96, gl.drawingBufferHeight);
    const x = Math.floor((gl.drawingBufferWidth - sampleWidth) / 2);
    const y = Math.floor((gl.drawingBufferHeight - sampleHeight) / 2);
    const pixels = new Uint8Array(sampleWidth * sampleHeight * 4);
    gl.readPixels(x, y, sampleWidth, sampleHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const colors = new Set();
    let visiblePixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] > 0) visiblePixels += 1;
      colors.add(`${pixels[index] >> 4},${pixels[index + 1] >> 4},${pixels[index + 2] >> 4}`);
    }
    return {
      ready: true,
      visiblePixels,
      samplePixels: sampleWidth * sampleHeight,
      distinctColors: colors.size,
      triangles: renderer.info.render.triangles,
      drawCalls: renderer.info.render.calls,
      meshCount: scene.children.length + pickMeshes.length,
    };
  }

  function gridPosition(x, y) {
    return new THREE.Vector3(x - 5.5, 0, y - 4.5);
  }

  function material(color, roughness = 0.9, flatShading = false) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      flatShading,
      metalness: 0,
    });
  }

  function ellipsoid(parent, x, y, z, sx, sy, sz, meshMaterial) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), meshMaterial);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addBlobShadow(parent, rx, rz) {
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 28),
      new THREE.MeshBasicMaterial({
        color: 0x284a40,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(rx, rz, 1);
    shadow.position.y = -0.095;
    parent.add(shadow);
    return shadow;
  }

  function optimizeShadows(root) {
    root.updateMatrixWorld(true);
    root.traverse((node) => {
      if (!node.isMesh || !node.geometry) return;
      if (node.material?.transparent) {
        node.castShadow = false;
        node.receiveShadow = false;
        return;
      }
      if (!node.geometry.boundingSphere) node.geometry.computeBoundingSphere();
      const radius = node.geometry.boundingSphere?.radius || 0;
      const scale = node.getWorldScale(new THREE.Vector3());
      const visualRadius = radius * Math.max(scale.x, scale.y, scale.z);
      node.castShadow = visualRadius > 0.16;
      node.receiveShadow = visualRadius > 0.12;
    });
  }

  function clearGroup(group) {
    while (group.children.length) {
      const child = group.children.pop();
      child.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          if (Array.isArray(node.material)) node.material.forEach((item) => item.dispose());
          else node.material.dispose();
        }
      });
    }
  }

  function hash(x, y, salt = 0) {
    const value = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
    return value - Math.floor(value);
  }

  window.SunnyIsle3D = api;
})();
