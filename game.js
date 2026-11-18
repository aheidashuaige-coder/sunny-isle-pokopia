(() => {
  "use strict";

  const canvas = document.querySelector("#world3d");
  const fallbackCanvas = document.querySelector("#world");
  const ctx = fallbackCanvas.getContext("2d", { alpha: true });
  const WORLD_W = 12;
  const WORLD_H = 10;
  const SAVE_KEY = "sunny-isle-pokopia-v1";
  const baseTileW = 94;
  const baseTileH = 47;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const queryParams = new URLSearchParams(window.location.search);
  const quickPlay = queryParams.get("play") === "1";
  const pixelMode = queryParams.get("pixel") === "1";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, amount) => a + (b - a) * amount;
  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
  const hash = (x, y, salt = 0) => {
    const value = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
    return value - Math.floor(value);
  };

  const dom = {
    dayNumber: $("#dayNumber"),
    clockText: $("#clockText"),
    weatherText: $("#weatherText"),
    weatherIcon: $("#weatherIcon"),
    wood: $("#woodCount"),
    stone: $("#stoneCount"),
    berry: $("#berryCount"),
    bloom: $("#bloomCount"),
    coin: $("#coinCount"),
    level: $("#levelValue"),
    energyBar: $("#energyBar"),
    waterBadge: $("#waterCanBadge"),
    seedBadge: $("#seedBadge"),
    questTitle: $("#questTitle"),
    questProgress: $("#questProgress"),
    questBar: $("#questBar"),
    questAction: $("#questAction"),
    residentDot: $("#residentDot"),
    journal: $("#journal"),
    journalButton: $("#journalButton"),
    journalClose: $("#journalClose"),
    residentList: $("#residentList"),
    ratingValue: $("#ratingValue"),
    ratingTitle: $("#ratingTitle"),
    ratingHint: $("#ratingHint"),
    buildTray: $("#buildTray"),
    buildClose: $("#buildClose"),
    buildItems: $("#buildItems"),
    toastStack: $("#toastStack"),
    hintBubble: $("#hintBubble"),
    hintText: $("#hintText"),
    welcome: $("#welcome"),
    startGame: $("#startGame"),
    soundButton: $("#soundButton"),
  };

  const BUILD_ITEMS = {
    bench: {
      label: "木长椅",
      cost: { wood: 6, stone: 1 },
      stat: "benches",
      description: "适合看云和打盹",
    },
    flowerbed: {
      label: "花圃",
      cost: { wood: 4, berry: 2 },
      stat: "flowerbeds",
      description: "会吸引爱花的朋友",
    },
    lantern: {
      label: "暖灯",
      cost: { wood: 2, stone: 3 },
      stat: "lanterns",
      description: "夜里也暖融融",
    },
    swing: {
      label: "小秋千",
      cost: { wood: 9, stone: 2, bloom: 2 },
      stat: "swings",
      description: "岛上最受欢迎的位置",
    },
  };

  const QUESTS = [
    {
      id: "breakfast",
      title: "早安，莓果早餐",
      target: 3,
      stat: "berryHarvests",
      reward: 18,
      resident: "pikachu",
      actionHint: "去莓果丛采集 3 次",
    },
    {
      id: "watering",
      title: "让花苗喝饱水",
      target: 2,
      stat: "waterings",
      reward: 22,
      resident: "eevee",
      actionHint: "用水壶给 2 株花苗浇水",
    },
    {
      id: "resting",
      title: "给朋友搭个歇脚处",
      target: 1,
      stat: "benches",
      reward: 30,
      resident: "bulbasaur",
      actionHint: "建造一张木长椅",
    },
  ];

  const RESIDENTS = {
    pikachu: {
      name: "皮卡丘",
      species: "电气宝可梦",
      line: "莓果的香味，隔着海湾都闻得到。",
      x: 9,
      y: 4,
      condition: "完成「莓果早餐」",
    },
    eevee: {
      name: "伊布",
      species: "进化宝可梦",
      line: "泥土湿湿的，闻起来很安心。",
      x: 3,
      y: 6,
      condition: "完成「花苗浇水」",
    },
    bulbasaur: {
      name: "妙蛙种子",
      species: "种子宝可梦",
      line: "这张长椅，背上的种子也很喜欢。",
      x: 8,
      y: 7,
      condition: "完成「歇脚处」",
    },
  };

  const STATIC_OBJECTS = [
    { id: "tree-a", type: "tree", x: 2, y: 2, solid: true, harvest: "wood", amount: 2, cooldown: 13000 },
    { id: "tree-b", type: "tree", x: 4, y: 1, solid: true, harvest: "wood", amount: 2, cooldown: 13000 },
    { id: "tree-c", type: "tree", x: 10, y: 2, solid: true, harvest: "wood", amount: 3, cooldown: 16000 },
    { id: "tree-d", type: "tree", x: 2, y: 7, solid: true, harvest: "wood", amount: 2, cooldown: 13000 },
    { id: "tree-e", type: "tree", x: 6, y: 8, solid: true, harvest: "wood", amount: 2, cooldown: 13000 },
    { id: "tree-f", type: "tree", x: 9, y: 1, solid: true, harvest: "wood", amount: 2, cooldown: 13000 },
    { id: "bush-a", type: "bush", x: 4, y: 3, solid: true, harvest: "berry", amount: 2, cooldown: 17000 },
    { id: "bush-b", type: "bush", x: 7, y: 1, solid: true, harvest: "berry", amount: 2, cooldown: 17000 },
    { id: "bush-c", type: "bush", x: 3, y: 5, solid: true, harvest: "berry", amount: 2, cooldown: 17000 },
    { id: "bush-d", type: "bush", x: 8, y: 8, solid: true, harvest: "berry", amount: 2, cooldown: 17000 },
    { id: "rock-a", type: "rock", x: 7, y: 3, solid: true, harvest: "stone", amount: 2, cooldown: 19000 },
    { id: "rock-b", type: "rock", x: 10, y: 6, solid: true, harvest: "stone", amount: 2, cooldown: 19000 },
    { id: "rock-c", type: "rock", x: 3, y: 8, solid: true, harvest: "stone", amount: 1, cooldown: 16000 },
    { id: "flower-a", type: "flower", x: 5, y: 2, solid: false, waterable: true },
    { id: "flower-b", type: "flower", x: 8, y: 5, solid: false, waterable: true },
    { id: "flower-c", type: "flower", x: 6, y: 7, solid: false, waterable: true },
    { id: "flower-d", type: "flower", x: 10, y: 4, solid: false, waterable: true },
    { id: "house", type: "house", x: 2, y: 8, solid: true },
    { id: "campfire", type: "campfire", x: 7, y: 5, solid: true, interactive: "rest" },
    { id: "sign", type: "sign", x: 5, y: 6, solid: true },
    { id: "stump", type: "stump", x: 9, y: 7, solid: false, interactive: "rest" },
  ];

  const PATH_TILES = new Set([
    "5,5",
    "5,4",
    "5,3",
    "6,5",
    "6,6",
    "6,7",
    "4,5",
    "4,6",
    "3,6",
    "3,7",
    "7,6",
    "7,7",
    "2,8",
    "1,8",
    "8,6",
    "9,6",
    "10,5",
    "5,7",
    "4,7",
  ]);

  const SEA_TILES = new Set();
  for (let x = 0; x < WORLD_W; x += 1) {
    SEA_TILES.add(`${x},0`);
    SEA_TILES.add(`${x},${WORLD_H - 1}`);
  }
  for (let y = 0; y < WORLD_H; y += 1) {
    SEA_TILES.add(`0,${y}`);
    SEA_TILES.add(`${WORLD_W - 1},${y}`);
  }

  const POND_TILES = new Set(["8,2", "9,2", "8,3", "9,3"]);
  const occupiedTiles = new Map();
  const worldObjects = STATIC_OBJECTS.map((object) => ({
    ...object,
    cooldownUntil: 0,
    waterLevel: object.waterable ? 1 : 0,
  }));
  STATIC_OBJECTS.forEach((object) => occupiedTiles.set(`${object.x},${object.y}`, object));

  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let viewScale = 1;
  let lastFrame = performance.now();
  let uiClock = 0;
  let particles = [];
  let cameraShake = 0;
  let audioContext = null;
  let audioEnabled = true;
  let toastCounter = 0;
  let interactionPulse = 0;

  const player = {
    x: 5,
    y: 5,
    renderX: 5,
    renderY: 5,
    facing: 1,
    path: [],
    moving: false,
    stepPhase: 0,
    pending: null,
  };

  const defaultState = {
    version: 1,
    started: false,
    day: 1,
    clock: 9 * 60 + 20,
    energy: 92,
    coins: 12,
    level: 3,
    tool: "gather",
    buildSelected: null,
    inventory: {
      wood: 4,
      stone: 2,
      berry: 3,
      bloom: 2,
      water: 3,
      seeds: 4,
    },
    stats: {
      berryHarvests: 0,
      waterings: 0,
      plantings: 0,
      grownPlants: 0,
      benches: 0,
      flowerbeds: 0,
      lanterns: 0,
      swings: 0,
      restCount: 0,
    },
    completedQuests: [],
    residents: {
      pikachu: false,
      eevee: false,
      bulbasaur: false,
    },
    placed: [],
    plants: [],
  };

  let state = loadState();

  function cloneDefaultState() {
    return JSON.parse(JSON.stringify(defaultState));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return cloneDefaultState();
      const parsed = JSON.parse(raw);
      return {
        ...cloneDefaultState(),
        ...parsed,
        inventory: { ...defaultState.inventory, ...parsed.inventory },
        stats: { ...defaultState.stats, ...parsed.stats },
        residents: { ...defaultState.residents, ...parsed.residents },
        tool: "gather",
        buildSelected: null,
        placed: Array.isArray(parsed.placed) ? parsed.placed : [],
        plants: Array.isArray(parsed.plants) ? parsed.plants : [],
        completedQuests: Array.isArray(parsed.completedQuests) ? parsed.completedQuests : [],
      };
    } catch {
      return cloneDefaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      // Safari private mode may reject storage; the current session still works.
    }
  }

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    fallbackCanvas.width = Math.round(width * dpr);
    fallbackCanvas.height = Math.round(height * dpr);
    fallbackCanvas.style.width = `${width}px`;
    fallbackCanvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    viewScale = clamp(width / 940, 0.74, 1.12);
    if (height < 540 && width > height) viewScale *= 0.88;
    if (window.SunnyIsle3D?.ready) {
      window.SunnyIsle3D.resize({ width, height, dpr });
    }
  }

  function getWeather() {
    const index = (state.day - 1) % 4;
    const weather = [
      { label: "晴朗微风", icon: "☀", sea: ["#65b4b4", "#8ccbc1"] },
      { label: "薄云慢行", icon: "☁", sea: ["#73b8b7", "#9ed3c6"] },
      { label: "暖风晴天", icon: "◐", sea: ["#5caaaa", "#91cec0"] },
      { label: "莓果香气", icon: "✦", sea: ["#6bb5ae", "#a3d8c6"] },
    ];
    return weather[index];
  }

  function tileType(x, y) {
    const key = `${x},${y}`;
    if (SEA_TILES.has(key)) return "sea";
    if (POND_TILES.has(key)) return "water";
    if (PATH_TILES.has(key)) return "path";
    return "grass";
  }

  function isInside(x, y) {
    return x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H;
  }

  function isPassable(x, y) {
    if (!isInside(x, y)) return false;
    if (tileType(x, y) !== "grass" && tileType(x, y) !== "path") return false;
    const key = `${x},${y}`;
    const staticObject = occupiedTiles.get(key);
    if (staticObject && staticObject.solid) return false;
    if (state.placed.some((item) => item.x === x && item.y === y)) return false;
    return true;
  }

  function objectAt(x, y) {
    const staticObject = worldObjects.find((object) => object.x === x && object.y === y);
    if (staticObject) return staticObject;
    const placed = state.placed.find((object) => object.x === x && object.y === y);
    if (placed) return { ...placed, type: placed.type, isPlaced: true };
    const plant = state.plants.find((object) => object.x === x && object.y === y);
    if (plant) return { ...plant, isPlant: true };
    return null;
  }

  function residentAt(x, y) {
    return Object.entries(RESIDENTS).find(
      ([id, resident]) => state.residents[id] && resident.x === x && resident.y === y,
    );
  }

  function worldToScreen(x, y, z = 0) {
    const wobbleX = cameraShake ? Math.sin(performance.now() * 0.09) * cameraShake : 0;
    const wobbleY = cameraShake ? Math.cos(performance.now() * 0.12) * cameraShake * 0.6 : 0;
    const tileW = baseTileW * viewScale;
    const tileH = baseTileH * viewScale;
    return {
      x:
        width * 0.5 +
        wobbleX +
        (x - player.renderX - (y - player.renderY)) * (tileW / 2),
      y:
        height * (height < 540 && width > height ? 0.46 : 0.48) +
        wobbleY +
        (x - player.renderX + (y - player.renderY)) * (tileH / 2) -
        z * viewScale,
    };
  }

  function tilePolygon(x, y) {
    const tileW = baseTileW * viewScale;
    const tileH = baseTileH * viewScale;
    const center = worldToScreen(x + 0.5, y + 0.5);
    return [
      { x: center.x, y: center.y - tileH / 2 },
      { x: center.x + tileW / 2, y: center.y },
      { x: center.x, y: center.y + tileH / 2 },
      { x: center.x - tileW / 2, y: center.y },
    ];
  }

  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 0.00001) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function screenToTile(screenX, screenY) {
    if (window.SunnyIsle3D?.ready) {
      return window.SunnyIsle3D.pick(screenX, screenY);
    }
    for (let y = WORLD_H - 1; y >= 0; y -= 1) {
      for (let x = WORLD_W - 1; x >= 0; x -= 1) {
        if (pointInPolygon({ x: screenX, y: screenY }, tilePolygon(x, y))) {
          return { x, y };
        }
      }
    }
    return null;
  }

  function drawPolygon(points, fill, stroke = null, lineWidth = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  function roundedRect(x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSky(now) {
    const weather = getWeather();
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#91d0c6");
    sky.addColorStop(0.46, "#bfe2cb");
    sky.addColorStop(1, weather.sea[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const sun = ctx.createRadialGradient(width * 0.73, height * 0.2, 0, width * 0.73, height * 0.2, width * 0.28);
    sun.addColorStop(0, "rgba(255, 248, 201, 0.55)");
    sun.addColorStop(1, "rgba(255, 248, 201, 0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#fff8d9";
    drawCloud(width * 0.15 + Math.sin(now * 0.00003) * 16, height * 0.18, 0.95);
    drawCloud(width * 0.84 + Math.cos(now * 0.000025) * 18, height * 0.33, 0.72);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(49, 91, 91, 0.22)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i += 1) {
      const bx = width * (0.22 + i * 0.27) + Math.sin(now * 0.00016 + i) * 8;
      const by = height * 0.28 + i * 17;
      ctx.beginPath();
      ctx.arc(bx - 4, by, 4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.arc(bx + 4, by, 4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCloud(x, y, scale) {
    ctx.beginPath();
    ctx.ellipse(x - 35 * scale, y + 4 * scale, 44 * scale, 17 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x, y - 8 * scale, 48 * scale, 27 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 47 * scale, y + 4 * scale, 39 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDistantIslands(now) {
    ctx.save();
    ctx.translate(width * 0.5, height * 0.34);
    ctx.scale(viewScale, viewScale);
    ctx.globalAlpha = 0.19;
    ctx.fillStyle = "#286d69";
    ctx.beginPath();
    ctx.ellipse(-width * 0.38, 25, 82, 25, -0.08, 0, Math.PI * 2);
    ctx.ellipse(width * 0.42, -8, 98, 30, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#f8e9b9";
    ctx.beginPath();
    ctx.ellipse(-width * 0.38, 30, 73, 12, -0.08, 0, Math.PI * 2);
    ctx.ellipse(width * 0.42, -3, 87, 14, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = "#ffffff";
    const waveY = height * 0.66;
    for (let x = 10; x < width; x += 72) {
      const offset = Math.sin(now * 0.001 + x) * 3;
      ctx.fillRect(x, waveY + offset, 25, 1.5);
      ctx.fillRect(x + 31, waveY + offset + 7, 13, 1);
    }
    ctx.restore();
  }

  function drawMap(now) {
    const weather = getWeather();
    ctx.save();
    ctx.translate(0, 4 * viewScale);
    for (let sum = 0; sum <= WORLD_W + WORLD_H - 2; sum += 1) {
      for (let x = Math.max(0, sum - WORLD_H + 1); x <= Math.min(WORLD_W - 1, sum); x += 1) {
        const y = sum - x;
        const points = tilePolygon(x, y);
        drawPolygon(points, "rgba(30, 78, 74, 0.13)", "rgba(31, 79, 74, 0.06)", 1);
      }
    }
    ctx.restore();

    for (let sum = 0; sum <= WORLD_W + WORLD_H - 2; sum += 1) {
      for (let x = Math.max(0, sum - WORLD_H + 1); x <= Math.min(WORLD_W - 1, sum); x += 1) {
        const y = sum - x;
        drawTile(x, y, now, weather);
      }
    }
  }

  function drawTile(x, y, now, weather) {
    const type = tileType(x, y);
    const points = tilePolygon(x, y);
    const center = worldToScreen(x + 0.5, y + 0.5);
    const variation = hash(x, y);

    if (type === "sea") {
      const alpha = 0.18 + variation * 0.06;
      drawPolygon(points, `rgba(61, 151, 156, ${alpha})`, "rgba(255,255,255,0.05)", 0.7);
      const ripple = Math.sin(now * 0.0014 + x * 0.8 + y * 1.3) * 2;
      ctx.strokeStyle = "rgba(240, 255, 247, 0.34)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(center.x - 17 * viewScale, center.y + ripple);
      ctx.quadraticCurveTo(
        center.x,
        center.y - 4 * viewScale + ripple,
        center.x + 18 * viewScale,
        center.y + ripple,
      );
      ctx.stroke();
      return;
    }

    if (type === "water") {
      drawPolygon(points, "#72c3bd", "rgba(42, 121, 117, 0.17)", 0.8);
      const edge = ctx.createLinearGradient(center.x, center.y - 15, center.x, center.y + 18);
      edge.addColorStop(0, "rgba(215, 255, 239, 0.4)");
      edge.addColorStop(1, "rgba(42, 141, 141, 0.08)");
      drawPolygon(points, edge);
      ctx.save();
      ctx.strokeStyle = "rgba(247, 255, 235, 0.55)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      const shift = Math.sin(now * 0.0017 + x + y) * 2;
      ctx.ellipse(center.x + shift, center.y, 18 * viewScale, 5 * viewScale, 0, 0.15, Math.PI * 1.3);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (type === "path") {
      const pathColors = ["#e7c88d", "#e4c186", "#edd09a"];
      drawPolygon(points, pathColors[Math.floor(variation * pathColors.length)], "rgba(122, 94, 56, 0.1)", 0.7);
      ctx.save();
      ctx.fillStyle = "rgba(124, 91, 54, 0.2)";
      for (let i = 0; i < 2; i += 1) {
        const rx = center.x + (hash(x, y, i) - 0.5) * 30 * viewScale;
        const ry = center.y + (hash(y, x, i + 4) - 0.5) * 12 * viewScale;
        ctx.beginPath();
        ctx.ellipse(rx, ry, 1.4 * viewScale, 0.8 * viewScale, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    const grassColors = ["#a9d38e", "#a4ce8b", "#b0d894"];
    drawPolygon(points, grassColors[Math.floor(variation * grassColors.length)], "rgba(60, 112, 68, 0.09)", 0.75);
    ctx.save();
    ctx.strokeStyle = "rgba(51, 117, 66, 0.22)";
    ctx.lineWidth = 0.8;
    const tufts = variation > 0.36 ? 2 : 1;
    for (let i = 0; i < tufts; i += 1) {
      const px = center.x + (hash(x, y, i + 7) - 0.5) * 42 * viewScale;
      const py = center.y + (hash(y, x, i + 2) - 0.5) * 16 * viewScale;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(
        px - 2 * viewScale,
        py - 5 * viewScale,
        px - 4 * viewScale,
        py - 6 * viewScale,
      );
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(
        px + 1 * viewScale,
        py - 6 * viewScale,
        px + 1 * viewScale,
        py - 8 * viewScale,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawShadow(x, y, rx, ry, alpha = 0.16) {
    ctx.save();
    ctx.fillStyle = `rgba(42, 80, 64, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y + 5 * viewScale, rx * viewScale, ry * viewScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTree(point, object, now) {
    const s = viewScale;
    const breathe = reduceMotion ? 0 : Math.sin(now * 0.0015 + object.x * 0.8 + object.y) * 1.2;
    drawShadow(point.x, point.y, 25, 10, 0.18);
    ctx.save();
    ctx.translate(point.x + breathe, point.y);
    ctx.rotate((reduceMotion ? 0 : Math.sin(now * 0.001 + object.x) * 0.013));
    ctx.fillStyle = "#8b6241";
    roundedRect(-4 * s, -39 * s, 8 * s, 39 * s, 3 * s);
    ctx.fill();
    ctx.fillStyle = "#755039";
    ctx.beginPath();
    ctx.moveTo(-4 * s, -13 * s);
    ctx.lineTo(-12 * s, -27 * s);
    ctx.lineTo(-7 * s, -29 * s);
    ctx.lineTo(0, -17 * s);
    ctx.closePath();
    ctx.fill();

    const clusters = [
      [-18, -51, 21, 18, "#4f9562"],
      [5, -59, 24, 21, "#62a76c"],
      [22, -46, 18, 16, "#4d8f5e"],
      [-3, -40, 24, 17, "#6bac70"],
    ];
    clusters.forEach(([cx, cy, rx, ry, color], index) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(cx * s, cy * s, rx * s, ry * s, index * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "rgba(232, 246, 177, 0.35)";
    ctx.beginPath();
    ctx.ellipse(-10 * s, -66 * s, 15 * s, 8 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();

    if (object.harvest === "wood") {
      ctx.fillStyle = "#e99a81";
      [
        [-17, -47],
        [12, -58],
        [27, -43],
      ].forEach(([fx, fy]) => {
        ctx.beginPath();
        ctx.arc(fx * s, fy * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();

    if (object.cooldownUntil > performance.now()) {
      drawCooldownSprig(point, object, now);
    }
  }

  function drawBush(point, object, now) {
    const s = viewScale;
    const cooldown = object.cooldownUntil > performance.now();
    drawShadow(point.x, point.y, 20, 8, 0.13);
    ctx.save();
    ctx.translate(point.x, point.y + (reduceMotion ? 0 : Math.sin(now * 0.002 + object.x) * 1));
    ctx.fillStyle = "#4d9862";
    ctx.beginPath();
    ctx.ellipse(-11 * s, -12 * s, 17 * s, 15 * s, -0.2, 0, Math.PI * 2);
    ctx.ellipse(10 * s, -13 * s, 18 * s, 16 * s, 0.2, 0, Math.PI * 2);
    ctx.ellipse(0, -23 * s, 18 * s, 17 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6eae6d";
    ctx.beginPath();
    ctx.ellipse(-4 * s, -29 * s, 10 * s, 6 * s, -0.25, 0, Math.PI * 2);
    ctx.fill();
    if (!cooldown) {
      ctx.fillStyle = "#de6974";
      [
        [-14, -16],
        [7, -20],
        [16, -9],
        [-3, -7],
      ].forEach(([bx, by]) => {
        ctx.beginPath();
        ctx.arc(bx * s, by * s, 3.1 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 214, 196, 0.6)";
        ctx.beginPath();
        ctx.arc((bx - 1) * s, (by - 1) * s, 0.8 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#de6974";
      });
    }
    ctx.restore();
    if (cooldown) drawCooldownSprig(point, object, now);
  }

  function drawCooldownSprig(point, object, now) {
    const remaining = clamp((object.cooldownUntil - performance.now()) / 13000, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = "#f8f4dc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y - 38 * viewScale, 11 * viewScale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - remaining));
    ctx.stroke();
    ctx.restore();
  }

  function drawRock(point, object) {
    const s = viewScale;
    drawShadow(point.x, point.y, 18, 7, 0.16);
    ctx.save();
    ctx.translate(point.x, point.y);
    const gradient = ctx.createLinearGradient(0, -30 * s, 0, 5 * s);
    gradient.addColorStop(0, "#aeb5ad");
    gradient.addColorStop(1, "#788a83");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-19 * s, -3 * s);
    ctx.lineTo(-13 * s, -22 * s);
    ctx.lineTo(3 * s, -30 * s);
    ctx.lineTo(18 * s, -17 * s);
    ctx.lineTo(20 * s, -1 * s);
    ctx.lineTo(5 * s, 5 * s);
    ctx.lineTo(-10 * s, 5 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(74, 96, 88, 0.34)";
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(-8 * s, -17 * s);
    ctx.lineTo(5 * s, -11 * s);
    ctx.lineTo(12 * s, -19 * s);
    ctx.stroke();
    ctx.fillStyle = "rgba(235, 241, 220, 0.38)";
    ctx.beginPath();
    ctx.ellipse(2 * s, -25 * s, 8 * s, 4 * s, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFlower(point, object, now) {
    const s = viewScale;
    const watered = (object.waterLevel || 0) > 1;
    const bloom = watered ? 1.1 : 0.88;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.strokeStyle = "#5f9d61";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(0, 1 * s);
    ctx.quadraticCurveTo(-1 * s, -15 * s, 2 * s, -25 * s * bloom);
    ctx.stroke();
    ctx.fillStyle = "#7fb36f";
    ctx.beginPath();
    ctx.ellipse(-4 * s, -12 * s, 7 * s, 3.2 * s, -0.5, 0, Math.PI * 2);
    ctx.fill();
    const colors = ["#ee8fa8", "#f0b55c", "#e88a78", "#d492c6"];
    const color = colors[object.id ? object.id.charCodeAt(object.id.length - 1) % colors.length : 0];
    for (let i = 0; i < 5; i += 1) {
      const angle = i * (Math.PI * 2 / 5) + Math.sin(now * 0.001 + i) * 0.04;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(
        Math.cos(angle) * 5.2 * s,
        -26 * s * bloom + Math.sin(angle) * 5.2 * s,
        4.2 * s,
        3.1 * s,
        angle,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = "#f5cf62";
    ctx.beginPath();
    ctx.arc(0, -26 * s * bloom, 3.1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHouse(point) {
    const s = viewScale;
    drawShadow(point.x, point.y, 45, 18, 0.19);
    ctx.save();
    ctx.translate(point.x, point.y);

    ctx.fillStyle = "#f4e5c5";
    roundedRect(-34 * s, -53 * s, 68 * s, 53 * s, 4 * s);
    ctx.fill();
    ctx.fillStyle = "#d9b98b";
    roundedRect(-25 * s, -42 * s, 20 * s, 18 * s, 3 * s);
    ctx.fill();
    ctx.fillStyle = "#82bdc0";
    roundedRect(8 * s, -42 * s, 16 * s, 18 * s, 3 * s);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(16 * s, -41 * s);
    ctx.lineTo(16 * s, -25 * s);
    ctx.stroke();

    ctx.fillStyle = "#a7654e";
    roundedRect(-3 * s, -29 * s, 17 * s, 29 * s, 5 * s);
    ctx.fill();
    ctx.fillStyle = "#f4d77f";
    ctx.beginPath();
    ctx.arc(9 * s, -13 * s, 1.3 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d77e6d";
    ctx.beginPath();
    ctx.moveTo(-43 * s, -53 * s);
    ctx.lineTo(0, -83 * s);
    ctx.lineTo(43 * s, -53 * s);
    ctx.lineTo(34 * s, -45 * s);
    ctx.lineTo(0, -68 * s);
    ctx.lineTo(-34 * s, -45 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ec9a80";
    ctx.beginPath();
    ctx.moveTo(-43 * s, -53 * s);
    ctx.lineTo(0, -83 * s);
    ctx.lineTo(4 * s, -76 * s);
    ctx.lineTo(-31 * s, -51 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#876d57";
    roundedRect(17 * s, -82 * s, 7 * s, 17 * s, 2 * s);
    ctx.fill();
    ctx.restore();
  }

  function drawCampfire(point, now) {
    const s = viewScale;
    drawShadow(point.x, point.y, 18, 7, 0.16);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.strokeStyle = "#7e614f";
    ctx.lineWidth = 4 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-14 * s, -5 * s);
    ctx.lineTo(12 * s, 4 * s);
    ctx.moveTo(-12 * s, 4 * s);
    ctx.lineTo(14 * s, -5 * s);
    ctx.stroke();
    const flicker = reduceMotion ? 0 : Math.sin(now * 0.012) * 2.4;
    ctx.fillStyle = "#f5a24d";
    ctx.beginPath();
    ctx.moveTo(-9 * s, -6 * s);
    ctx.quadraticCurveTo(-12 * s, -25 * s - flicker, 0, -34 * s - flicker);
    ctx.quadraticCurveTo(13 * s, -22 * s + flicker, 8 * s, -5 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffe28a";
    ctx.beginPath();
    ctx.moveTo(-4 * s, -7 * s);
    ctx.quadraticCurveTo(-3 * s, -19 * s + flicker, 2 * s, -25 * s + flicker);
    ctx.quadraticCurveTo(8 * s, -17 * s - flicker, 5 * s, -7 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawSign(point) {
    const s = viewScale;
    drawShadow(point.x, point.y, 13, 5, 0.12);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.fillStyle = "#8a674a";
    roundedRect(-3 * s, -31 * s, 6 * s, 31 * s, 2 * s);
    ctx.fill();
    ctx.fillStyle = "#c68a5d";
    roundedRect(-22 * s, -41 * s, 44 * s, 19 * s, 5 * s);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 241, 205, 0.68)";
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(-12 * s, -33 * s);
    ctx.lineTo(12 * s, -33 * s);
    ctx.moveTo(-7 * s, -28 * s);
    ctx.lineTo(8 * s, -28 * s);
    ctx.stroke();
    ctx.restore();
  }

  function drawStump(point) {
    const s = viewScale;
    drawShadow(point.x, point.y, 15, 6, 0.14);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.fillStyle = "#9f714c";
    roundedRect(-14 * s, -12 * s, 28 * s, 13 * s, 5 * s);
    ctx.fill();
    ctx.fillStyle = "#d3a26e";
    ctx.beginPath();
    ctx.ellipse(0, -12 * s, 14 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(119, 82, 50, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, -12 * s, 7 * s, 2.4 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlant(point, plant, now) {
    const s = viewScale;
    const stage = plant.stage || 0;
    drawShadow(point.x, point.y, stage > 1 ? 17 : 10, 5, 0.1);
    ctx.save();
    ctx.translate(point.x, point.y);
    if (stage === 0) {
      ctx.fillStyle = "#74a962";
      ctx.beginPath();
      ctx.ellipse(-4 * s, -8 * s, 5 * s, 2.5 * s, -0.55, 0, Math.PI * 2);
      ctx.ellipse(4 * s, -8 * s, 5 * s, 2.5 * s, 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const height = stage >= 2 ? 29 : 18;
      ctx.strokeStyle = "#548a54";
      ctx.lineWidth = 2.4 * s;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-2 * s, -height * 0.6 * s, 1 * s, -height * s);
      ctx.stroke();
      ctx.fillStyle = stage >= 2 ? "#66a85f" : "#78b46a";
      ctx.beginPath();
      ctx.ellipse(-5 * s, -height * 0.58 * s, 7 * s, 3.3 * s, -0.45, 0, Math.PI * 2);
      ctx.ellipse(5 * s, -height * 0.78 * s, 7 * s, 3.3 * s, 0.45, 0, Math.PI * 2);
      ctx.fill();
      if (stage >= 2) {
        ctx.fillStyle = "#de6c76";
        [-1, 6].forEach((bx, index) => {
          ctx.beginPath();
          ctx.arc((bx - 3) * s, (-22 - index * 5) * s, 2.8 * s, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
    if (plant.waterLevel === 1) {
      ctx.fillStyle = "rgba(91, 184, 184, 0.65)";
      ctx.beginPath();
      ctx.arc(10 * s, -6 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlaced(point, object, now) {
    const s = viewScale;
    if (object.type === "bench") {
      drawShadow(point.x, point.y, 25, 8, 0.14);
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.fillStyle = "#8d6548";
      roundedRect(-26 * s, -23 * s, 52 * s, 7 * s, 3 * s);
      ctx.fill();
      ctx.fillStyle = "#cf9662";
      roundedRect(-24 * s, -20 * s, 48 * s, 10 * s, 3 * s);
      ctx.fill();
      ctx.strokeStyle = "#826049";
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(-18 * s, -18 * s);
      ctx.lineTo(-20 * s, 5 * s);
      ctx.moveTo(18 * s, -18 * s);
      ctx.lineTo(20 * s, 5 * s);
      ctx.stroke();
      ctx.fillStyle = "#e4b077";
      roundedRect(-26 * s, -30 * s, 52 * s, 5 * s, 3 * s);
      ctx.fill();
      ctx.restore();
    } else if (object.type === "flowerbed") {
      drawShadow(point.x, point.y, 23, 7, 0.12);
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.fillStyle = "#996b48";
      roundedRect(-24 * s, -13 * s, 48 * s, 15 * s, 5 * s);
      ctx.fill();
      ctx.fillStyle = "#6f9b60";
      roundedRect(-20 * s, -16 * s, 40 * s, 10 * s, 4 * s);
      ctx.fill();
      const colors = ["#ec8da5", "#f0c65f", "#d88781"];
      for (let i = 0; i < 6; i += 1) {
        const px = (-16 + i * 6.5) * s;
        const py = (-18 - (i % 2) * 5) * s;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(px, py, 3.2 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (object.type === "lantern") {
      drawShadow(point.x, point.y, 16, 6, 0.14);
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.strokeStyle = "#7c6851";
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -43 * s);
      ctx.stroke();
      ctx.fillStyle = "#5e5a4b";
      roundedRect(-10 * s, -49 * s, 20 * s, 18 * s, 4 * s);
      ctx.fill();
      ctx.fillStyle = "#ffe39b";
      roundedRect(-7 * s, -46 * s, 14 * s, 12 * s, 3 * s);
      ctx.fill();
      const glow = ctx.createRadialGradient(0, -39 * s, 0, 0, -39 * s, 28 * s);
      glow.addColorStop(0, "rgba(255, 224, 139, 0.32)");
      glow.addColorStop(1, "rgba(255, 224, 139, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -39 * s, 28 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (object.type === "swing") {
      drawShadow(point.x, point.y, 28, 8, 0.15);
      const sway = reduceMotion ? 0 : Math.sin(now * 0.002) * 1.5;
      ctx.save();
      ctx.translate(point.x + sway * s, point.y);
      ctx.strokeStyle = "#9b7251";
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(-25 * s, 2 * s);
      ctx.lineTo(-19 * s, -43 * s);
      ctx.lineTo(19 * s, -43 * s);
      ctx.lineTo(25 * s, 2 * s);
      ctx.stroke();
      ctx.strokeStyle = "#ede2cc";
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.moveTo(-11 * s, -40 * s);
      ctx.lineTo(-10 * s, -14 * s);
      ctx.moveTo(11 * s, -40 * s);
      ctx.lineTo(10 * s, -14 * s);
      ctx.stroke();
      ctx.fillStyle = "#8db17b";
      roundedRect(-15 * s, -17 * s, 30 * s, 7 * s, 3 * s);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPlayer(point, now) {
    const s = viewScale;
    const walk = player.moving && !reduceMotion ? Math.sin(player.stepPhase * Math.PI * 4) : 0;
    const bob = player.moving && !reduceMotion ? Math.abs(walk) * 2.4 : Math.sin(now * 0.0028) * 0.6;
    drawShadow(point.x, point.y, 18, 7, 0.21);
    ctx.save();
    ctx.translate(point.x, point.y - bob * s);
    ctx.scale(player.facing, 1);

    const stride = walk * 3.2 * s;
    ctx.fillStyle = "#485763";
    ctx.beginPath();
    ctx.ellipse(-7 * s + stride, -3 * s, 5.2 * s, 3.1 * s, -0.1, 0, Math.PI * 2);
    ctx.ellipse(7 * s - stride, -3 * s, 5.2 * s, 3.1 * s, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#73818a";
    ctx.beginPath();
    ctx.ellipse(-6 * s, -10 * s, 4.2 * s, 7.5 * s, 0.04, 0, Math.PI * 2);
    ctx.ellipse(6 * s, -10 * s, 4.2 * s, 7.5 * s, -0.04, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4c6977";
    roundedRect(-12 * s, -28 * s, 10 * s, 17 * s, 4 * s);
    ctx.fill();
    ctx.fillStyle = "#d7a85b";
    roundedRect(-13.5 * s, -27 * s, 11 * s, 9 * s, 3 * s);
    ctx.fill();

    ctx.fillStyle = "#8a6346";
    roundedRect(-19 * s, -40 * s, 12 * s, 21 * s, 6 * s);
    ctx.fill();
    ctx.strokeStyle = "#684c39";
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(-18 * s, -33 * s);
    ctx.lineTo(-9 * s, -33 * s);
    ctx.stroke();

    const shirt = ctx.createLinearGradient(-12 * s, -40 * s, 12 * s, -12 * s);
    shirt.addColorStop(0, "#f7e9c9");
    shirt.addColorStop(1, "#dccba9");
    ctx.fillStyle = shirt;
    roundedRect(-13 * s, -41 * s, 26 * s, 27 * s, 9 * s);
    ctx.fill();

    ctx.fillStyle = "#4f867e";
    ctx.beginPath();
    ctx.moveTo(-12 * s, -37 * s);
    ctx.lineTo(-3 * s, -38 * s);
    ctx.lineTo(-3 * s, -17 * s);
    ctx.lineTo(-11 * s, -18 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12 * s, -37 * s);
    ctx.lineTo(3 * s, -38 * s);
    ctx.lineTo(3 * s, -17 * s);
    ctx.lineTo(11 * s, -18 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f4d887";
    roundedRect(-3 * s, -29 * s, 6 * s, 13 * s, 2 * s);
    ctx.fill();

    ctx.strokeStyle = "#eac8a7";
    ctx.lineWidth = 5 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-11 * s, -36 * s);
    ctx.lineTo(-17 * s, -22 * s);
    ctx.moveTo(11 * s, -36 * s);
    ctx.lineTo(16 * s, -24 * s);
    ctx.stroke();
    ctx.fillStyle = "#eac8a7";
    ctx.beginPath();
    ctx.arc(-17 * s, -21 * s, 2.8 * s, 0, Math.PI * 2);
    ctx.arc(16 * s, -23 * s, 2.8 * s, 0, Math.PI * 2);
    ctx.fill();

    const hairBack = ctx.createLinearGradient(-15 * s, -65 * s, 15 * s, -38 * s);
    hairBack.addColorStop(0, "#c96f8d");
    hairBack.addColorStop(1, "#eaa0b3");
    ctx.fillStyle = hairBack;
    ctx.beginPath();
    ctx.ellipse(0, -50 * s, 17 * s, 15 * s, -0.05, 0, Math.PI * 2);
    ctx.ellipse(-14 * s, -45 * s, 6 * s, 9 * s, -0.35, 0, Math.PI * 2);
    ctx.ellipse(14 * s, -46 * s, 5.5 * s, 8 * s, 0.3, 0, Math.PI * 2);
    ctx.fill();

    const face = ctx.createLinearGradient(0, -59 * s, 0, -37 * s);
    face.addColorStop(0, "#f7d6bf");
    face.addColorStop(1, "#eebda7");
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.ellipse(0.5 * s, -48 * s, 12 * s, 12.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#c96f8d";
    ctx.beginPath();
    ctx.ellipse(-6 * s, -58 * s, 9 * s, 5 * s, -0.45, 0, Math.PI * 2);
    ctx.ellipse(7 * s, -58 * s, 8 * s, 4.5 * s, 0.48, 0, Math.PI * 2);
    ctx.ellipse(-12 * s, -51 * s, 4 * s, 8 * s, -0.28, 0, Math.PI * 2);
    ctx.ellipse(12 * s, -53 * s, 3.2 * s, 6 * s, 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#344653";
    ctx.beginPath();
    ctx.ellipse(-4.7 * s, -49 * s, 1.5 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(4.7 * s, -49 * s, 1.5 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.beginPath();
    ctx.arc(-5.1 * s, -49.6 * s, 0.45 * s, 0, Math.PI * 2);
    ctx.arc(4.3 * s, -49.6 * s, 0.45 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(221, 113, 119, 0.26)";
    ctx.beginPath();
    ctx.ellipse(-8 * s, -44 * s, 3.2 * s, 1.5 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(8 * s, -44 * s, 3.2 * s, 1.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8b5b56";
    ctx.lineWidth = 1.1 * s;
    ctx.beginPath();
    ctx.arc(0, -45 * s, 3.2 * s, 0.22, Math.PI - 0.22);
    ctx.stroke();

    ctx.fillStyle = "#f1c75c";
    ctx.beginPath();
    ctx.arc(-13 * s, -58 * s, 2.3 * s, 0, Math.PI * 2);
    ctx.arc(-11 * s, -61 * s, 2.3 * s, 0, Math.PI * 2);
    ctx.arc(-9 * s, -58 * s, 2.3 * s, 0, Math.PI * 2);
    ctx.fill();

    if (state.tool === "water") {
      ctx.fillStyle = "#70a9a8";
      roundedRect(12 * s, -23 * s, 12 * s, 10 * s, 3 * s);
      ctx.fill();
      ctx.strokeStyle = "#5a8e8e";
      ctx.lineWidth = 1.7 * s;
      ctx.beginPath();
      ctx.moveTo(23 * s, -20 * s);
      ctx.lineTo(29 * s, -25 * s);
      ctx.stroke();
    } else if (state.tool === "plant") {
      ctx.fillStyle = "#6b9d58";
      ctx.save();
      ctx.translate(16 * s, -20 * s);
      ctx.rotate(-0.35);
      ctx.beginPath();
      ctx.ellipse(0, 0, 6 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPikachu(point, now) {
    const s = viewScale;
    const bounce = reduceMotion ? 0 : Math.max(0, Math.sin(now * 0.0024)) * 1.5;
    drawShadow(point.x, point.y, 16, 6, 0.16);
    ctx.save();
    ctx.translate(point.x, point.y - bounce * s);

    const tail = ctx.createLinearGradient(22 * s, -42 * s, 37 * s, -10 * s);
    tail.addColorStop(0, "#f5d65e");
    tail.addColorStop(1, "#dca82d");
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.moveTo(12 * s, -15 * s);
    ctx.lineTo(25 * s, -23 * s);
    ctx.lineTo(20 * s, -29 * s);
    ctx.lineTo(34 * s, -41 * s);
    ctx.lineTo(37 * s, -31 * s);
    ctx.lineTo(31 * s, -34 * s);
    ctx.lineTo(40 * s, -20 * s);
    ctx.lineTo(29 * s, -25 * s);
    ctx.lineTo(32 * s, -18 * s);
    ctx.lineTo(20 * s, -10 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f0c33e";
    ctx.beginPath();
    ctx.moveTo(-11 * s, -35 * s);
    ctx.quadraticCurveTo(-22 * s, -54 * s, -18 * s, -62 * s);
    ctx.quadraticCurveTo(-10 * s, -55 * s, -5 * s, -43 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10 * s, -36 * s);
    ctx.quadraticCurveTo(22 * s, -55 * s, 19 * s, -64 * s);
    ctx.quadraticCurveTo(10 * s, -56 * s, 5 * s, -44 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3c3f3c";
    ctx.beginPath();
    ctx.moveTo(-18 * s, -62 * s);
    ctx.quadraticCurveTo(-13 * s, -58 * s, -10 * s, -53 * s);
    ctx.lineTo(-16 * s, -55 * s);
    ctx.lineTo(-18 * s, -58 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(19 * s, -64 * s);
    ctx.quadraticCurveTo(14 * s, -59 * s, 10 * s, -54 * s);
    ctx.lineTo(16 * s, -56 * s);
    ctx.lineTo(19 * s, -60 * s);
    ctx.closePath();
    ctx.fill();

    const body = ctx.createLinearGradient(-13 * s, -31 * s, 13 * s, -2 * s);
    body.addColorStop(0, "#ffe47a");
    body.addColorStop(0.52, "#f2cb45");
    body.addColorStop(1, "#d5a52b");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, -18 * s, 15.5 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#efbf3a";
    ctx.beginPath();
    ctx.ellipse(-13 * s, -4 * s, 6 * s, 3.5 * s, -0.2, 0, Math.PI * 2);
    ctx.ellipse(13 * s, -4 * s, 6 * s, 3.5 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();

    const head = ctx.createRadialGradient(-6 * s, -43 * s, 2 * s, 0, -35 * s, 20 * s);
    head.addColorStop(0, "#ffe77e");
    head.addColorStop(1, "#efc642");
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.ellipse(0, -34 * s, 18 * s, 16.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ea6966";
    ctx.beginPath();
    ctx.ellipse(-11 * s, -29 * s, 4 * s, 3 * s, -0.2, 0, Math.PI * 2);
    ctx.ellipse(11 * s, -29 * s, 4 * s, 3 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f383b";
    ctx.beginPath();
    ctx.ellipse(-6 * s, -38 * s, 2.4 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(6 * s, -38 * s, 2.4 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-6.8 * s, -39 * s, 0.7 * s, 0, Math.PI * 2);
    ctx.arc(5.2 * s, -39 * s, 0.7 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#433b2f";
    ctx.beginPath();
    ctx.ellipse(0, -31 * s, 2 * s, 1.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#564934";
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.arc(0, -30 * s, 2.3 * s, 0.25, Math.PI - 0.25);
    ctx.stroke();

    ctx.fillStyle = "#e7b73b";
    roundedRect(-11 * s, -11 * s, 7 * s, 10 * s, 3 * s);
    ctx.fill();
    roundedRect(4 * s, -11 * s, 7 * s, 10 * s, 3 * s);
    ctx.fill();
    ctx.restore();
  }

  function drawEevee(point, now) {
    const s = viewScale;
    const bounce = reduceMotion ? 0 : Math.max(0, Math.sin(now * 0.0021 + 1)) * 1.3;
    drawShadow(point.x, point.y, 16, 6, 0.15);
    ctx.save();
    ctx.translate(point.x, point.y - bounce * s);

    const tail = ctx.createLinearGradient(15 * s, -32 * s, 35 * s, -7 * s);
    tail.addColorStop(0, "#b88251");
    tail.addColorStop(1, "#e2bd8b");
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.ellipse(20 * s, -18 * s, 13 * s, 9 * s, -0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#efd6ad";
    ctx.beginPath();
    ctx.ellipse(30 * s, -25 * s, 6.5 * s, 7 * s, -0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#9d6b43";
    ctx.beginPath();
    ctx.moveTo(-11 * s, -37 * s);
    ctx.quadraticCurveTo(-24 * s, -55 * s, -18 * s, -65 * s);
    ctx.quadraticCurveTo(-9 * s, -56 * s, -4 * s, -43 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10 * s, -38 * s);
    ctx.quadraticCurveTo(24 * s, -56 * s, 18 * s, -67 * s);
    ctx.quadraticCurveTo(9 * s, -57 * s, 4 * s, -44 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#5f402e";
    ctx.beginPath();
    ctx.moveTo(-19 * s, -64 * s);
    ctx.quadraticCurveTo(-15 * s, -58 * s, -11 * s, -54 * s);
    ctx.lineTo(-17 * s, -56 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(19 * s, -66 * s);
    ctx.quadraticCurveTo(15 * s, -59 * s, 11 * s, -55 * s);
    ctx.lineTo(17 * s, -57 * s);
    ctx.closePath();
    ctx.fill();

    const body = ctx.createLinearGradient(-14 * s, -38 * s, 14 * s, -2 * s);
    body.addColorStop(0, "#cc9564");
    body.addColorStop(1, "#95653f");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, -18 * s, 15 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    const collar = ctx.createRadialGradient(-3 * s, -31 * s, 2 * s, 0, -25 * s, 19 * s);
    collar.addColorStop(0, "#fff0cf");
    collar.addColorStop(1, "#dfc398");
    ctx.fillStyle = collar;
    ctx.beginPath();
    ctx.ellipse(-11 * s, -30 * s, 8 * s, 7 * s, -0.45, 0, Math.PI * 2);
    ctx.ellipse(11 * s, -30 * s, 8 * s, 7 * s, 0.45, 0, Math.PI * 2);
    ctx.ellipse(0, -25 * s, 13 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    const head = ctx.createLinearGradient(-13 * s, -52 * s, 13 * s, -30 * s);
    head.addColorStop(0, "#d29a67");
    head.addColorStop(1, "#aa7549");
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.ellipse(0, -42 * s, 17 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f1dbb8";
    ctx.beginPath();
    ctx.ellipse(0, -36 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#353733";
    ctx.beginPath();
    ctx.ellipse(-6 * s, -44 * s, 2.4 * s, 3.1 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(6 * s, -44 * s, 2.4 * s, 3.1 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-6.8 * s, -45 * s, 0.7 * s, 0, Math.PI * 2);
    ctx.arc(5.2 * s, -45 * s, 0.7 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#332e29";
    ctx.beginPath();
    ctx.ellipse(0, -38 * s, 2.1 * s, 1.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#634838";
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.arc(0, -37 * s, 2.5 * s, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = "#9c6a43";
    ctx.beginPath();
    ctx.ellipse(-13 * s, -4 * s, 6 * s, 3.4 * s, -0.2, 0, Math.PI * 2);
    ctx.ellipse(13 * s, -4 * s, 6 * s, 3.4 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBulbasaur(point, now) {
    const s = viewScale;
    const bounce = reduceMotion ? 0 : Math.max(0, Math.sin(now * 0.0019 + 2)) * 1.3;
    drawShadow(point.x, point.y, 19, 7, 0.16);
    ctx.save();
    ctx.translate(point.x, point.y - bounce * s);

    const body = ctx.createLinearGradient(-17 * s, -32 * s, 18 * s, -2 * s);
    body.addColorStop(0, "#77b7a1");
    body.addColorStop(0.58, "#579b83");
    body.addColorStop(1, "#3f806d");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, -17 * s, 19 * s, 17 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    const bulb = ctx.createRadialGradient(-7 * s, -45 * s, 2 * s, -2 * s, -36 * s, 21 * s);
    bulb.addColorStop(0, "#9bc692");
    bulb.addColorStop(0.58, "#6ca77a");
    bulb.addColorStop(1, "#438a73");
    ctx.fillStyle = bulb;
    ctx.beginPath();
    ctx.ellipse(-2 * s, -37 * s, 17 * s, 15 * s, -0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(46, 104, 77, 0.32)";
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(-13 * s, -40 * s);
    ctx.quadraticCurveTo(-3 * s, -34 * s, 8 * s, -39 * s);
    ctx.stroke();

    const head = ctx.createLinearGradient(-14 * s, -31 * s, 14 * s, -3 * s);
    head.addColorStop(0, "#8bc7ad");
    head.addColorStop(1, "#65a98e");
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.ellipse(0, -13 * s, 15 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(45, 111, 91, 0.3)";
    ctx.beginPath();
    ctx.ellipse(-13 * s, -17 * s, 3.5 * s, 2.3 * s, -0.2, 0, Math.PI * 2);
    ctx.ellipse(13 * s, -18 * s, 3.5 * s, 2.3 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e26c6e";
    ctx.beginPath();
    ctx.ellipse(-10 * s, -18 * s, 3.4 * s, 2.5 * s, -0.15, 0, Math.PI * 2);
    ctx.ellipse(10 * s, -18 * s, 3.4 * s, 2.5 * s, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f2f5ed";
    ctx.beginPath();
    ctx.ellipse(-5.5 * s, -23 * s, 3.1 * s, 3.6 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(5.5 * s, -23 * s, 3.1 * s, 3.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#34484c";
    ctx.beginPath();
    ctx.arc(-5.3 * s, -23.5 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.arc(5.7 * s, -23.5 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3c6865";
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(-5 * s, -17 * s);
    ctx.quadraticCurveTo(0, -14 * s, 5 * s, -17 * s);
    ctx.stroke();
    ctx.fillStyle = "#579781";
    ctx.beginPath();
    ctx.ellipse(-17 * s, -3 * s, 8 * s, 4.5 * s, -0.2, 0, Math.PI * 2);
    ctx.ellipse(17 * s, -3 * s, 8 * s, 4.5 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawResident(id, point, now) {
    if (id === "pikachu") drawPikachu(point, now);
    if (id === "eevee") drawEevee(point, now);
    if (id === "bulbasaur") drawBulbasaur(point, now);
  }

  function drawSelectedTile() {
    if (!player.pending) return;
    const target = player.pending.object || player.pending.tile;
    if (!target) return;
    const point = worldToScreen(target.x + 0.5, target.y + 0.5);
    const tileH = baseTileH * viewScale;
    const tileW = baseTileW * viewScale;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = "rgba(255, 251, 220, 0.92)";
    ctx.lineWidth = 2 * viewScale;
    ctx.shadowColor = "rgba(39, 102, 91, 0.38)";
    ctx.shadowBlur = 10;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(-tileW * 0.27, -tileH * 0.37, tileW * 0.54, tileH * 0.74);
    ctx.restore();
  }

  function drawInteractionHalo(now) {
    if (!player.pending || !player.pending.object) return;
    const object = player.pending.object;
    const point = worldToScreen(object.x + 0.5, object.y + 0.5);
    const radius = (19 + Math.sin(now * 0.004) * 2) * viewScale;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 250, 221, 0.8)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, radius, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach((particle) => {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(particle.x, particle.y);
      if (particle.kind === "water") {
        ctx.fillStyle = "#c8f3ef";
        ctx.beginPath();
        ctx.ellipse(0, 0, particle.size * viewScale, particle.size * 1.35 * viewScale, 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else if (particle.kind === "heart") {
        ctx.fillStyle = particle.color || "#e98890";
        ctx.beginPath();
        ctx.moveTo(0, 5 * viewScale);
        ctx.bezierCurveTo(-8 * viewScale, -1 * viewScale, -3 * viewScale, -8 * viewScale, 0, -4 * viewScale);
        ctx.bezierCurveTo(3 * viewScale, -8 * viewScale, 8 * viewScale, -1 * viewScale, 0, 5 * viewScale);
        ctx.fill();
      } else {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(0, 0, particle.size * viewScale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawWorld(now) {
    if (window.SunnyIsle3D?.ready) {
      window.SunnyIsle3D.render({
        now,
        state,
        player,
        pending: player.pending,
      });
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawSky(now);
    drawDistantIslands(now);
    drawMap(now);
    drawSelectedTile();
    drawInteractionHalo(now);

    const renderables = [];
    worldObjects.forEach((object) => {
      if (object.type === "flower") {
        renderables.push({ depth: object.x + object.y + 0.2, draw: () => drawFlower(worldToScreen(object.x + 0.5, object.y + 0.5), object, now) });
      } else {
        renderables.push({
          depth: object.x + object.y + (object.type === "house" ? 0.8 : 0.4),
          draw: () => drawStaticObject(object, now),
        });
      }
    });

    state.plants.forEach((plant) => {
      renderables.push({
        depth: plant.x + plant.y + 0.35,
        draw: () => drawPlant(worldToScreen(plant.x + 0.5, plant.y + 0.5), plant, now),
      });
    });
    state.placed.forEach((object) => {
      renderables.push({
        depth: object.x + object.y + 0.42,
        draw: () => drawPlaced(worldToScreen(object.x + 0.5, object.y + 0.5), object, now),
      });
    });
    Object.entries(RESIDENTS).forEach(([id, resident]) => {
      if (state.residents[id]) {
        renderables.push({
          depth: resident.x + resident.y + 0.55,
          draw: () => drawResident(id, worldToScreen(resident.x + 0.5, resident.y + 0.5), now),
        });
      }
    });
    renderables.push({
      depth: player.renderX + player.renderY + 0.76,
      draw: () => drawPlayer(worldToScreen(player.renderX + 0.5, player.renderY + 0.5), now),
    });
    renderables.sort((a, b) => a.depth - b.depth).forEach((item) => item.draw());
    drawParticles();
  }

  function drawStaticObject(object, now) {
    const point = worldToScreen(object.x + 0.5, object.y + 0.5);
    if (object.type === "tree") drawTree(point, object, now);
    else if (object.type === "bush") drawBush(point, object, now);
    else if (object.type === "rock") drawRock(point, object);
    else if (object.type === "house") drawHouse(point);
    else if (object.type === "campfire") drawCampfire(point, now);
    else if (object.type === "sign") drawSign(point);
    else if (object.type === "stump") drawStump(point);
  }

  function updatePlayer(dt) {
    if (!player.path.length) {
      player.moving = false;
      if (player.pending) {
        const pending = player.pending;
        player.pending = null;
        executePending(pending);
      }
      return;
    }

    player.moving = true;
    const target = player.path[0];
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.hypot(dx, dy);
    const speed = 4.15;
    const step = speed * dt;
    player.stepPhase += dt * 1.4;

    if (distance <= step || distance < 0.001) {
      player.x = target.x;
      player.y = target.y;
      player.path.shift();
      if (dx !== 0) player.facing = dx > 0 ? 1 : -1;
    } else {
      player.x += (dx / distance) * step;
      player.y += (dy / distance) * step;
      if (Math.abs(dx) > 0.03) player.facing = dx > 0 ? 1 : -1;
    }
    player.renderX = lerp(player.renderX, player.x, Math.min(1, dt * 12));
    player.renderY = lerp(player.renderY, player.y, Math.min(1, dt * 12));
  }

  function updateParticles(dt) {
    particles.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += particle.gravity * dt;
      particle.life -= dt;
    });
    particles = particles.filter((particle) => particle.life > 0);
    cameraShake = Math.max(0, cameraShake - dt * 20);
  }

  function updateClock(dt) {
    state.clock += dt * 0.48;
    if (state.clock >= 24 * 60) {
      state.clock -= 24 * 60;
      state.day += 1;
      showToast(`晴天第 ${state.day} 天，岛上的风换了方向`, "info");
      saveState();
    }
  }

  function tick(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    updatePlayer(dt);
    updateParticles(dt);
    updateClock(dt);
    interactionPulse += dt;
    updateEnergy(dt);
    drawWorld(now);
    uiClock += dt;
    if (uiClock > 0.4) {
      updateHud();
      uiClock = 0;
    }
    requestAnimationFrame(tick);
  }

  let energyTick = 0;
  function updateEnergy(dt) {
    energyTick += dt;
    if (energyTick > 7 && state.energy < 100) {
      state.energy = Math.min(100, state.energy + 1);
      energyTick = 0;
    }
  }

  function findPath(startX, startY, targetX, targetY) {
    const sx = Math.round(startX);
    const sy = Math.round(startY);
    if (sx === targetX && sy === targetY) return [];
    if (!isPassable(targetX, targetY)) return null;
    const queue = [{ x: sx, y: sy }];
    const visited = new Set([`${sx},${sy}`]);
    const previous = new Map();
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    while (queue.length) {
      const current = queue.shift();
      if (current.x === targetX && current.y === targetY) {
        const path = [];
        let key = `${targetX},${targetY}`;
        while (key !== `${sx},${sy}`) {
          const [x, y] = key.split(",").map(Number);
          path.unshift({ x, y });
          key = previous.get(key);
        }
        return path;
      }
      for (const [dx, dy] of directions) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const key = `${nx},${ny}`;
        if (visited.has(key) || !isPassable(nx, ny)) continue;
        visited.add(key);
        previous.set(key, `${current.x},${current.y}`);
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  function walkTo(x, y, pending = null) {
    const path = findPath(player.x, player.y, x, y);
    if (!path) {
      showToast("那边现在过不去", "info");
      playTone(180, 0.08, "sine", 0.018);
      return false;
    }
    player.path = path;
    player.pending = pending;
    if (!path.length && pending) executePending(pending);
    return true;
  }

  function walkAdjacentTo(object, pending) {
    const candidates = [
      { x: object.x + 1, y: object.y },
      { x: object.x - 1, y: object.y },
      { x: object.x, y: object.y + 1 },
      { x: object.x, y: object.y - 1 },
    ]
      .filter((tile) => isPassable(tile.x, tile.y))
      .map((tile) => ({
        ...tile,
        distance: Math.abs(tile.x - player.x) + Math.abs(tile.y - player.y),
      }))
      .sort((a, b) => a.distance - b.distance);

    for (const candidate of candidates) {
      const path = findPath(player.x, player.y, candidate.x, candidate.y);
      if (path) {
        player.path = path;
        player.pending = pending;
        if (!path.length) executePending(pending);
        return true;
      }
    }
    showToast("再靠近一点才能互动", "info");
    return false;
  }

  function handleTileTap(tile) {
    hideHint();
    const object = objectAt(tile.x, tile.y);
    const resident = residentAt(tile.x, tile.y);

    if (state.tool === "build") {
      if (!state.buildSelected) {
        toggleBuildTray(true);
        showToast("先从建造栏里选一件物品", "info");
        return;
      }
      tryPlaceBuild(tile.x, tile.y);
      return;
    }

    if (state.tool === "plant") {
      if (object || resident) {
        showToast("这里已经有东西了，换一块空地吧", "info");
        return;
      }
      if (!isPassable(tile.x, tile.y)) {
        showToast("种子需要种在草地上", "info");
        return;
      }
      if (state.inventory.seeds <= 0) {
        showToast("种子用完了，再采些莓果吧", "info");
        return;
      }
      walkTo(tile.x, tile.y, { type: "plant", tile });
      return;
    }

    if (state.tool === "water") {
      if (tileType(tile.x, tile.y) === "water") {
        const adjacent = findAdjacentWalkable(tile.x, tile.y);
        if (!adjacent) {
          showToast("水边被挡住了，换一边试试", "info");
          return;
        }
        walkTo(adjacent.x, adjacent.y, { type: "refill" });
        return;
      }
      const target = object && (object.waterable || object.isPlant) ? object : null;
      if (!target) {
        showToast("水壶要对准花苗或植物", "info");
        return;
      }
      walkAdjacentTo(target, { type: "water", object: target });
      return;
    }

    if (resident) {
      greetResident(resident[0]);
      return;
    }

    if (object) {
      if (object.interactive === "rest" || object.isPlaced) {
        walkAdjacentTo(object, { type: object.isPlaced ? "relax" : "rest", object });
        return;
      }
      if (object.harvest) {
        walkAdjacentTo(object, { type: "gather", object });
        return;
      }
      if (object.isPlant) {
        if ((object.stage || 0) >= 2) {
          walkAdjacentTo(object, { type: "harvestPlant", object });
        } else {
          showToast("它还没长大，先用水壶浇浇水", "info");
        }
        return;
      }
      if (object.type === "house") {
        showToast("小屋已经暖暖的了。外面还有好多事可做。", "info");
        return;
      }
      if (object.type === "sign") {
        showToast("木牌上写着：晴空岛欢迎每一位慢慢生活的朋友", "info");
        return;
      }
    }

    if (isPassable(tile.x, tile.y)) {
      walkTo(tile.x, tile.y);
    } else {
      showToast("那里不是能落脚的地方", "info");
    }
  }

  function findAdjacentWalkable(x, y) {
    return [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ]
      .filter((tile) => isPassable(tile.x, tile.y))
      .sort(
        (a, b) =>
          Math.abs(a.x - player.x) +
          Math.abs(a.y - player.y) -
          (Math.abs(b.x - player.x) + Math.abs(b.y - player.y)),
      )[0];
  }

  function executePending(pending) {
    if (pending.type === "gather") gatherObject(pending.object);
    if (pending.type === "water") waterObject(pending.object);
    if (pending.type === "refill") refillWater();
    if (pending.type === "plant") plantSapling(pending.tile);
    if (pending.type === "place") placeBuild(pending.tile, pending.buildType);
    if (pending.type === "rest" || pending.type === "relax") restAt(pending.object);
    if (pending.type === "harvestPlant") harvestPlant(pending.object);
  }

  function gatherObject(object) {
    const liveObject = worldObjects.find((item) => item.id === object.id) || object;
    if (liveObject.cooldownUntil && liveObject.cooldownUntil > performance.now()) {
      const seconds = Math.ceil((liveObject.cooldownUntil - performance.now()) / 1000);
      showToast(`这里刚采过，再等 ${seconds} 秒`, "info");
      playTone(190, 0.07, "sine", 0.015);
      return;
    }
    if (state.energy < 3) {
      showToast("体力不太够了，去篝火或长椅歇一会吧", "info");
      return;
    }
    const resource = liveObject.harvest;
    const amount = liveObject.amount || 1;
    state.energy -= 3;
    state.inventory[resource] += amount;
    if (resource === "wood") {
      if (Math.random() > 0.72) {
        state.inventory.bloom += 1;
        showToast(`找到 ${amount} 份木材，还有一朵小花`, "info");
      } else {
        showToast(`收集到 ${amount} 份木材`, "info");
      }
    }
    if (resource === "stone") showToast(`收集到 ${amount} 块石头`, "stone");
    if (resource === "berry") {
      state.stats.berryHarvests += 1;
      showToast(`采到 ${amount} 颗树莓`, "berry");
    }
    liveObject.cooldownUntil = performance.now() + (liveObject.cooldown || 14000);
    burstAt(liveObject.x + 0.5, liveObject.y + 0.5, resource === "berry" ? "heart" : "spark", 7);
    playTone(resource === "stone" ? 240 : 520, 0.08, "triangle", 0.025);
    checkQuests();
    saveState();
    updateHud();
  }

  function waterObject(object) {
    if (state.inventory.water <= 0) {
      showToast("水壶空了，去池塘边补一些水", "info");
      return;
    }
    const waterLevel = object.waterLevel || 0;
    if (waterLevel >= 2 && !object.isPlant) {
      showToast("这株花已经很精神了", "info");
      return;
    }
    state.inventory.water -= 1;
    state.energy = Math.max(0, state.energy - 1);
    state.stats.waterings += 1;
    if (object.isPlant) {
      const plant = state.plants.find((item) => item.id === object.id);
      if (plant) {
        plant.waterLevel = (plant.waterLevel || 0) + 1;
        if (plant.waterLevel >= 2) {
          plant.waterLevel = 0;
          plant.stage = Math.min(2, (plant.stage || 0) + 1);
          if (plant.stage === 2) {
            state.stats.grownPlants += 1;
            showToast("小苗长大了，枝头结出了莓果", "berry");
            burstAt(plant.x + 0.5, plant.y + 0.5, "heart", 10);
          } else {
            showToast("叶子舒展开了一点", "info");
          }
        } else {
          showToast("泥土变得湿润了", "info");
        }
      }
    } else {
      const live = worldObjects.find((item) => item.id === object.id);
      if (live) live.waterLevel = Math.min(2, (live.waterLevel || 0) + 1);
      showToast("花瓣喝饱了水，颜色更亮了", "info");
    }
    waterBurst(object.x + 0.5, object.y + 0.5);
    playTone(660, 0.1, "sine", 0.02);
    checkQuests();
    saveState();
    updateHud();
  }

  function refillWater() {
    state.inventory.water = 3;
    showToast("水壶装满了清凉的池水", "info");
    playTone(330, 0.12, "sine", 0.02);
    saveState();
    updateHud();
  }

  function plantSapling(tile) {
    if (state.inventory.seeds <= 0) {
      showToast("种子用完了", "info");
      return;
    }
    if (objectAt(tile.x, tile.y) || !isPassable(tile.x, tile.y)) {
      showToast("这块地现在不能种", "info");
      return;
    }
    state.inventory.seeds -= 1;
    state.energy = Math.max(0, state.energy - 2);
    state.stats.plantings += 1;
    state.plants.push({
      id: `plant-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      x: tile.x,
      y: tile.y,
      stage: 0,
      waterLevel: 0,
    });
    showToast("种下一株小苗，记得给它浇水", "info");
    burstAt(tile.x + 0.5, tile.y + 0.5, "spark", 6);
    playTone(440, 0.1, "triangle", 0.02);
    checkQuests();
    saveState();
    updateHud();
  }

  function harvestPlant(object) {
    const index = state.plants.findIndex((plant) => plant.id === object.id);
    if (index < 0) return;
    const plant = state.plants[index];
    if ((plant.stage || 0) < 2) {
      showToast("还没有成熟，再等等吧", "info");
      return;
    }
    state.inventory.berry += 2;
    state.stats.berryHarvests += 1;
    plant.stage = 1;
    plant.waterLevel = 0;
    showToast("从自己种的树苗上收获了 2 颗树莓", "berry");
    burstAt(plant.x + 0.5, plant.y + 0.5, "heart", 9);
    playTone(520, 0.09, "triangle", 0.022);
    checkQuests();
    saveState();
    updateHud();
  }

  function restAt(object) {
    if (state.energy >= 100) {
      showToast("现在已经精神满满，不用休息啦", "info");
      return;
    }
    state.energy = Math.min(100, state.energy + 22);
    state.stats.restCount += 1;
    state.clock += 12;
    if (state.clock >= 24 * 60) {
      state.clock -= 24 * 60;
      state.day += 1;
    }
    const message =
      object && object.type === "bench"
        ? "在长椅上吹了吹风，体力恢复了"
        : "在营地边歇了一会，体力恢复了";
    showToast(message, "info");
    burstAt(player.x + 0.5, player.y + 0.5, "heart", 6);
    playTone(392, 0.15, "sine", 0.015);
    saveState();
    updateHud();
  }

  function tryPlaceBuild(x, y) {
    const type = state.buildSelected;
    if (!type) {
      toggleBuildTray(true);
      return;
    }
    if (!isPassable(x, y) || objectAt(x, y) || residentAt(x, y)) {
      showToast("这里放不下，换一块空草地吧", "info");
      return;
    }
    const definition = BUILD_ITEMS[type];
    if (!canAfford(definition.cost)) {
      showToast("材料还不够，先去岛上采集吧", "info");
      return;
    }
    walkTo(x, y, { type: "place", tile: { x, y }, buildType: type });
  }

  function placeBuild(tile, type) {
    const definition = BUILD_ITEMS[type];
    if (!definition || !canAfford(definition.cost)) {
      showToast("材料不够，暂时放不下", "info");
      return;
    }
    for (const [resource, amount] of Object.entries(definition.cost)) {
      state.inventory[resource] -= amount;
    }
    state.energy = Math.max(0, state.energy - 4);
    state.placed.push({
      id: `placed-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      x: tile.x,
      y: tile.y,
    });
    state.stats[definition.stat] = (state.stats[definition.stat] || 0) + 1;
    state.buildSelected = null;
    toggleBuildTray(false);
    showToast(`${definition.label}建好了，岛上的生活又舒服了一点`, "reward");
    burstAt(tile.x + 0.5, tile.y + 0.5, "spark", 12);
    playTone(660, 0.12, "triangle", 0.024);
    setTimeout(() => playTone(880, 0.16, "sine", 0.02), 110);
    checkQuests();
    saveState();
    updateHud();
  }

  function canAfford(cost) {
    return Object.entries(cost).every(([resource, amount]) => state.inventory[resource] >= amount);
  }

  function greetResident(id) {
    const resident = RESIDENTS[id];
    showToast(`${resident.name}：${resident.line}`, "resident");
    burstAt(resident.x + 0.5, resident.y + 0.5, "heart", 8);
    playTone(id === "pikachu" ? 740 : 560, 0.1, "sine", 0.018);
  }

  function checkQuests() {
    let quest = activeQuest();
    while (quest && (state.stats[quest.stat] || 0) >= quest.target) {
      if (!state.completedQuests.includes(quest.id)) {
        const completedQuest = { ...quest };
        state.completedQuests.push(completedQuest.id);
        state.coins += completedQuest.reward;
        state.level = Math.min(12, state.level + 1);
        if (completedQuest.resident) {
          state.residents[completedQuest.resident] = true;
          const resident = RESIDENTS[completedQuest.resident];
          setTimeout(() => {
            showToast(`${resident.name} 循着岛上的气味来啦`, "resident");
            playTone(784, 0.12, "sine", 0.025);
            setTimeout(() => playTone(1046, 0.18, "sine", 0.02), 130);
            updateHud();
            saveState();
          }, 900);
        }
        setTimeout(() => {
          showToast(`委托完成，收到 ${completedQuest.reward} 枚贝壳`, "reward");
          updateHud();
          saveState();
        }, 300);
      }
      quest = activeQuest();
    }
  }

  function activeQuest() {
    return QUESTS.find((quest) => !state.completedQuests.includes(quest.id)) || null;
  }

  function trackQuest() {
    const quest = activeQuest();
    if (!quest) {
      showToast("今天的岛上委托都完成了", "reward");
      return;
    }
    if (quest.id === "breakfast") {
      setTool("gather");
      const bush = worldObjects
        .filter((object) => object.type === "bush")
        .sort(
          (a, b) =>
            Math.abs(a.x - player.x) +
            Math.abs(a.y - player.y) -
            (Math.abs(b.x - player.x) + Math.abs(b.y - player.y)),
        )[0];
      walkAdjacentTo(bush, { type: "gather", object: bush });
    } else if (quest.id === "watering") {
      setTool("water");
      const plant =
        state.plants.find((item) => (item.stage || 0) < 2 || (item.waterLevel || 0) < 2) ||
        worldObjects.find((object) => object.type === "flower" && (object.waterLevel || 0) < 2);
      if (plant) {
        walkAdjacentTo(plant, {
          type: "water",
          object: { ...plant, isPlant: plant.stage !== undefined },
        });
      } else {
        showToast("岛上的花都喝饱了，可以种一株新苗", "info");
      }
    } else {
      setTool("build");
      toggleBuildTray(true);
      showToast(quest.actionHint, "info");
    }
  }

  function burstAt(x, y, kind, count) {
    if (window.SunnyIsle3D?.ready) {
      window.SunnyIsle3D.emit({ x, y }, kind, count);
      return;
    }
    const point = worldToScreen(x, y);
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      particles.push({
        x: point.x + (Math.random() - 0.5) * 12,
        y: point.y - 14 * viewScale,
        vx: Math.cos(angle) * (16 + Math.random() * 26),
        vy: Math.sin(angle) * (14 + Math.random() * 18) - 18,
        gravity: 44,
        life: 0.55 + Math.random() * 0.45,
        maxLife: 1,
        size: kind === "heart" ? 2.4 : 1.8 + Math.random() * 1.8,
        kind: kind === "heart" ? "heart" : "spark",
        color: kind === "heart" ? "#e98f99" : "#fff1ad",
      });
    }
  }

  function waterBurst(x, y) {
    if (window.SunnyIsle3D?.ready) {
      window.SunnyIsle3D.emit({ x, y }, "water", 12);
      return;
    }
    const point = worldToScreen(x, y);
    for (let i = 0; i < 12; i += 1) {
      particles.push({
        x: point.x + (Math.random() - 0.5) * 28,
        y: point.y - 30 * viewScale,
        vx: (Math.random() - 0.5) * 18,
        vy: 8 + Math.random() * 20,
        gravity: 55,
        life: 0.55 + Math.random() * 0.3,
        maxLife: 1,
        size: 1.2 + Math.random() * 1.3,
        kind: "water",
      });
    }
  }

  function setTool(tool) {
    state.tool = tool;
    if (tool !== "build") {
      state.buildSelected = null;
      toggleBuildTray(false);
    }
    $$(".tool").forEach((button) => {
      const active = button.dataset.tool === tool;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (tool === "gather") {
      showHint("点树、岩石或莓果丛采集");
    } else if (tool === "water") {
      showHint("给花苗浇水，点池塘可以补水");
    } else if (tool === "plant") {
      showHint("点一块空草地种下树莓苗");
    } else {
      showHint("选好物品，再点一块空草地");
      toggleBuildTray(true);
    }
    renderBuildItems();
    saveState();
  }

  function toggleBuildTray(open) {
    const shouldOpen = Boolean(open);
    dom.buildTray.classList.toggle("open", shouldOpen);
    dom.buildTray.setAttribute("aria-hidden", String(!shouldOpen));
    renderBuildItems();
  }

  function renderBuildItems() {
    dom.buildItems.innerHTML = "";
    Object.entries(BUILD_ITEMS).forEach(([type, definition]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `build-item${state.buildSelected === type ? " selected" : ""}${canAfford(definition.cost) ? "" : " locked"}`;
      button.setAttribute("aria-pressed", String(state.buildSelected === type));
      button.setAttribute("aria-label", `${definition.label}，${formatCost(definition.cost)}`);
      button.innerHTML = `
        <span class="build-glyph ${type}" aria-hidden="true"></span>
        <strong>${definition.label}</strong>
        <span class="build-cost">${Object.entries(definition.cost)
          .map(
            ([resource, amount]) =>
              `<i class="${state.inventory[resource] < amount ? "short" : ""}">${resourceLabel(resource)} ${amount}</i>`,
          )
          .join("")}</span>
      `;
      button.dataset.buildType = type;
      button.addEventListener("click", () => {
        if (!canAfford(definition.cost)) {
          showToast("材料还不够，先去岛上采集吧", "info");
          playTone(180, 0.08, "sine", 0.015);
          return;
        }
        state.buildSelected = type;
        renderBuildItems();
        showHint(`把${definition.label}放到空草地上`);
        playTone(520, 0.07, "triangle", 0.018);
      });
      dom.buildItems.appendChild(button);
    });
  }

  function formatCost(cost) {
    return Object.entries(cost)
      .map(([resource, amount]) => `${resourceLabel(resource)} ${amount}`)
      .join("，");
  }

  function resourceLabel(resource) {
    return { wood: "木", stone: "石", berry: "莓", bloom: "花" }[resource] || resource;
  }

  function showHint(text) {
    dom.hintText.textContent = text;
    dom.hintBubble.classList.remove("hidden");
    clearTimeout(showHint.timeout);
    showHint.timeout = setTimeout(() => {
      if (player.path.length === 0) dom.hintBubble.classList.add("hidden");
    }, 4600);
  }

  function hideHint() {
    dom.hintBubble.classList.add("hidden");
  }

  function showToast(message, kind = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${kind}`;
    const iconMap = {
      info: "✦",
      berry: "●",
      resident: "♥",
      reward: "◆",
      stone: "◆",
    };
    toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${iconMap[kind] || "✦"}</span><span>${message}</span>`;
    dom.toastStack.appendChild(toast);
    toastCounter += 1;
    const currentId = toastCounter;
    while (dom.toastStack.children.length > 3) {
      dom.toastStack.firstElementChild.remove();
    }
    setTimeout(() => {
      if (!toast.isConnected) return;
      toast.classList.add("out");
      setTimeout(() => toast.remove(), 260);
    }, 3000 + Math.min(currentId * 40, 300));
  }

  function updateHud() {
    const weather = getWeather();
    dom.dayNumber.textContent = String(state.day);
    const hours = Math.floor(state.clock / 60) % 24;
    const minutes = Math.floor(state.clock % 60);
    dom.clockText.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    dom.weatherText.textContent = weather.label;
    dom.weatherIcon.textContent = weather.icon;
    dom.wood.textContent = String(state.inventory.wood);
    dom.stone.textContent = String(state.inventory.stone);
    dom.berry.textContent = String(state.inventory.berry);
    dom.bloom.textContent = String(state.inventory.bloom);
    dom.coin.textContent = String(state.coins);
    dom.level.textContent = String(state.level);
    dom.energyBar.style.width = `${state.energy}%`;
    dom.waterBadge.textContent = String(state.inventory.water);
    dom.seedBadge.textContent = String(state.inventory.seeds);

    const quest = activeQuest();
    if (quest) {
      const progress = Math.min(quest.target, state.stats[quest.stat] || 0);
      dom.questTitle.textContent = quest.title;
      dom.questProgress.textContent = `${progress} / ${quest.target}`;
      dom.questBar.style.width = `${(progress / quest.target) * 100}%`;
      dom.residentDot.classList.toggle("visible", state.completedQuests.length < QUESTS.length);
    } else {
      dom.questTitle.textContent = "晴空岛已经很热闹了";
      dom.questProgress.textContent = `${state.completedQuests.length} / ${QUESTS.length}`;
      dom.questBar.style.width = "100%";
      dom.residentDot.classList.add("visible");
    }
    updateJournal();
    renderBuildItems();
    $$(".tool").forEach((button) => {
      const active = button.dataset.tool === state.tool;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function updateJournal() {
    const rating = calculateRating();
    dom.ratingValue.textContent = String(rating.score);
    dom.ratingTitle.textContent = rating.title;
    dom.ratingHint.textContent = rating.hint;
    dom.residentList.innerHTML = "";

    Object.entries(RESIDENTS).forEach(([id, resident]) => {
      const unlocked = state.residents[id];
      const row = document.createElement("div");
      row.className = `resident${unlocked ? "" : " locked"}`;
      row.innerHTML = `
        <div class="resident-avatar ${id}" aria-hidden="true">${residentIcon(id)}</div>
        <div class="resident-copy">
          <strong>${unlocked ? resident.name : "还没有遇见"}</strong>
          <span>${unlocked ? resident.line : resident.condition}</span>
        </div>
        <div class="resident-mood">
          <span class="mood-hearts">${unlocked ? "♥♥♥" : "· · ·"}</span>
          <span>${unlocked ? "已入住" : "未入住"}</span>
        </div>
      `;
      dom.residentList.appendChild(row);
    });
  }

  function calculateRating() {
    const built =
      state.stats.benches +
      state.stats.flowerbeds +
      state.stats.lanterns +
      state.stats.swings +
      state.stats.grownPlants;
    const unlocked = Object.values(state.residents).filter(Boolean).length;
    const score = clamp(12 + built * 8 + unlocked * 12 + state.stats.plantings * 2, 12, 100);
    if (score >= 88) {
      return {
        score,
        title: "让朋友舍不得走",
        hint: "这里有花香、树荫和能吹风的位置，已经像真正的家了。",
      };
    }
    if (score >= 64) {
      return {
        score,
        title: "热闹起来了",
        hint: "再多添些休憩设施，岛上的日子会更从容。",
      };
    }
    if (score >= 42) {
      return {
        score,
        title: "有生活气的小岛",
        hint: "花草开始成形，试着给朋友搭一张能坐下的长椅。",
      };
    }
    return {
      score,
      title: "刚刚开始发芽",
      hint: "添些花草和休憩设施，朋友们就会来。",
    };
  }

  function residentIcon(id) {
    if (id === "pikachu") {
      return `<svg viewBox="0 0 48 48"><path d="M14 18 7 3l12 8M34 18l7-15-12 8" fill="#f1c74b"/><ellipse cx="24" cy="29" rx="15" ry="14" fill="#f5ce54"/><circle cx="18" cy="26" r="3" fill="#de6a68"/><circle cx="30" cy="26" r="3" fill="#de6a68"/><circle cx="19" cy="19" r="1.7" fill="#30393e"/><circle cx="29" cy="19" r="1.7" fill="#30393e"/><path d="m34 31 9-7-4 10 6 1-12 7" fill="#f3ca4d"/></svg>`;
    }
    if (id === "eevee") {
      return `<svg viewBox="0 0 48 48"><path d="M13 20 6 4l14 10M35 20 42 3 28 14" fill="#a9784f"/><ellipse cx="24" cy="29" rx="14" ry="14" fill="#b98659"/><ellipse cx="24" cy="30" rx="9" ry="10" fill="#f0d8b5"/><circle cx="19" cy="23" r="1.7" fill="#363934"/><circle cx="29" cy="23" r="1.7" fill="#363934"/><path d="M39 31c5 0 7 6 2 8-3 1-6-2-6-4" fill="#b98659"/></svg>`;
    }
    return `<svg viewBox="0 0 48 48"><ellipse cx="24" cy="30" rx="17" ry="14" fill="#65a184"/><ellipse cx="19" cy="18" rx="13" ry="11" fill="#438f76"/><ellipse cx="19" cy="14" rx="7" ry="6" fill="#8dbb8f"/><ellipse cx="24" cy="32" rx="11" ry="10" fill="#7fb19a"/><circle cx="18" cy="27" r="2.5" fill="#df6b6e"/><circle cx="30" cy="27" r="2.5" fill="#df6b6e"/><circle cx="20" cy="22" r="1.8" fill="#eef4ee"/><circle cx="28" cy="22" r="1.8" fill="#eef4ee"/></svg>`;
  }

  function toggleJournal(force) {
    const open = force === undefined ? !dom.journal.classList.contains("open") : force;
    dom.journal.classList.toggle("open", open);
    dom.journal.setAttribute("aria-hidden", String(!open));
    dom.journalButton.setAttribute("aria-expanded", String(open));
    if (open) {
      updateJournal();
      playTone(420, 0.06, "sine", 0.012);
    }
  }

  function toggleSound() {
    audioEnabled = !audioEnabled;
    dom.soundButton.setAttribute("aria-pressed", String(audioEnabled));
    dom.soundButton.setAttribute("aria-label", audioEnabled ? "关闭声音" : "打开声音");
    if (audioEnabled) {
      ensureAudio();
      playTone(560, 0.08, "sine", 0.018);
    }
  }

  function ensureAudio() {
    if (!audioEnabled) return null;
    try {
      if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        audioContext = new AudioContextClass();
      }
      if (audioContext.state === "suspended") audioContext.resume();
      return audioContext;
    } catch {
      return null;
    }
  }

  function playTone(frequency, duration, type = "sine", volume = 0.02) {
    const audio = ensureAudio();
    if (!audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  function bindEvents() {
    let pointerStart = null;
    let lastPointerActivation = 0;
    let lastCanvasActivation = 0;

    const activateCanvas = (clientX, clientY, surface = canvas) => {
      const now = performance.now();
      if (now - lastCanvasActivation < 260) return;
      lastCanvasActivation = now;
      if (dom.welcome && !dom.welcome.classList.contains("dismissed")) return;
      if (dom.journal.classList.contains("open")) return;
      const rect = surface.getBoundingClientRect();
      const tile = screenToTile(clientX - rect.left, clientY - rect.top);
      canvas.dataset.lastTile = tile ? `${tile.x},${tile.y}` : "none";
      if (tile) handleTileTap(tile);
    };

    [canvas, fallbackCanvas].forEach((surface) => {
      surface.addEventListener("pointerdown", (event) => {
        pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
        ensureAudio();
      });
      surface.addEventListener("pointerup", (event) => {
        if (!pointerStart) return;
        const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
        const elapsed = performance.now() - pointerStart.time;
        pointerStart = null;
        if (moved > 15 || elapsed > 850) return;
        lastPointerActivation = performance.now();
        activateCanvas(event.clientX, event.clientY, surface);
      });
      surface.addEventListener("pointercancel", () => {
        pointerStart = null;
      });
      surface.addEventListener("click", (event) => {
        if (performance.now() - lastPointerActivation < 500) return;
        activateCanvas(event.clientX, event.clientY, surface);
      });
    });

    $$(".tool").forEach((button) => {
      button.addEventListener("click", () => {
        ensureAudio();
        setTool(button.dataset.tool);
        playTone(470, 0.06, "triangle", 0.016);
      });
    });

    dom.journalButton.addEventListener("click", () => toggleJournal());
    dom.journalClose.addEventListener("click", () => toggleJournal(false));
    dom.buildClose.addEventListener("click", () => {
      state.buildSelected = null;
      toggleBuildTray(false);
      showHint("选好物品，再点一块空草地");
    });
    dom.questAction.addEventListener("click", trackQuest);
    dom.soundButton.addEventListener("click", toggleSound);
    dom.startGame.addEventListener("click", () => {
      ensureAudio();
      dom.welcome.classList.add("dismissed");
      state.started = true;
      saveState();
      showHint("先点一下地面，再选择采集工具");
      setTimeout(() => showToast("岛上的第一份委托是采 3 次树莓", "berry"), 450);
      playTone(523, 0.12, "sine", 0.02);
      setTimeout(() => playTone(659, 0.18, "sine", 0.018), 110);
    });

    window.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLInputElement) return;
      if (["1", "2", "3", "4"].includes(event.key)) {
        setTool(["gather", "water", "plant", "build"][Number(event.key) - 1]);
        return;
      }
      if (event.key.toLowerCase() === "j") {
        toggleJournal();
        return;
      }
      if (event.key === "Escape") {
        toggleJournal(false);
        toggleBuildTray(false);
        return;
      }
      const moves = {
        ArrowUp: [0, -1],
        w: [0, -1],
        ArrowDown: [0, 1],
        s: [0, 1],
        ArrowLeft: [-1, 0],
        a: [-1, 0],
        ArrowRight: [1, 0],
        d: [1, 0],
      };
      const move = moves[event.key] || moves[event.key.toLowerCase()];
      if (move) {
        event.preventDefault();
        const target = { x: Math.round(player.x) + move[0], y: Math.round(player.y) + move[1] };
        if (isPassable(target.x, target.y)) walkTo(target.x, target.y);
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) saveState();
    });
    window.addEventListener("pagehide", saveState);
    window.addEventListener("resize", resizeCanvas);
    window.visualViewport?.addEventListener("resize", resizeCanvas);
  }

  function init() {
    resizeCanvas();
    let scene3dReady = false;
    if (window.SunnyIsle3D) {
      scene3dReady = window.SunnyIsle3D.init({
        canvas,
        width,
        height,
        state,
        player,
        worldObjects,
        residents: RESIDENTS,
        worldWidth: WORLD_W,
        worldHeight: WORLD_H,
        tileType,
        pixelMode,
        previewResidents: pixelMode,
      });
    }
    if (scene3dReady) {
      fallbackCanvas.style.opacity = "0";
    } else {
      canvas.style.display = "none";
    }
    bindEvents();
    setTool(state.tool || "gather");
    updateHud();
    if (state.started || quickPlay) {
      dom.welcome.classList.add("dismissed");
      showHint(pixelMode ? "比例样片：3D 地图 + GBA 像素角色" : "欢迎回来，岛上的朋友都在等你");
    } else {
      dom.hintBubble.classList.add("hidden");
    }
    requestAnimationFrame((now) => {
      lastFrame = now;
      tick(now);
    });
  }

  init();
})();
