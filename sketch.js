// Tunables — change these to tune the sketch.
const SHARE_HOST = 'https://p5-phone-share.p5-phone-share.workers.dev';
const ROOM = 'traces-of-light';
const APP_NAME = 'traces-of-light';
// If the QR should point at a public address (GitHub Pages, or the npm run phone
// tunnel), put it here. Leave '' to use whatever address the laptop is showing.
// A QR that encodes localhost will NOT work on a phone.
const JOIN_URL = 'https://sleepiitiffy.github.io/atelier-1-phase-2/';

const CREATURE_SCALE = 0.2;
const BODY_POINTS = 90;
const IDLE_SPEED = 0.004;       // slower idle breathing
const REACTION_STRENGTH = 1.8;  // how far a touch deforms the body
const SETTLE_SPEED = 0.07;      // lower = wobble lasts longer
const TOUCH_FLASH = 0.5;        // brightness kick on touch
const DRAG_LURCH = 0.04;        // how much a drag shoves the whole creature
const LOBE_GROWTH = 0.02;       // permanent bump added by a touch
const LOBE_WIDTH = 46;          // angular width of that bump (degrees)
const LOBE_MAX = 0.22;          // cap on a single bump
const PINCH_GROWTH = 0.0012;    // size change per pixel of pinch
const PINCH_MIN = 0.7;          // smallest a pinch can make the creature
const PINCH_MAX = 1.25;         // largest a pull can make the creature
const SHRINK_DELAY = 4000;      // ms of no interaction before it eases back
const SHRINK_SPEED = 0.002;     // gentle easing back to starting size
const TILT_FORCE = 0.15;
const TILT_GROWTH = 0.0004;
const SHAKE_THRESHOLD = 25;
const SHAKE_GROWTH = 0.02;
const GROWTH_RATE = 0.001;
const SAVE_INTERVAL = 2000;
const SEND_INTERVAL = 50;
const STORAGE_KEY = 'traces-of-light-creature-v1';
const BIG_SCALE = 0.26;
const SATELLITE_SCALE = 0.08;
const MAX_SATELLITES = 8;
const FEATURE_GROWTH = 0.12;
const MAX_FEATURES = 18;
const TENDRIL_LENGTH = 1.2;
const KEY_TILT_FORCE = 0.3;
const KEY_SHAKE = true;
const TEX_SEED = 7;        // texture is generated once from this seed, so it never flickers
const TEX_SPECKS = 55;     // granular dots inside the body
const TEX_RIBS = 12;       // comb-like ridges from reference 1
const TEX_CHECKERS = 9;    // checker beads from reference 1
const TEX_SHARDS = 4;      // translucent facets
const TEX_CLUSTERS = 3;    // clustered pearl-like growths

let disp = [];
let driftX = 0, driftY = 0;
let velX = 0, velY = 0;
let asymmetry = 0;
let sizeGrowth = 1;
let glowGrowth = 0;
let colourGrowth = 0;
let burst = 0;
let lastSave = 0;
let hueBase = 30, satBase = 25, briBase = 75;
let features = [];
let specks = [], ribs = [], checkers = [], shards = [], clusters = [];
let ripples = [];
let pinchDist = 0;
let lastInteraction = 0;

// Generate the texture once, deterministically, so it stays put frame to frame.
function buildTexture() {
  randomSeed(TEX_SEED);
  specks = [];
  for (let i = 0; i < TEX_SPECKS; i++) {
    specks.push({
      ang: random(360),
      rad: sqrt(random()) * 0.78,
      size: random(0.006, 0.02),
      tone: floor(random(3)),
      alpha: random(18, 60)
    });
  }
  const ribBase = random(360);
  ribs = [];
  for (let i = 0; i < TEX_RIBS; i++) {
    ribs.push({ ang: ribBase + i * random(7, 12), len: random(0.12, 0.3) });
  }
  const checkBase = random(360);
  checkers = [];
  for (let i = 0; i < TEX_CHECKERS; i++) {
    checkers.push({ ang: checkBase + i * 6, on: i % 2 === 0 });
  }
  shards = [];
  for (let i = 0; i < TEX_SHARDS; i++) {
    shards.push({ ang: random(360), size: random(0.12, 0.22) });
  }
  clusters = [];
  for (let i = 0; i < TEX_CLUSTERS; i++) {
    const beads = [];
    const n = floor(random(4, 8));
    for (let j = 0; j < n; j++) {
      beads.push({ x: random(-1, 1), y: random(-1, 1), r: random(0.5, 1.1) });
    }
    clusters.push({ ang: random(360), rad: random(0.35, 0.6), beads });
  }
  randomSeed(Math.floor(Math.random() * 1e9));
}

// Radius of the body at a given angle, interpolated from the smoothed radii.
function radiusAt(radii, ang) {
  const f = (((ang % 360) + 360) % 360) / 360 * BODY_POINTS;
  const i = Math.floor(f);
  const j = (i + 1) % BODY_POINTS;
  return lerp(radii[i], radii[j], f - i);
}

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
    if (typeof s.satBase === 'number') satBase = s.satBase;
    if (typeof s.briBase === 'number') briBase = s.briBase;
    if (Array.isArray(s.features)) features = s.features.filter(f => f && typeof f.angle === 'number');
    return true;
  } catch (e) {}
  return false;
}

// Features travel as a flat array of [typeCode, angle, growth] triples.
function featuresToArray() {
  const arr = [];
  for (const f of features) {
    const code = f.type === 'tendril' ? 0 : f.type === 'pearl' ? 1 : f.type === 'membrane' ? 2 : 3;
    arr.push(code, Math.round(f.angle * 10) / 10, Math.round((f.growth || 0) * 100) / 100);
  }
  return arr;
}

function featuresFromArray(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (let i = 0; i + 2 < arr.length; i += 3) {
    out.push({
      type: arr[i] === 0 ? 'tendril' : arr[i] === 1 ? 'pearl' : arr[i] === 2 ? 'membrane' : 'lobe',
      angle: arr[i + 1],
      growth: arr[i + 2]
    });
  }
  return out;
}

function saveState() {
  try {
    const s = { asymmetry, sizeGrowth, glowGrowth, colourGrowth, hueBase, satBase, briBase, features };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    if (window.shareConnected && typeof shareSetMe === 'function') {
      shareSetMe('traits', {
        hueBase, satBase, briBase, sizeGrowth, asymmetry, glowGrowth, colourGrowth
      });
      shareSetMe('features', featuresToArray());
    }
  } catch (e) {}
}

// A guest entry in `guests` IS that phone's me object (with id).
function readGuest(g) {
  if (!g) return null;
  const t = g.traits;
  if (!t) return null;
  return {
    h: typeof t.hueBase === 'number' ? t.hueBase : hueBase,
    s: typeof t.satBase === 'number' ? t.satBase : satBase,
    b: typeof t.briBase === 'number' ? t.briBase : briBase,
    sg: typeof t.sizeGrowth === 'number' ? t.sizeGrowth : 1,
    asym: typeof t.asymmetry === 'number' ? t.asymmetry : 0,
    feats: featuresFromArray(g.features)
  };
}

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 255);
  background(0);
  lockGestures();
  angleMode(DEGREES);
  for (let i = 0; i < BODY_POINTS; i++) disp[i] = 0;
  buildTexture();
  const had = loadState();
  if (!had) {
    hueBase = random(280, 340);
    satBase = random(18, 40);
    briBase = random(55, 80);
  }
  setShakeThreshold(SHAKE_THRESHOLD);

  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: APP_NAME,
    shared: {},
    sendInterval: SEND_INTERVAL,
    me: {
      traits: { hueBase, satBase, briBase, sizeGrowth, asymmetry, glowGrowth, colourGrowth },
      features: []
    }
  });

  enablePermissionsTap(['gyro', 'share'], 'Tap to enable motion and join the room');

  // Room and host are fixed in this sketch, so a phone only needs the page URL.
  // Keep the QR short (no share params) and large so it scans reliably.
  if (typeof showDesktopQr === 'function') {
    const opts = { share: false, size: 260, label: 'Scan to join' };
    if (JOIN_URL) {
      opts.url = JOIN_URL;
    } else if (window.location && /^https?:$/.test(window.location.protocol)) {
      opts.url = window.location.href.split('?')[0];
    }
    showDesktopQr(opts);
  }
}

function drawTexture(cx, cy, baseR, radii, h, s, b) {
  push();
  // Granular speckles scattered inside the body.
  noStroke();
  for (const p of specks) {
    const r = radiusAt(radii, p.ang) * p.rad;
    const x = cx + cos(p.ang) * r;
    const y = cy + sin(p.ang) * r;
    const d = baseR * p.size * 2;
    if (p.tone === 0) fill(h, s * 0.5, b * 0.45, p.alpha);
    else if (p.tone === 1) fill(h, s * 0.25, 100, p.alpha * 0.8);
    else fill((h + 30) % 360, s * 0.6, b, p.alpha);
    circle(x, y, d);
  }

  // Comb-like ribs from reference 1: curved ridges running out toward the edge.
  noFill();
  for (const r0 of ribs) {
    stroke((h + 20) % 360, s * 0.4, b + 10, 55);
    strokeWeight(max(1, baseR * 0.012));
    beginShape();
    for (let k = 0; k <= 6; k++) {
      const f = k / 6;
      const a = r0.ang + sin(f * PI) * 6;
      const r = radiusAt(radii, a) * (0.45 + 0.5 * f * r0.len / 0.3);
      vertex(cx + cos(a) * r, cy + sin(a) * r);
    }
    endShape();
  }
  noStroke();

  // Checker beads from reference 1: alternating light/dark squares on a band.
  for (const c of checkers) {
    const r = radiusAt(radii, c.ang) * 0.6;
    const x = cx + cos(c.ang) * r;
    const y = cy + sin(c.ang) * r;
    push();
    translate(x, y);
    rotate(c.ang);
    const sz = baseR * 0.05;
    if (c.on) fill(h, s * 0.3, b * 0.4, 110);
    else fill(h, s * 0.2, 100, 120);
    rectMode(CENTER);
    rect(0, 0, sz, sz);
    pop();
  }

  // Translucent crystalline facets near the edge.
  for (const sh of shards) {
    const r = radiusAt(radii, sh.ang) * 0.72;
    const x = cx + cos(sh.ang) * r;
    const y = cy + sin(sh.ang) * r;
    const sz = baseR * sh.size;
    fill((h + 45) % 360, s * 0.35, b + 15, 28);
    triangle(x, y, x + cos(sh.ang - 20) * sz, y + sin(sh.ang - 20) * sz,
      x + cos(sh.ang + 20) * sz, y + sin(sh.ang + 20) * sz);
  }

  // Clustered pearl-like growths: little bunches of beads with highlights.
  for (const c of clusters) {
    const rr = radiusAt(radii, c.ang) * c.rad;
    const ox = cx + cos(c.ang) * rr;
    const oy = cy + sin(c.ang) * rr;
    for (const bead of c.beads) {
      const bx = ox + bead.x * baseR * 0.09;
      const by = oy + bead.y * baseR * 0.09;
      const d = baseR * 0.035 * bead.r;
      fill(h, s * 0.3, 100, 150);
      circle(bx, by, d);
      fill(0, 0, 100, 160);
      circle(bx - d * 0.2, by - d * 0.2, d * 0.3);
    }
  }
  pop();
}

function drawCreature(cx, cy, baseR, h, s, b, pulse, asym, tOffset, feats) {
  const t = (frameCount + tOffset) * IDLE_SPEED;
  const radii = [];
  const lobes = (feats || []).filter(f => f.type === 'lobe');
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    const n = noise(cos(a) * 2.2 + t * 1.5, sin(a) * 2.2 + t * 1.5);
    let r = baseR * pulse * (0.72 + 0.4 * n);
    r *= 1 + asym * 0.18 * sin(a * 1.3 + t * 5) + 0.035 * sin(a * 2.7 + t * 8);
    // Permanent lobes grown by touch, as smooth bumps.
    for (const L of lobes) {
      let da = abs(a - (L.angle % 360 + 360) % 360);
      if (da > 180) da = 360 - da;
      if (da < LOBE_WIDTH) {
        r += baseR * (L.growth || 0) * 0.35 * (1 + cos(PI * da / LOBE_WIDTH));
      }
    }
    radii.push(r);
  }
  for (let pass = 0; pass < 3; pass++) {
    const prev = radii.slice();
    for (let i = 0; i < BODY_POINTS; i++) {
      const a = prev[(i - 1 + BODY_POINTS) % BODY_POINTS];
      const b2 = prev[i];
      const c2 = prev[(i + 1) % BODY_POINTS];
      radii[i] = (a + b2 + c2) / 3;
    }
  }
  noStroke();
  fill((h + 10) % 360, s * 0.5, b * 0.9, 70);
  beginShape();
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    splineVertex(cx + cos(a) * radii[i] + 6, cy + sin(a) * radii[i] - 4);
  }
  endShape(CLOSE);
  fill(h, s * 0.55, b, 120);
  beginShape();
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    splineVertex(cx + cos(a) * radii[i] - 4, cy + sin(a) * radii[i] + 3);
  }
  endShape(CLOSE);
  fill((h - 10 + 360) % 360, s * 0.45, b + 5, 100);
  beginShape();
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    splineVertex(cx + cos(a) * radii[i], cy + sin(a) * radii[i]);
  }
  endShape(CLOSE);

  drawTexture(cx, cy, baseR, radii, h, s, b);

  // Soft internal features — subtle pearls, membranes and short tendrils
  const fl = feats || [];
  for (const f of fl) {
    const a = ((f.angle || 0) % 360 + 360) % 360;
    const idx = Math.floor(a / 360 * BODY_POINTS) % BODY_POINTS;
    const r0 = radii[idx] || baseR;
    if (f.type === 'pearl') {
      const pr = baseR * 0.025 * (0.4 + (f.growth || 0));
      fill((h + 20) % 360, s * 0.25, min(b + 10, 100), 40);
      circle(cx + cos(a) * r0 * 0.7, cy + sin(a) * r0 * 0.7, pr * 2);
    } else if (f.type === 'membrane') {
      fill((h + 30) % 360, s * 0.2, b, 18);
      ellipse(cx + cos(a) * r0 * 0.7, cy + sin(a) * r0 * 0.7,
        baseR * 0.3 * (f.growth || 0.4), baseR * 0.2 * (f.growth || 0.4));
    } else if (f.type === 'tendril') {
      const len = baseR * 0.22 * (0.3 + (f.growth || 0));
      stroke((h + 10) % 360, s * 0.2, b, 45);
      strokeWeight(max(1, baseR * 0.02));
      line(cx + cos(a) * r0 * 0.8, cy + sin(a) * r0 * 0.8,
        cx + cos(a + 12) * (r0 * 0.8 + len), cy + sin(a + 12) * (r0 * 0.8 + len));
      noStroke();
    }
  }
}

function draw() {
  background(0);

  if (window.shareIsHost) {
    const guests = (window.guests || []).slice(0, MAX_SATELLITES);
    const sources = [{ h: hueBase, s: satBase, b: briBase, sg: sizeGrowth, asym: asymmetry, feats: features }];
    for (const g of guests) {
      const snap = readGuest(g);
      if (snap) sources.push(snap);
    }
    let hx = 0, hy = 0;
    for (const src of sources) { hx += cos(src.h); hy += sin(src.h); }
    const avgH = (atan2(hy / sources.length, hx / sources.length) + 360) % 360;
    const avgS = sources.reduce((a, src) => a + src.s, 0) / sources.length;
    const avgB = sources.reduce((a, src) => a + src.b, 0) / sources.length;
    const avgSG = sources.reduce((a, src) => a + src.sg, 0) / sources.length;
    const avgA = sources.reduce((a, src) => a + src.asym, 0) / sources.length;
    const cx = width / 2, cy = height / 2;
    let baseR = min(width, height) * BIG_SCALE * avgSG;
    if (guests.length > 0) {
      const orbitR = min(width, height) * 0.4;
      const satMaxR = min(width, height) * SATELLITE_SCALE * 1.25;
      baseR = Math.min(baseR, orbitR - satMaxR - min(width, height) * 0.07);
    }
    const pulse = 1 + 0.03 * sin(frameCount * 0.02);

    noStroke();
    fill((avgH + 30) % 360, avgS * 0.3, avgB, 20);
    circle(cx, cy, baseR * 2.2 * pulse);
    drawCreature(cx, cy, baseR, avgH, avgS, avgB, pulse, avgA, 0, []);

    if (guests.length === 0) {
      fill(0, 0, 100, 90);
      textAlign(CENTER, CENTER);
      text('Waiting for participants...', cx, cy + baseR + 30);
    } else {
      const r = min(width, height) * 0.4;
      for (let i = 0; i < guests.length; i++) {
        const snap = readGuest(guests[i]);
        if (!snap) continue;
        const ang = (i / guests.length) * 360;
        drawCreature(cx + cos(ang) * r, cy + sin(ang) * r,
          min(width, height) * SATELLITE_SCALE * snap.sg,
          snap.h, snap.s, snap.b, pulse, snap.asym, i * 10, snap.feats);
      }
    }
    return;
  }

  if (window.sensorsEnabled) {
    const tx = constrain(rotationY, -45, 45);
    const ty = constrain(rotationX, -45, 45);
    velX += map(tx, -45, 45, -TILT_FORCE, TILT_FORCE);
    velY += map(ty, -45, 45, -TILT_FORCE, TILT_FORCE);
    asymmetry = min(0.8, asymmetry + abs(tx) * TILT_GROWTH * 0.01 + abs(ty) * TILT_GROWTH * 0.01);
  }
  velX *= 0.92; velY *= 0.92;
  driftX += velX; driftY += velY;
  const maxDrift = min(width, height) * 0.15;
  driftX = constrain(driftX, -maxDrift, maxDrift);
  driftY = constrain(driftY, -maxDrift, maxDrift);
  for (let i = 0; i < BODY_POINTS; i++) disp[i] = lerp(disp[i], 0, SETTLE_SPEED);
  burst *= 0.92;
  // After a quiet period, drift gently back to the starting size.
  if (millis() - lastInteraction > SHRINK_DELAY && abs(sizeGrowth - 1) > 0.001) {
    sizeGrowth = lerp(sizeGrowth, 1, SHRINK_SPEED);
  }
  if (millis() - lastSave > SAVE_INTERVAL) { saveState(); lastSave = millis(); }

  const cx = width / 2 + driftX, cy = height / 2 + driftY;
  const baseR = min(width, height) * CREATURE_SCALE * sizeGrowth;
  const pulse = 1 + 0.03 * sin(frameCount * 0.02);
  const hueNow = hueBase % 360;
  const satNow = constrain(satBase + colourGrowth * 10, 0, 100);
  const briNow = constrain(briBase + burst * 10, 0, 100);

  const glowAlpha = 10 + glowGrowth * 30 + burst * 20;
  noStroke();
  fill((hueNow + 30) % 360, satNow * 0.35, briNow, constrain(glowAlpha * 0.4, 0, 30));
  circle(cx + 6, cy - 4, baseR * 1.9 * pulse * 2);
  fill((hueNow + 20) % 360, satNow * 0.4, briNow, constrain(glowAlpha * 0.6, 0, 45));
  circle(cx - 4, cy + 6, baseR * 1.6 * pulse * 2);
  fill(hueNow, satNow * 0.5, briNow, constrain(glowAlpha, 0, 60));
  circle(cx, cy, baseR * 1.3 * pulse * 2);

  drawCreature(cx, cy, baseR, hueNow, satNow, briNow, pulse, asymmetry, 0, features);
  drawRipples();

  for (let k = 0; k < 3; k++) {
    const ang = frameCount * (0.3 + k * 0.15) + k * 120;
    const orbitR = baseR * (1.4 + 0.2 * sin(frameCount * 0.02 + k));
    const sx = cx + cos(ang) * orbitR;
    const sy = cy + sin(ang) * orbitR * 0.7;
    const sr = baseR * (0.12 + 0.04 * sin(frameCount * 0.03 + k));
    fill((hueNow + 40 + k * 30) % 360, satNow * 0.4, briNow, 50);
    circle(sx, sy, sr * 2);
  }
}

function deviceShaken() {
  lastInteraction = millis();
  burst = 1;
  glowGrowth = min(1, glowGrowth + SHAKE_GROWTH);
  colourGrowth = min(1, colourGrowth + SHAKE_GROWTH * 0.8);
  if (features.length < MAX_FEATURES) {
    features.push({ type: 'membrane', angle: random(360), growth: 0.4 });
  }
}

function growTendrilNear(tx, ty) {
  const cx = width / 2 + driftX;
  const cy = height / 2 + driftY;
  const ang = (atan2(ty - cy, tx - cx) + 360) % 360;
  let best = -1, bestD = 999;
  for (let i = 0; i < features.length; i++) {
    if (features[i].type !== 'tendril') continue;
    let d = Math.abs(features[i].angle - ang);
    if (d > 180) d = 360 - d;
    if (d < bestD) { bestD = d; best = i; }
  }
  if (best >= 0 && bestD < 30) {
    features[best].growth = min(1.5, features[best].growth + FEATURE_GROWTH * 0.5);
  } else if (features.length < MAX_FEATURES) {
    features.push({ type: 'tendril', angle: (ang + random(-8, 8) + 360) % 360, growth: 0.25 });
  }
}

function growPearlNear(tx, ty) {
  const cx = width / 2 + driftX;
  const cy = height / 2 + driftY;
  const ang = (atan2(ty - cy, tx - cx) + 360) % 360;
  if (features.length < MAX_FEATURES) {
    features.push({ type: 'pearl', angle: (ang + random(-6, 6) + 360) % 360, growth: 0.3 });
  }
}

// Touch permanently reshapes the body by growing a smooth lobe at that angle.
function growLobeNear(tx, ty) {
  const cx = width / 2 + driftX;
  const cy = height / 2 + driftY;
  const ang = (atan2(ty - cy, tx - cx) + 360) % 360;
  let best = -1, bestD = 999;
  for (let i = 0; i < features.length; i++) {
    if (features[i].type !== 'lobe') continue;
    let d = abs(features[i].angle - ang);
    if (d > 180) d = 360 - d;
    if (d < bestD) { bestD = d; best = i; }
  }
  if (best >= 0 && bestD < LOBE_WIDTH) {
    features[best].growth = min(LOBE_MAX, features[best].growth + LOBE_GROWTH);
  } else {
    if (features.length >= MAX_FEATURES) {
      // Make room by dropping the oldest non-lobe feature.
      const old = features.findIndex(f => f.type !== 'lobe');
      if (old >= 0) features.splice(old, 1);
      else return;
    }
    features.push({ type: 'lobe', angle: ang, growth: LOBE_GROWTH });
  }
}

function applyTouchReaction(tx, ty, strength) {
  const cx = width / 2 + driftX;
  const cy = height / 2 + driftY;
  const baseR = min(width, height) * CREATURE_SCALE * sizeGrowth;
  const maxPush = baseR * 0.65;
  // Direction from the centre toward the touch, for the squash on the far side.
  const tdx = tx - cx, tdy = ty - cy;
  const tlen = max(1, sqrt(tdx * tdx + tdy * tdy));
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    const px = cx + cos(a) * baseR;
    const py = cy + sin(a) * baseR;
    const d = dist(tx, ty, px, py);
    const influence = map(d, 0, baseR * 1.4, strength, 0, true);
    // Near the touch, push out; on the opposite side, pull in for a squishy feel.
    const facing = (cos(a) * tdx + sin(a) * tdy) / tlen;
    const push = influence * REACTION_STRENGTH - max(0, -facing) * 0.5 * strength;
    disp[i] += max(-maxPush, min(maxPush, push * baseR * 0.5));
  }
  // Visible flash and an expanding ring at the touch point.
  burst = max(burst, TOUCH_FLASH * strength);
  ripples.push({ x: tx, y: ty, r: baseR * 0.15, a: 170 });
  sizeGrowth = min(1.25, sizeGrowth + GROWTH_RATE * strength);
}

function drawRipples() {
  noFill();
  for (let i = ripples.length - 1; i >= 0; i--) {
    const rp = ripples[i];
    rp.r *= 1.08;
    rp.a *= 0.9;
    if (rp.a < 6) {
      ripples.splice(i, 1);
    } else {
      stroke(hueBase % 360, satBase * 0.4, 100, rp.a);
      strokeWeight(2);
      circle(rp.x, rp.y, rp.r * 2);
    }
  }
  noStroke();
}

// The view follows window.shareIsHost every frame, so a host handover
// switches the display automatically. This callback is kept for clarity.
function shareHostChanged(isHost) {
  lastSave = 0;
}

function twoFingerDist() {
  if (!touches || touches.length < 2) return 0;
  return dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
}

function mousePressed() {
  lastInteraction = millis();
  if (touches && touches.length >= 2) {
    pinchDist = twoFingerDist();
  } else if (touches && touches.length === 1) {
    applyTouchReaction(touches[0].x, touches[0].y, 1);
    growPearlNear(touches[0].x, touches[0].y);
    growLobeNear(touches[0].x, touches[0].y);
  } else {
    applyTouchReaction(mouseX, mouseY, 1);
    growPearlNear(mouseX, mouseY);
    growLobeNear(mouseX, mouseY);
  }
  return false;
}

function mouseDragged() {
  lastInteraction = millis();
  if (touches && touches.length >= 2) {
    const d = twoFingerDist();
    if (pinchDist > 0) {
      const delta = d - pinchDist;
      sizeGrowth = constrain(sizeGrowth + delta * PINCH_GROWTH, PINCH_MIN, PINCH_MAX);
      burst = max(burst, 0.3);
    }
    pinchDist = d;
    return false;
  }
  pinchDist = 0;
  const dx = mouseX - pmouseX;
  const dy = mouseY - pmouseY;
  velX += dx * DRAG_LURCH;
  velY += dy * DRAG_LURCH;
  if (touches && touches.length === 1) {
    applyTouchReaction(touches[0].x, touches[0].y, 0.9);
    growTendrilNear(touches[0].x, touches[0].y);
    growLobeNear(touches[0].x, touches[0].y);
  } else {
    applyTouchReaction(mouseX, mouseY, 0.9);
    growTendrilNear(mouseX, mouseY);
    growLobeNear(mouseX, mouseY);
  }
  asymmetry = min(0.8, asymmetry + GROWTH_RATE * 0.6);
  return false;
}

function mouseReleased() {
  pinchDist = 0;
  keepScreenOn();
  return false;
}

function keyPressed() {
  if (!window.sensorsEnabled) {
    if (keyCode === LEFT_ARROW) velX -= KEY_TILT_FORCE;
    if (keyCode === RIGHT_ARROW) velX += KEY_TILT_FORCE;
    if (keyCode === UP_ARROW) velY -= KEY_TILT_FORCE;
    if (keyCode === DOWN_ARROW) velY += KEY_TILT_FORCE;
    if (KEY_SHAKE && key === ' ') deviceShaken();
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
