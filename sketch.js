// Tunables — change these to tune the sketch.
const SHARE_HOST = 'https://p5-phone-share.p5-phone-share.workers.dev';
const ROOM = 'traces-of-light';
const APP_NAME = 'traces-of-light';

const CREATURE_SCALE = 0.32; // body radius as a fraction of min(width, height)
const BODY_POINTS = 64;      // points around the body
const IDLE_SPEED = 0.006;    // how fast the body drifts and breathes
const REACTION_STRENGTH = 1.2; // how much a touch pushes the blob
const SETTLE_SPEED = 0.08;     // how fast the wobble settles back (0..1)

let disp = []; // displacement per body point (radius offset)

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  background(0);
  lockGestures();
  angleMode(DEGREES);
  for (let i = 0; i < BODY_POINTS; i++) disp[i] = 0;

  shareSetup({
    host: SHARE_HOST,
    room: ROOM,
    app: APP_NAME,
    shared: {},
    me: {}
  });

  enablePermissionsTap(['gyro', 'share'], 'Tap to enable motion and join the room');
}

function draw() {
  background(0);

  const cx = width / 2;
  const cy = height / 2;
  const baseR = min(width, height) * CREATURE_SCALE;
  const t = frameCount * IDLE_SPEED;
  const pulse = 1 + 0.03 * sin(frameCount * 0.02);

  // Settle displacements back toward 0.
  for (let i = 0; i < BODY_POINTS; i++) {
    disp[i] = lerp(disp[i], 0, SETTLE_SPEED);
  }

  // Soft halo
  noStroke();
  fill(90, 200, 255, 18);
  circle(cx, cy, baseR * 1.8 * pulse * 2);
  fill(110, 215, 255, 30);
  circle(cx, cy, baseR * 1.4 * pulse * 2);

  // Breathing noisy blob body
  fill(160, 235, 255, 220);
  noStroke();
  beginShape();
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    const n = noise(cos(a) * 1.4 + t, sin(a) * 1.4 + t);
    const r = baseR * pulse * (0.82 + 0.3 * n) + disp[i];
    vertex(cx + cos(a) * r, cy + sin(a) * r);
  }
  endShape(CLOSE);
}

function applyTouchReaction(tx, ty, strength) {
  const cx = width / 2;
  const cy = height / 2;
  const baseR = min(width, height) * CREATURE_SCALE;
  const maxPush = baseR * 0.35;
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, 360);
    const px = cx + cos(a) * baseR;
    const py = cy + sin(a) * baseR;
    const d = dist(tx, ty, px, py);
    const influence = map(d, 0, baseR * 1.2, strength, 0, true);
    disp[i] += max(-maxPush, min(maxPush, influence * REACTION_STRENGTH));
  }
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
    applyTouchReaction(mouseX, mouseY, 1);
  }
  return false;
}

function mouseReleased() {
  keepScreenOn();
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
