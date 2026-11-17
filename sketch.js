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

function defaultState() {
  return { asymmetry: 0, sizeGrowth: 1, glowGrowth: 0, colourGrowth: 0 };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.asymmetry === 'number') asymmetry = s.asymmetry;
    if (typeof s.sizeGrowth === 'number') sizeGrowth = s.sizeGrowth;
    if (typeof s.glowGrowth === 'number') glowGrowth = s.glowGrowth;
    if (typeof s.colourGrowth === 'number') colourGrowth = s.colourGrowth;
  } catch (e) {}
}

function saveState() {
  try {
    const s = { asymmetry, sizeGrowth, glowGrowth, colourGrowth };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (e) {}
}

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  background(0);
  lockGestures();
  angleMode(DEGREES);
  for (let i = 0; i < BODY_POINTS; i++) disp[i] = 0;
  loadState();
  setShakeThreshold(SHAKE_THRESHOLD);

  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: APP_NAME,
    shared: {},
    me: { traits: { asymmetry, sizeGrowth, glowGrowth, colourGrowth } }
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

  // Glow
  const glowAlpha = 18 + glowGrowth * 120 + burst * 80;
  noStroke();
  fill(90, 200 + colourGrowth * 40, 255, constrain(glowAlpha * 0.6, 0, 80));
  circle(cx, cy, baseR * 1.8 * pulse * 2);
  fill(110, 215 + colourGrowth * 30, 255, constrain(glowAlpha, 0, 120));
  circle(cx, cy, baseR * 1.4 * pulse * 2);

  // Breathing noisy blob body with asymmetry (smooth radii)
  const radii = [];
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    const n = noise(cos(a) * 1.4 + t, sin(a) * 1.4 + t);
    let r = baseR * pulse * (0.82 + 0.3 * n) + disp[i];
    r *= 1 + asymmetry * 0.15 * sin(a);
    radii.push(r);
  }
  // Smooth radii (wraparound average of neighbours)
  for (let pass = 0; pass < 2; pass++) {
    const prev = radii.slice();
    for (let i = 0; i < BODY_POINTS; i++) {
      const a = prev[(i - 1 + BODY_POINTS) % BODY_POINTS];
      const b = prev[i];
      const c = prev[(i + 1) % BODY_POINTS];
      radii[i] = (a + b * 2 + c) / 4;
    }
  }
  fill(160 + colourGrowth * 60, 235, 255, 220);
  noStroke();
  beginShape();
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    vertex(cx + cos(a) * radii[i], cy + sin(a) * radii[i]);
  }
  endShape(CLOSE);
}

function deviceShaken() {
  burst = 1;
  glowGrowth = min(1, glowGrowth + SHAKE_GROWTH);
  colourGrowth = min(1, colourGrowth + SHAKE_GROWTH * 0.8);
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
    for (const t of touches) applyTouchReaction(t.x, t.y, 1);
  } else {
    applyTouchReaction(mouseX, mouseY, 1);
  }
  return false;
}

function mouseDragged() {
  if (touches && touches.length > 0) {
    for (const t of touches) applyTouchReaction(t.x, t.y, 1);
  } else {
    applyTouchReaction(mouseX, mouseY, 0.5);
  }
  // Drag also grows asymmetry a bit
  asymmetry = min(0.8, asymmetry + GROWTH_RATE * 0.2);
  return false;
}

function mouseReleased() {
  keepScreenOn();
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
