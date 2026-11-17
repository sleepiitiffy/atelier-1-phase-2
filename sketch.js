// Tunables — change these to tune the sketch.
const SHARE_HOST = 'https://p5-phone-share.p5-phone-share.workers.dev';
const ROOM = 'traces-of-light';
const APP_NAME = 'traces-of-light';

const CREATURE_SCALE = 0.2; // body radius as a fraction of min(width, height)
const BODY_POINTS = 160;     // points around the body (higher = smoother)
const IDLE_SPEED = 0.006;    // how fast the body drifts and breathe
const REACTION_STRENGTH = 1.2; // how much a touch pushes the blob
const SETTLE_SPEED = 0.08;     // how fast the wobble settles back (0..1)
const TILT_FORCE = 0.15;       // how much tilt moves the creature
const TILT_GROWTH = 0.0004;    // asymmetry growth from tilt
const SHAKE_THRESHOLD = 25;    // deviceShaken threshold
const SHAKE_GROWTH = 0.02;     // growth from shake
const GROWTH_RATE = 0.001;     // permanent growth rate
const SAVE_INTERVAL = 2000;    // ms between saves to localStorage
const STORAGE_KEY = 'traces-of-light-creature-v1';

let disp = []; // displacement per body point (radius offset)
let driftX = 0, driftY = 0;
let velX = 0, velY = 0;
let asymmetry = 0;       // permanent asymmetry (0..)
let sizeGrowth = 1;      // permanent size multiplier
let glowGrowth = 0;      // added glow
let colourGrowth = 0;    // colour complexity shift
let burst = 0;           // shake burst 0..1
let lastSave = 0;
let hueBase = 30, hueRange = 30, satBase = 25, briBase = 75;
let DRIFT_SPEED = 0.0015, HUE_RANGE = 30;
const FEATURE_GROWTH = 0.12;
const MAX_FEATURES = 18;
const TENDRIL_LENGTH = 1.2;
let features = []; // {type:'tendril', angle, growth, offset}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (typeof s.asymmetry === 'number') asymmetry = s.asymmetry;
    if (typeof s.sizeGrowth === 'number') sizeGrowth = s.sizeGrowth;
    if (typeof s.glowGrowth === 'number') glowGrowth = s.glowGrowth;
    if (typeof s.colourGrowth === 'number') colourGrowth = s.colourGrowth;
    if (typeof s.hueBase === 'number') hueBase = s.hueBase;
    if (typeof s.hueRange === 'number') hueRange = s.hueRange;
    if (typeof s.satBase === 'number') satBase = s.satBase;
    if (typeof s.briBase === 'number') briBase = s.briBase;
    if (Array.isArray(s.features)) features = s.features.filter(f => f && typeof f.angle === 'number');
    return true;
  } catch (e) {}
  return false;
}

function saveState() {
  try {
    const s = { asymmetry, sizeGrowth, glowGrowth, colourGrowth, hueBase, hueRange, satBase, briBase, features };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    if (window.shareConnected && typeof shareSetMe === 'function') {
      shareSetMe('traits', { asymmetry, sizeGrowth, glowGrowth, colourGrowth, hueBase });
    }
  } catch (e) {}
}

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 255);
  background(0);
  lockGestures();
  angleMode(DEGREES);
  for (let i = 0; i < BODY_POINTS; i++) disp[i] = 0;
  const had = loadState();
  if (!had) {
    hueBase = random(280, 340); // soft magenta/lavender/pink range from refs
    hueRange = random(20, 50);
    satBase = random(18, 40);
    briBase = random(55, 80);
  }
  setShakeThreshold(SHAKE_THRESHOLD);

  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: APP_NAME,
    shared: {},
    me: { traits: { asymmetry, sizeGrowth, glowGrowth, colourGrowth, hueBase, hueRange, satBase, briBase } }
  });

  enablePermissionsTap(['gyro', 'share'], 'Tap to enable motion and join the room');
}

function draw() {
  background(0);

  // Tilt control
  if (window.sensorsEnabled) {
    const tx = constrain(rotationY, -45, 45);
    const ty = constrain(rotationX, -45, 45);
    velX += map(tx, -45, 45, -TILT_FORCE, TILT_FORCE);
    velY += map(ty, -45, 45, -TILT_FORCE, TILT_FORCE);
    asymmetry = min(0.8, asymmetry + abs(tx) * TILT_GROWTH * 0.01 + abs(ty) * TILT_GROWTH * 0.01);
  }

  velX *= 0.92;
  velY *= 0.92;
  driftX += velX;
  driftY += velY;
  const maxDrift = min(width, height) * 0.15;
  driftX = constrain(driftX, -maxDrift, maxDrift);
  driftY = constrain(driftY, -maxDrift, maxDrift);

  // Settle displacements back toward 0.
  for (let i = 0; i < BODY_POINTS; i++) {
    disp[i] = lerp(disp[i], 0, SETTLE_SPEED);
  }
  burst *= 0.92;

  // Save periodically
  if (millis() - lastSave > SAVE_INTERVAL) {
    saveState();
    lastSave = millis();
  }

  const cx = width / 2 + driftX;
  const cy = height / 2 + driftY;
  const baseR = min(width, height) * CREATURE_SCALE * sizeGrowth;
  const t = frameCount * IDLE_SPEED;
  const pulse = 1 + 0.03 * sin(frameCount * 0.02);

  // Palette stays stable unless changed by interactions
  const hueNow = hueBase % 360;
  const satNow = constrain(satBase + colourGrowth * 10, 0, 100);
  const briNow = constrain(briBase + burst * 10, 0, 100);

  // Soft layered glow (ref-like translucency)
  const glowAlpha = 8 + glowGrowth * 30 + burst * 20;
  noStroke();
  fill((hueNow + 40) % 360, satNow * 0.3, briNow + 10, constrain(glowAlpha * 0.4, 0, 30));
  circle(cx + 6, cy - 4, baseR * 1.9 * pulse * 2);
  fill((hueNow + 20) % 360, satNow * 0.4, briNow, constrain(glowAlpha * 0.6, 0, 45));
  circle(cx - 4, cy + 6, baseR * 1.6 * pulse * 2);
  fill(hueNow, satNow * 0.5, briNow, constrain(glowAlpha, 0, 60));
  circle(cx, cy, baseR * 1.3 * pulse * 2);

  // Breathing noisy blob body with asymmetry (smooth radii)
  const radii = [];
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    const n = noise(cos(a) * 1.4 + t, sin(a) * 1.4 + t);
    let r = baseR * pulse * (0.82 + 0.3 * n) + disp[i];
    r *= 1 + asymmetry * 0.15 * sin(a);
    radii.push(r);
  }
  for (let pass = 0; pass < 2; pass++) {
    const prev = radii.slice();
    for (let i = 0; i < BODY_POINTS; i++) {
      const a = prev[(i - 1 + BODY_POINTS) % BODY_POINTS];
      const b = prev[i];
      const c = prev[(i + 1) % BODY_POINTS];
      radii[i] = (a + b * 2 + c) / 4;
    }
  }
  // Layered translucent blobs for fluid look
  fill((hueNow + 10) % 360, satNow * 0.5, briNow * 0.9, 90);
  noStroke();
  beginShape();
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    vertex(cx + cos(a) * radii[i] + 8, cy + sin(a) * radii[i] - 6);
  }
  endShape(CLOSE);
  fill(hueNow, satNow * 0.55, briNow, 140);
  beginShape();
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    vertex(cx + cos(a) * radii[i] - 5, cy + sin(a) * radii[i] + 4);
  }
  endShape(CLOSE);
  fill((hueNow - 10 + 360) % 360, satNow * 0.45, briNow + 5, 120);
  beginShape();
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    vertex(cx + cos(a) * radii[i], cy + sin(a) * radii[i]);
  }
  endShape(CLOSE);

  // Soft internal features (subtle, not virus-like)
  for (const f of features) {
    const ang = f.angle + (f.offset || 0) * 30;
    const idx = Math.floor(((ang % 360 + 360) % 360) / 360 * BODY_POINTS) % BODY_POINTS;
    const r0 = (radii[idx] || baseR) * 0.6;
    const hMuted = (hueNow + 30) % 360;
    const sMuted = satNow * 0.3;
    const bMuted = constrain(briNow * 1.1, 50, 95);
    if (f.type === 'pearl') {
      const pr = baseR * 0.03 * (0.2 + (f.growth || 0));
      fill(hMuted, sMuted, bMuted, 30);
      noStroke();
      circle(cx + cos(ang) * r0, cy + sin(ang) * r0, pr * 2);
    }
    // tendrils/membranes hidden for a softer look
  }
}

function deviceShaken() {
  burst = 1;
  glowGrowth = min(1, glowGrowth + SHAKE_GROWTH);
  colourGrowth = min(1, colourGrowth + SHAKE_GROWTH * 0.8);
  if (features.length < MAX_FEATURES) {
    features.push({ type: 'membrane', angle: random(360), growth: 0.4, offset: random(-0.2, 0.2) });
  }
}

function applyTouchReaction(tx, ty, strength) {
  const cx = width / 2 + driftX;
  const cy = height / 2 + driftY;
  const baseR = min(width, height) * CREATURE_SCALE * sizeGrowth;
  const maxPush = baseR * 0.35;
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    const px = cx + cos(a) * baseR;
    const py = cy + sin(a) * baseR;
    const d = dist(tx, ty, px, py);
    const influence = map(d, 0, baseR * 1.2, strength, 0, true);
    disp[i] += max(-maxPush, min(maxPush, influence * REACTION_STRENGTH));
  }
  // Tiny permanent growth from touch/drag
  sizeGrowth = min(1.25, sizeGrowth + GROWTH_RATE * strength);
}

function mousePressed() {
  if (touches && touches.length > 0) {
    for (const t of touches) { applyTouchReaction(t.x, t.y, 1); growPearlNear(t.x, t.y); }
  } else {
    applyTouchReaction(mouseX, mouseY, 1);
    growPearlNear(mouseX, mouseY);
  }
  return false;
}

function growTendrilNear(tx, ty) {
  const cx = width / 2 + driftX;
  const cy = height / 2 + driftY;
  const ang = (atan2(ty - cy, tx - cx) * 180 / PI + 360) % 360;
  let best = -1, bestD = 999;
  for (let i = 0; i < features.length; i++) {
    if (features[i].type !== 'tendril') continue;
    let d = abs(features[i].angle - ang);
    if (d > 180) d = 360 - d;
    if (d < bestD) { bestD = d; best = i; }
  }
  if (best >= 0 && bestD < 30) {
    features[best].growth = min(1.5, features[best].growth + FEATURE_GROWTH * 0.5);
  } else if (features.length < MAX_FEATURES) {
    features.push({ type: 'tendril', angle: ang + random(-8, 8), growth: 0.25, offset: random(-0.2, 0.2) });
  }
}
function growPearlNear(tx, ty) {
  const cx = width / 2 + driftX;
  const cy = height / 2 + driftY;
  const ang = (atan2(ty - cy, tx - cx) * 180 / PI + 360) % 360;
  if (features.length < MAX_FEATURES) {
    features.push({ type: 'pearl', angle: ang + random(-6, 6), growth: 0.3, offset: random(-0.15, 0.15) });
  }
}

function mouseDragged() {
  if (touches && touches.length > 0) {
    for (const t of touches) {
      applyTouchReaction(t.x, t.y, 0.5);
      growTendrilNear(t.x, t.y);
    }
  } else {
    applyTouchReaction(mouseX, mouseY, 0.5);
    growTendrilNear(mouseX, mouseY);
  }
  asymmetry = min(0.8, asymmetry + GROWTH_RATE * 0.2);
  return false;
}

function mouseReleased() {
  keepScreenOn();
  return false;
}

function keyPressed() {
  if (!window.sensorsEnabled) {
    if (keyCode === LEFT_ARROW) velX -= TILT_FORCE * 2;
    if (keyCode === RIGHT_ARROW) velX += TILT_FORCE * 2;
    if (keyCode === UP_ARROW) velY -= TILT_FORCE * 2;
    if (keyCode === DOWN_ARROW) velY += TILT_FORCE * 2;
    if (key === ' ') deviceShaken();
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
