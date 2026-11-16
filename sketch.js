// Tunables — change these to tune the sketch.
const SHARE_HOST = 'https://p5-phone-share.p5-phone-share.workers.dev';
const ROOM = 'traces-of-light';
const APP_NAME = 'traces-of-light';

const CREATURE_SCALE = 0.32; // body radius as a fraction of min(width, height)
const BODY_POINTS = 64;      // points around the body
const IDLE_SPEED = 0.006;    // how fast the body drifts and breathes

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  background(0);
  lockGestures();
  angleMode(DEGREES);

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

  // Soft glow: the same body drawn larger and fainter behind the body.
  drawBlob(cx, cy, baseR * 1.7 * pulse, t, color(90, 200, 255, 16));
  drawBlob(cx, cy, baseR * 1.35 * pulse, t, color(110, 215, 255, 28));
  drawBlob(cx, cy, baseR * pulse, t, color(150, 230, 255, 150));
}

// A closed blob of BODY_POINTS points, each radius perturbed by noise.
// The noise uses cos/sin so the shape is seamless where the loop joins.
function drawBlob(cx, cy, baseR, t, col) {
  fill(col);
  noStroke();
  beginShape();
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = map(i, 0, BODY_POINTS, 0, TWO_PI);
    const n = noise(cos(a) * 1.4 + t, sin(a) * 1.4 + t);
    const r = baseR * (0.82 + 0.3 * n);
    splineVertex(cx + cos(a) * r, cy + sin(a) * r);
  }
  endShape(CLOSE);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mouseReleased() {
  keepScreenOn();
  return false;
}
