# Plan: Traces of Light

<!-- Everything above Steps is yours. Write it yourself, in your own words.
     The agent writes the Steps. You cut them down before anything is built. -->

## Project
Phone as a living digital creature that people can interact with, to explore the relationship between individual interactions and collective transformation, for a design class installation.

## The question
One person's touch visibly changes both their own creature and the shared creature on the host screen.

## The experience
A classroom presentation, with dimmer lighting so the glowing creatures stand out against the darker environment. The main iPad is embedded into a physical sculpture and acts as the host device, displaying the larger shared creature. Other participants connect through their own phones and interact with their individual creatures.

One person opens the link on their phone, taps to enable motion and join the room, and sees their own creature full screen. They touch, drag, tilt and shake it. The creature reacts immediately by wobbling, stretching or deforming, then settles back into its normal movement. Its interactions also grow it permanently over time. The creature is saved on that phone, so refreshing or reopening the webpage does not reset it, and it cannot be reset.

On the main display, the large collective creature is the main focus, with the smaller individual creatures surrounding it, so viewers can see how everyone's interactions contribute to its transformation. The overall presentation should feel immersive and visually interesting, without too much additional information or interface elements distracting from the creatures.

## Input, transformation, output, fallback
- Input: touching and pressing directly on the creature; dragging to pull and reshape it; tilting the phone with its motion sensors; shaking the phone to trigger transformations. On a laptop: mouse clicking and dragging to touch, press and reshape; keyboard controls or on-screen buttons to simulate tilting and shaking.
- Transformation: temporary reactions and permanent growth are distinct. Touching makes the creature react immediately by wobbling, stretching or deforming around the touched area; the reaction slowly settles back into its normal movement rather than staying distorted. Interactions also contribute to permanent growth over time, and not every touch causes a huge transformation. Different interactions influence different traits:
  - tapping/touching: gradually increases its size or makes its shape fuller; it also reacts immediately around the touched area.
  - dragging: changes its shape and structure, potentially creating new extensions, curves or lobes, maybe like slime.
  - tilting: influences its movement and shape over time, making it develop more organic or asymmetrical forms.
  - shaking: influences its colour, glow or visual complexity, perhaps making it brighter or introducing new colour variations.
  - colours are randomized per creature, so every creature has its own unique combination, and they remain vibrant and striking. Even after a creature develops its own palette, the colours keep slowly shifting, blending and transitioning into different combinations over time — subtly pulsing, flowing into one another, changing in hue and intensity. The transitions should be smooth and organic, never so drastic or random that they become visually unpleasant.
  - texture is another trait that develops. The creature is not just a smooth glowing blob: it grows sculptural, organic formations — tubular tendrils and extensions, pearl-like clustered growths, and translucent, layered organic membranes — as part of its actual structure, in patches across the body. Different features coexist on the same creature, so every creature develops its own unusual silhouette and combination of organic features.
- Output: entirely visual. The phone shows only that person's creature, full screen. The host iPad shows the large collective creature with a smaller individual creature for each person around it. No sound, no audio, no vibration, no haptic feedback.
- Fallback: the laptop offers the same experience with different control methods — mouse for touch and drag, keyboard or on-screen buttons for tilt and shake. Both versions connect to the same creature system, save progress, and update the shared creature on the host screen.

## References
| File | Use it as | Take | Leave |
|---|---|---|---|
| references/reference 1.png | layout: match this | black screen; one dense organic form in the middle; generous empty space; the form always in frame on any device; the magenta/black/chrome palette is one possible direction, not the fixed start | [you said take anything useful — note anything to ignore] |
| references/reference 2.jpg | inspiration: the feel | soft translucency, fluidity, unique irregular shapes; organic and almost liquid, with different structures flowing and overlapping | too symmetrical, uniform or perfectly structured forms; recreating the specific object or composition |
| references/reference 3.jpg | inspiration: the feel | soft translucency, fluidity, unique irregular shapes; organic and almost liquid, with different structures flowing and overlapping | too symmetrical, uniform or perfectly structured forms; recreating the specific object or composition |
| references/reference 4.jpg | inspiration: the feel | soft translucency, fluidity, unique irregular shapes; organic and almost liquid, with different structures flowing and overlapping | too symmetrical, uniform or perfectly structured forms; recreating the specific objects or composition |
| references/reference 5.jpg | inspiration: the feel | soft translucency, fluidity, unique irregular shapes; the overall taste for organic, liquid forms | too symmetrical, uniform or perfectly structured forms; the phone interface and grid |

## Limits
- Change only sketch.js.
- Not now: proximity between phones; sound and audio; vibration and haptic feedback; real 3D materials (use 2D curves, layered shapes, transparency, highlights and procedural details to create the illusion instead).
- The creature cannot be reset.

## How I will check it
- On my laptop: click and drag the creature with the mouse to touch, press and reshape it; use keyboard controls or on-screen buttons to simulate tilting and shaking; see the same visual reactions and growth; connect to the same room; see the shared creature on the host screen.
- On my phone: touch and press the creature directly; drag to pull and reshape it; tilt the phone with its motion sensors; shake it to trigger transformations; see the reactions and the permanent growth; refresh and reopen the page to confirm the creature is still there; see the iPad's collective creature change as people interact.

## Steps
<!-- Written by the agent. Each step small enough to check on your phone. -->

**Step 1 — Deploy the Share worker and set the host URL.**
Clone the p5-phone repository into a temporary folder outside this project, open `companion/P5PhoneShare`, run `npm install`, then `npx wrangler login` (finish the login in your browser) and `npx wrangler deploy`. Copy the printed `https://*.workers.dev` address into the tunables at the top of `sketch.js` as `SHARE_HOST`, along with `ROOM` and `APP_NAME`. This is the one step that works outside the project folder; the project itself still changes only `sketch.js`. The worker stays up without your laptop.
Check: the worker address responds in a browser. No phone check yet.

**Step 2 — Black canvas, gesture lock, responsive frame.**
In `setup()`, create a full-window canvas, paint it black, and call `lockGestures()`. Draw a plain placeholder circle centred at `width/2, height/2` with radius `min(width, height) * CREATURE_SCALE`. In `windowResized()`, resize the canvas and recentre the drawing.
Functions: `createCanvas(windowWidth, windowHeight)`, `background(0)`, `lockGestures()`, `windowResized()`.
Numbers: `CREATURE_SCALE`.
Check laptop: a black page with a grey circle in the middle. Check phone: the same, centred, with no scrolling or pinch-zoom, and it stays centred when you rotate the phone.

**Step 3 — One permission tap for motion and Share; keep the screen on.**
In `setup()`, call `shareSetup({ host: SHARE_HOST, room: ROOM, app: APP_NAME, shared: {...}, me: {...} })`, then a single combined `enablePermissionsTap(['gyro', 'share'], 'Tap to enable motion and join the room')`. Call `keepScreenOn()` from `mouseReleased()`. Call `angleMode(DEGREES)`. Gate every hardware read behind `window.sensorsEnabled` and `window.shareConnected`.
Functions: `shareSetup()`, `enablePermissionsTap()`, `keepScreenOn()`, `angleMode(DEGREES)`, `mouseReleased()`.
Check phone: tap once; the motion permission and the room join both happen; the screen stays on; `shareStatus` shows connected. Check laptop: the tap works and the room joins; the rotation values stay 0 because there is no sensor.

**Step 4 — Creature body: a soft blob that breathes.**
Replace the placeholder with a closed blob of `BODY_POINTS` points around the centre, each radius perturbed by `noise()`. Draw it with layered translucent fills and a soft glow (concentric translucent shapes or a radial gradient). Give it a slow idle pulse and drift using `noise()` and `frameCount` at `IDLE_SPEED`.
Functions: `beginShape()` / `endShape(CLOSE)` or `splineVertex()`, `noise()`, `frameCount`, `fill()` / `noStroke()`.
Numbers: `BODY_POINTS`, `IDLE_SPEED`.
Check laptop: a soft organic blob breathes slowly in the middle of the black page. Check phone: the same, centred and always in frame.

**Step 5 — Touch reaction: wobble, stretch and deform around the touch.**
On `mousePressed()` and `mouseDragged()`, find the body points nearest the pointer and push or pull them away from it; add a wobble that decays back at `SETTLE_SPEED`. Use `touches[]` so more than one finger works. `mouseReleased()` ends the press.
Functions: `mousePressed()`, `mouseDragged()`, `mouseReleased()`, `touches[]`, `mouseX` / `mouseY`.
Numbers: `REACTION_STRENGTH`, `SETTLE_SPEED`.
Check laptop: click and drag the blob; it dents and wobbles, then settles back. Check phone: the same with a finger.

**Step 6 — Drag reshape: pull outward and keep a little of it.**
While dragging, pull the body outward. If a drag is long or strong, add a small permanent amount to the shape trait (lobes or asymmetry) at `GROWTH_RATE`; the temporary dent still settles.
Functions: `mouseDragged()`, `dist()`.
Numbers: `GROWTH_RATE`.
Check laptop: drag outward and let go; the creature bulges and keeps a little of the new shape. Check phone: the same.

**Step 7 — Tilt: movement and slow shape change.**
When `window.sensorsEnabled`, read `rotationX` and `rotationY` in degrees and map them to a drift velocity and a slow change in asymmetry. Tilt also nudges the idle movement.
Functions: `rotationX`, `rotationY`, `map()`, `constrain()`.
Numbers: `TILT_FORCE`, `TILT_GROWTH`.
Check phone: tilt the phone; the creature leans and drifts, and its silhouette becomes more asymmetrical over time. Check laptop: no sensor yet; the keyboard fallback comes in step 14.

**Step 8 — Shake: colour, glow and complexity burst.**
Define `deviceShaken()` and set a threshold with `setShakeThreshold()`. On a shake, add to the colour, glow and complexity growth and show a visible burst that decays.
Functions: `deviceShaken()`, `setShakeThreshold()`.
Numbers: `SHAKE_THRESHOLD`, `SHAKE_GROWTH`.
Check phone: shake the phone; the creature brightens and its colour shifts. Check laptop: a key or button in step 14.

**Step 9 — Permanent growth, saved on the phone.**
Accumulate the permanent traits from touches, drags, tilts and shakes at `GROWTH_RATE`. Save the creature state to `localStorage`, throttled to `SAVE_INTERVAL`, and load it in `setup()` before the first draw. There is no reset.
Functions: `localStorage.getItem()` / `localStorage.setItem()`, `JSON.stringify()` / `JSON.parse()`.
Numbers: `SAVE_INTERVAL`.
Check phone: interact, then refresh the page; the creature is still bigger or more complex. Close and reopen it later; it is still there. Check laptop: the same in the browser.

**Step 10 — A randomized colour palette that keeps drifting.**
On the first run, generate a randomized palette (a hue base and range) that stays vibrant, and save it with the creature. Drift hue and brightness slowly at `DRIFT_SPEED` so the colours pulse and flow into one another.
Functions: `colorMode(HSB)`, `hue()` / `saturation()` / `brightness()`, `noise()`, `lerp()`.
Numbers: `DRIFT_SPEED`, `HUE_RANGE`.
Check phone: two phones show different palettes; over about a minute the colours shift smoothly and never turn jarring. Check laptop: the same.

**Step 11 — Structural features: tendrils, pearls and membranes.**
Grow three feature types from interactions — tubular tendrils and extensions, pearl-like clustered growths, and translucent layered membranes — attached at positions on the body, in patches. Different interactions grow different features, and they coexist. Draw them with 2D curves, circles and translucent layers so they read as part of the creature's structure, not a pattern laid on top.
Functions: `bezier()` / `spline()`, `circle()` / `ellipse()`, translucent fills.
Numbers: `FEATURE_GROWTH`, `MAX_FEATURES`, `TENDRIL_LENGTH`, `PEARL_SIZE`, `MEMBRANE_LAYERS`.
Check laptop: drag repeatedly to grow tendrils, tap to grow pearls, shake to grow membranes; one creature ends up with a unique combination. Check phone: the same with touch, drag and shake.

**Step 12 — Share: send the creature and detect the host.**
Write the creature's traits into `me` (assign `me.traits = {...}` or use `shareSetMe()`). The host is whichever device has `shareIsHost`; the iPad must join first. Participants send their traits, and the host reads everyone's `me` from `guests`. Keep every device non-quiet so the host can read the guests.
Functions: `shareSetup()`, `me`, `shareSetMe()`, `shareIsHost`, `guests`, `shareConnected`, `shareJoined()` / `shareLeft()`.
Numbers: `SEND_INTERVAL` (the `sendInterval` in `shareSetup`).
Check phone: two phones join the same room; the first one becomes host and sees both guests; the second still sees only its own creature. Check laptop: the same in a browser.

**Step 13 — Host view: the averaged collective creature plus satellites.**
On the host, average the traits across `guests` plus your own `me`, write the average to `shared.avg` with `shareSet()`, and draw the big averaged creature at the centre with a small satellite creature for each guest arranged around it. Recompute the average as guests join and leave, and handle the host role passing to another device.
Functions: `shareIsHost`, `guests`, `shareGuest()`, `shared`, `shareSet()`, `shareHostChanged()`.
Numbers: `BIG_SCALE`, `SATELLITE_SCALE`, `MAX_SATELLITES`.
Check iPad: the big creature changes as the phones interact; one satellite appears per person and shows that person's own features. Check laptop: a second browser window can act as a participant.

**Step 14 — Laptop fallback and installation polish.**
Add keyboard keys and on-screen buttons that stand in for tilt and shake on devices without sensors, gated on `window.sensorsEnabled`. Make sure the iPad handles portrait and landscape, the host view has no clutter, and the glow reads in a dim room. Confirm the screen stays on during a session.
Functions: `keyPressed()` / `keyIsDown()`, `createButton()` or buttons drawn on the canvas, `windowResized()`.
Numbers: `KEY_TILT_FORCE`, `KEY_SHAKE`.
Check laptop: the full experience with mouse and keys. Check iPad: rotate the device; the layout stays in frame; the screen stays on; the collective and satellites stay legible.

## Assumptions
- The creature is one body blob with attached features, not a cluster of separate objects.
- The host is the first device to join the room; the iPad must open the link first.
- Every device is non-quiet, so the host can read everyone's `me`. This is fine for a class-sized room because only changes are sent.
- The iPad has motion sensors, so the sketch asks for gyro on every device; the host simply never uses it.
- Growth is fast enough to see in a class demonstration; the real rate is a tunable.
- The Share worker is deployed from a temporary clone of the p5-phone repository, so the project still changes only `sketch.js`.
- The creature's texture is 2D procedural surfaces (curves, layers, transparency), not rendered 3D materials.
- Colours are generated procedurally; no image or audio assets are used.
- `localStorage` is available on the phone's browser and is tied to the page's origin.
- If the host leaves, another device becomes host and switches to the host view.

## Changes
<!-- Yours. One line each time you change this plan, and why. -->
