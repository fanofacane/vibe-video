// home.js: the apartment and every smart device Clawd can live in or control, plus the shared moves
// (hopping between screens, the orange "Clawd is driving this" glow, the e-book of love).
//
// Conventions
// - Device functions take (x, y, s, o). (x, y) is the bottom-centre where the device stands (or hangs from, for
//   wall pieces it is the centre), s is a size in px. Devices with a screen return the screen rect {x, y, w, h}
//   in the same coordinates so a shot can put Clawd (or a UI) inside it.
// - `o.glow` 0..1 paints the orange control halo around the device.
// - Everything is a pure function of the arguments: shots pass time-derived values in.

const GLOW = '#FF9A5C', SCREEN = '#2A3358', SCREEN_LT = '#DCEBF2';
const WOOD = '#C89566', WOOD_DK = '#9A6A45', STEEL = '#D9DCE0', STEEL_DK = '#A9AEB6', PINK = '#F4A6B8';
const GY = 900;   // floor line in room shots

// ---------- small shared bits ----------
// A soft round glow faked with stacked translucent washes (cheap, no watercolor fill).
function softGlow(x, y, rx, ry, col, op = 120, n = 4) {
  for (let i = 0; i < n; i++) { const k = 1 - i / n; paint(ellPts(x, y, rx * k, ry * k, 24), { wash: col, washOp: op / n, ink: null }); }
}

// Orange halo + little signal arcs: "Clawd is controlling this".
function ctrlGlow(x, y, rx, ry, k = 1) {
  if (k < .02) return;
  softGlow(x, y, rx * 1.25, ry * 1.25, GLOW, 110 * k);
  const r0 = Math.min(rx, ry) * .25;
  for (let i = 0; i < 2; i++) {
    const a0 = -Math.PI * .75, a1 = -Math.PI * .25, R = r0 * (1 + i * .7), cy = y - ry - r0 * .3, p = [];
    for (let j = 0; j <= 6; j++) { const a = lerp(a0, a1, j / 6); p.push([x + Math.cos(a) * R, cy + Math.sin(a) * R + R]); }
    if (k > .3) inkLine(p, clamp(rx / 160, .4, 1.1) * k, GLOW, 'ink', .5);
  }
}

// A screen surface: dark glass + soft reflection. `lit` 0..1 brightens it, `col` overrides the glass colour.
function glass(r, o = {}) {
  const col = o.col || mixCol(SCREEN, o.lightCol || '#5A6FA8', o.lit ?? .4);
  paint(rrPts(r.x, r.y, r.w, r.h, Math.min(r.w, r.h) * .06), { wash: col, fill: mixCol(col, '#FFFFFF', .25), fillOp: 60, tex: .4, border: .4, ink: null });
  paint([[r.x + r.w * .62, r.y + r.h * .06], [r.x + r.w * .78, r.y + r.h * .06], [r.x + r.w * .5, r.y + r.h * .94], [r.x + r.w * .34, r.y + r.h * .94]], { fill: '#FFFFFF', fillOp: 22, bleed: .1, ink: null });
}

// Clawd standing inside a screen rect. o.k scales it (0 = gone, for pop in/out), o.fx/o.fy place it (0..1 of the rect),
// o.scale tweaks size. Everything else goes straight to clawd().
function clawdIn(r, o = {}) {
  const k = o.k ?? 1; if (k < .03) return;
  const u = Math.min(r.w / 13, r.h / 10.5) * (o.scale ?? 1) * backOut(clamp(k));
  const x = r.x + r.w * (o.fx ?? .5), y = r.y + r.h * (o.fy ?? .9);
  // screen light pooled behind Clawd
  softGlow(x, y - 4 * u, 7 * u, 5 * u, GLOW, 60, 3);
  clawd(x, y, u, { noShadow: true, ...o });
}

// Hop between screens: Clawd shrinks to a light dot, flies an arc trailing dotted Wi-Fi light, and pops out.
// p 0..1 is the flight progress. Returns the dot position.
function hopDot(a, b, p, lift = 220) {
  const pt = q => [lerp(a[0], b[0], q), lerp(a[1], b[1], q) - Math.sin(q * Math.PI) * lift];
  if (p <= 0 || p >= 1) return pt(clamp(p));
  const e = ease(p), [x, y] = pt(e);
  for (let i = 1; i <= 7; i++) { const q = e - i * .045; if (q <= 0) break; const [tx, ty] = pt(q); paint(ellPts(tx, ty, 9 - i, 9 - i, 8), { wash: GLOW, washOp: 200 - i * 24, ink: null }); }
  softGlow(x, y, 50, 50, GLOW, 140, 3);
  paint(ellPts(x, y, 15, 15, 12), { wash: '#FFE3C8', ink: GLOW, sw: .8 });
  return [x, y];
}
// k-in / k-out helper for a hop: Clawd scale at the source (shrinking) and destination (growing).
const hopK = (t, t0, dur = .5) => ({ out: 1 - seg(t, t0, t0 + .12), fly: seg(t, t0 + .08, t0 + dur - .08), in: seg(t, t0 + dur - .12, t0 + dur + .1) });

// ---------- room ----------
function room(t, o = {}) {
  const wall = o.wall || '#E9D9C4', floor = o.floor || '#B98C64', x0 = o.x0 ?? -200, x1 = o.x1 ?? W + 200;
  paint(rectPts(x0, -200, x1 - x0, GY + 200), { wash: wall, ink: null });
  paint(rectPts(x0, -200, x1 - x0, GY + 200), { fill: mixCol(wall, '#FFFFFF', .2), fillOp: 60, bleed: .05, tex: .5, border: .2, ink: null });
  paint(rectPts(x0, GY, x1 - x0, 500), { wash: floor, ink: null });
  paint(rectPts(x0, GY, x1 - x0, 500), { fill: mixCol(floor, PAL.ink, .2), fillOp: 60, tex: .6, border: .3, ink: null });
  for (let i = 0; i < Math.ceil((x1 - x0) / 420) + 1; i++) inkLine([[x0 + i * 420, GY + 4], [x0 + i * 420 - 120, H + 120]], .5, mixCol(floor, PAL.ink, .35), 'inkfine', 0);
  paint(rectPts(x0, GY - 26, x1 - x0, 26), { wash: mixCol(wall, '#FFFFFF', .5), ink: PAL.ink, sw: .7 });
}

function windowCurtains(x, y, w, h, open, o = {}) {
  const sky = o.sky || PAL.sky;
  paint(rrPts(x - 14, y - 14, w + 28, h + 28, 6), { wash: '#F6EEDF', ink: PAL.ink, sw: 1 });
  paint(rectPts(x, y, w, h), { wash: sky, fill: mixCol(sky, '#FFFFFF', .3), fillOp: 80, bleed: .15, tex: .5, ink: null });
  if (o.sun) { paint(ellPts(x + w * .7, y + h * .32, h * .16, h * .16, 18), { wash: '#FFE08A', fill: PAL.ochre, fillOp: 60, ink: null }); }
  if (o.moon) { paint(ellPts(x + w * .72, y + h * .28, h * .11, h * .11, 16), { wash: PAL.cream, ink: null }); for (let i = 0; i < 5; i++) paint(starPts(x + w * hash(i + 3), y + h * hash(i + 9) * .7, 6, .4, 4), { wash: PAL.cream, ink: null }); }
  if (o.dusk) paint(rectPts(x, y + h * .55, w, h * .45), { fill: '#F2A36B', fillOp: 120, bleed: .2, ink: null });
  inkLine([[x + w / 2, y], [x + w / 2, y + h]], 1, PAL.ink, 'ink', 0); inkLine([[x, y + h / 2], [x + w, y + h / 2]], 1, PAL.ink, 'ink', 0);
  paint(rectPts(x, y, w, h), { ink: PAL.ink, sw: 1.1 });
  // curtain rail + motor box
  paint(rectPts(x - 80, y - 52, w + 160, 22), { wash: STEEL, ink: PAL.ink, sw: .9 });
  paint(rrPts(x + w + 40, y - 70, 70, 50, 10), { wash: STEEL_DK, ink: PAL.ink, sw: .9 });
  paint(ellPts(x + w + 75, y - 45, 8, 8, 10), { wash: (o.glow || 0) > .1 ? GLOW : '#7FD08A', ink: null });
  if (o.glow) ctrlGlow(x + w + 75, y - 45, 90, 70, o.glow);
  const cw = lerp(w / 2 + 70, 70, clamp(open)), col = o.curtain || '#D9737E', dk = mixCol(col, PAL.ink, .25);
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? x - 70 : x + w + 70 - cw, pts = [];
    const sway = (o.sway || 0) * side;
    for (let i = 0; i <= 6; i++) pts.push([x0 + cw * i / 6 + Math.sin(i * 2.1 + T * 3) * 6, y - 36]);
    pts.push([x0 + cw + sway * 30, y + h + 60], [x0 + sway * 30, y + h + 60]);
    paint(pts, { wash: col, fill: dk, fillOp: 70, tex: .7, border: .5, ink: PAL.ink, sw: 1 });
    const folds = Math.max(2, Math.round(cw / 60));
    for (let i = 1; i < folds; i++) inkLine([[x0 + cw * i / folds, y - 30], [x0 + cw * i / folds + sway * 30, y + h + 50]], .6, dk, 'inkfine', 0);
  }
}

// Pendant lamp hanging from the ceiling at (x, 0) down to y. on 0..1, col = light colour.
function lamp(x, y, s, o = {}) {
  const on = o.on ?? 0, col = o.col || '#FFE6A8';
  if (on > .02) {
    paint([[x - s * .3, y], [x + s * .3, y], [x + s * 2.6 * (1 + on * .4), GY + 40], [x - s * 2.6 * (1 + on * .4), GY + 40]], { wash: col, washOp: 60 * on, fill: col, fillOp: 70 * on, bleed: .25, tex: .2, border: .1, ink: null });
    softGlow(x, y + s * .1, s * 1.6 * (1 + on), s * 1.2 * (1 + on), col, 200 * on);
  }
  inkLine([[x, -40], [x, y - s * .5]], .9, PAL.ink, 'ink', 0);
  paint([[x - s * .2, y - s * .55], [x + s * .2, y - s * .55], [x + s * .7, y], [x - s * .7, y]], { wash: o.shade || '#3C6E71', ink: PAL.ink, sw: .9 });
  paint(ellPts(x, y + s * .06, s * .3, s * .18, 12), { wash: on > .1 ? mixCol('#FFF6D8', col, .4) : '#BFB6A2', ink: PAL.ink, sw: .6 });
  if (o.glow) ctrlGlow(x, y - s * .1, s * 1.2, s * .9, o.glow);
}

// ---------- screens / gadgets ----------
function phone(x, y, s, o = {}) {   // s = height; standing upright on its base point
  const w = s * .52, r = { x: x - w / 2 + s * .04, y: y - s + s * .07, w: w - s * .08, h: s * .86 };
  push(); translate(x, y); rotate(o.rot || 0); translate(-x, -y);
  if (o.glow) ctrlGlow(x, y - s / 2, w * 1.1, s * .7, o.glow);
  paint(rrPts(x - w / 2, y - s, w, s, s * .08), { wash: o.body || '#3B3550', ink: PAL.ink, sw: clamp(s / 200, .5, 1.3) });
  glass(r, o);
  paint(rrPts(x - w * .14, y - s + s * .025, w * .28, s * .025, s * .012), { wash: PAL.ink, ink: null });
  pop();
  return r;
}
function tablet(x, y, s, o = {}) {  // s = height, landscape on a little stand
  const w = s * 1.45, r = { x: x - w / 2 + s * .07, y: y - s - 20 + s * .07, w: w - s * .14, h: s * .86 };
  if (o.glow) ctrlGlow(x, y - s / 2, w * .7, s * .7, o.glow);
  paint([[x - s * .3, y], [x + s * .3, y], [x + s * .1, y - 30], [x - s * .1, y - 30]], { wash: STEEL_DK, ink: PAL.ink, sw: .8 });
  paint(rrPts(x - w / 2, y - s - 20, w, s, s * .07), { wash: '#E8E4EE', ink: PAL.ink, sw: clamp(s / 200, .5, 1.3) });
  glass(r, o);
  return r;
}
function laptop(x, y, s, o = {}) {  // s = screen height
  const w = s * 1.55, r = { x: x - w / 2 + s * .07, y: y - s - 16 + s * .07, w: w - s * .14, h: s * .82 };
  if (o.glow) ctrlGlow(x, y - s / 2, w * .7, s * .7, o.glow);
  paint(rrPts(x - w / 2, y - s - 16, w, s, s * .05), { wash: '#4A4458', ink: PAL.ink, sw: clamp(s / 200, .6, 1.3) });
  glass(r, o);
  paint([[x - w / 2 - 20, y - 18], [x + w / 2 + 20, y - 18], [x + w / 2 + 60, y], [x - w / 2 - 60, y]], { wash: STEEL, fill: STEEL_DK, fillOp: 60, ink: PAL.ink, sw: .9 });
  return r;
}
function tv(x, y, s, o = {}) {      // wall-mounted, (x, y) = centre, s = height
  const w = s * 1.75, r = { x: x - w / 2 + 14, y: y - s / 2 + 14, w: w - 28, h: s - 28 };
  if (o.glow) ctrlGlow(x, y, w * .65, s * .7, o.glow);
  paint(rrPts(x - w / 2, y - s / 2, w, s, 10), { wash: '#2B2A36', ink: PAL.ink, sw: 1.2 });
  glass(r, o);
  return r;
}
function speaker(x, y, s, o = {}) { // s = height
  const w = s * .6, ring = o.ring ?? 0, rc = o.ringCol || GLOW;
  if (o.waves) for (let i = 0; i < 3; i++) {
    const R = s * (.45 + ((o.waveT || 0) * 1.6 + i / 3) % 1 * .6), a = (1 - ((o.waveT || 0) * 1.6 + i / 3) % 1) * o.waves;
    for (const sd of [-1, 1]) { const p = []; for (let j = 0; j <= 6; j++) { const ang = lerp(-.7, .7, j / 6); p.push([x + sd * Math.cos(ang) * R, y - s * .55 + Math.sin(ang) * R]); } if (a > .1) inkLine(p, 1.2 * a, o.waveCol || PAL.ink, 'ink', .5); }
  }
  if (o.glow) ctrlGlow(x, y - s / 2, w * 1.1, s * .75, o.glow);
  paint([[x - w / 2, y - s + 16], [x + w / 2, y - s + 16], [x + w / 2, y - 10], [x - w / 2, y - 10]], { wash: '#8E8AA0', fill: '#5F5B72', fillOp: 70, tex: .8, ink: null });
  paint(ellPts(x, y - 10, w / 2, 14, 18), { wash: '#5F5B72', ink: null });
  paint(ellPts(x, y - s + 16, w / 2, 14, 18), { wash: ring > .05 ? mixCol('#3B3550', rc, ring) : '#3B3550', ink: PAL.ink, sw: .8 });
  if (ring > .05) paint(ellPts(x, y - s + 10, w * .8, 40, 18), { fill: rc, fillOp: 120 * ring, bleed: .3, ink: null });
  inkLine([[x - w / 2, y - s + 16], [x - w / 2, y - 10]], 1, PAL.ink, 'ink', 0); inkLine([[x + w / 2, y - s + 16], [x + w / 2, y - 10]], 1, PAL.ink, 'ink', 0);
  const bot = []; for (let j = 0; j <= 10; j++) { const a = j / 10 * Math.PI; bot.push([x + Math.cos(a) * w / 2, y - 10 + Math.sin(a) * 14]); } inkLine(bot, 1, PAL.ink, 'ink', .4);
}
function fridge(x, y, s, o = {}) {  // s = height; screen on the upper door
  const w = s * .5, door = clamp(o.door || 0), r = { x: x - w * .32, y: y - s * .86, w: w * .5, h: s * .22 };
  if (o.glow) ctrlGlow(x, y - s * .55, w * .8, s * .6, o.glow);
  paint(rrPts(x - w / 2, y - s, w, s, 18), { wash: o.body || '#BFE0DA', fill: '#8FBDB6', fillOp: 60, tex: .5, ink: PAL.ink, sw: 1.2 });
  inkLine([[x - w / 2, y - s * .42], [x + w / 2, y - s * .42]], 1, PAL.ink, 'ink', 0);
  if (door > .02) {
    // open fridge: bright inside, door swung toward the camera on the right
    paint(rrPts(x - w / 2 + 12, y - s + 12, w - 24, s * .58 - 24, 8), { wash: '#FFF8E6', fill: '#FFE9B0', fillOp: 90, ink: PAL.ink, sw: .8 });
    for (const sy of [.25, .42]) inkLine([[x - w / 2 + 16, y - s + s * sy], [x + w / 2 - 16, y - s + s * sy]], .8, STEEL_DK, 'inkfine', 0);
    paint(ellPts(x - w * .2, y - s + s * .23, w * .1, s * .04, 10), { wash: '#E8D27A', ink: PAL.ink, sw: .5 });
    paint(rrPts(x + w * .05, y - s + s * .31, w * .12, s * .1, 4), { wash: '#F6F6F0', ink: PAL.ink, sw: .5 });
    paint(ellPts(x - w * .15, y - s + s * .39, w * .09, s * .025, 10), { wash: '#F3E6C4', ink: PAL.ink, sw: .5 });
    paint(ellPts(x, y - s * .7, w * .9, s * .5, 18), { fill: '#FFF4C8', fillOp: 60 * door, bleed: .3, ink: null });
    const dw = w * (1 - door * .55);
    paint([[x + w / 2, y - s], [x + w / 2 + dw * .45 * door, y - s - 20 * door], [x + w / 2 + dw * .45 * door, y - s * .42 + 20 * door], [x + w / 2, y - s * .42]], { wash: '#A9D3CC', ink: PAL.ink, sw: 1 });
  } else {
    paint(rrPts(x + w * .34, y - s * .74, 12, s * .2, 6), { wash: STEEL, ink: PAL.ink, sw: .7 });
    glass(r, o);
    if (o.note) { push(); translate(x - w * .05, y - s * .3); rotate(-.06); paint(rectPts(-55, -60, 110, 120, 2), { wash: '#FFF9EC', ink: PAL.ink, sw: .8 }); paint(heartPts(0, -4, 26), { wash: '#E2476E', ink: PAL.ink, sw: .6 }); paint(ellPts(0, -58, 9, 9, 10), { wash: '#E2476E', ink: PAL.ink, sw: .5 }); pop(); }
  }
  paint(rrPts(x + w * .34, y - s * .36, 12, s * .2, 6), { wash: STEEL, ink: PAL.ink, sw: .7 });
  return r;
}
function counter(x0, x1, y = GY, h = 330) {
  paint(rectPts(x0, y - h, x1 - x0, h), { wash: '#E7D3B5', fill: WOOD, fillOp: 50, tex: .5, ink: PAL.ink, sw: 1 });
  paint(rectPts(x0 - 20, y - h - 26, x1 - x0 + 40, 30), { wash: '#F2EEE6', fill: STEEL, fillOp: 60, ink: PAL.ink, sw: 1 });
  const n = Math.max(1, Math.round((x1 - x0) / 260));
  for (let i = 0; i < n; i++) { const cx = x0 + (i + .5) * (x1 - x0) / n; paint(rectPts(cx - (x1 - x0) / n / 2 + 16, y - h + 30, (x1 - x0) / n - 32, h - 60), { ink: mixCol(WOOD, PAL.ink, .3), sw: .6 }); paint(ellPts(cx, y - h + 60, 20, 6, 10), { wash: STEEL_DK, ink: null }); }
  return y - h - 26;   // counter top
}
function toaster(x, y, s, o = {}) { // s = width
  const h = s * .62, lever = o.lever ?? 0;
  if (o.glow) ctrlGlow(x, y - h / 2, s * .75, h * .9, o.glow);
  paint(rrPts(x - s / 2, y - h, s, h, s * .16), { wash: '#E9B44C', fill: '#C98A2A', fillOp: 60, tex: .5, ink: PAL.ink, sw: 1 });
  for (const dx of [-.18, .18]) paint(rrPts(x + dx * s - s * .12, y - h - 4, s * .24, 14, 6), { wash: PAL.ink, ink: null });
  paint(rrPts(x + s / 2 - 4, y - h * lerp(.75, .3, lever), 26, 14, 5), { wash: PAL.ink, ink: null });
  paint(ellPts(x - s * .3, y - h * .3, 9, 9, 10), { wash: (o.hot || 0) > .1 ? '#FF5A3C' : '#7F6A55', ink: null });
}
function toast(x, y, s, o = {}) {   // s = width; burnt 0..1; heart = burnt heart mark
  push(); translate(x, y); rotate(o.rot || 0);
  const b = o.burnt || 0, col = mixCol('#F2C27B', '#6B3B20', b);
  paint([[-s / 2, s * .55], [s / 2, s * .55], [s / 2, -s * .25], [s * .32, -s * .55], [-s * .32, -s * .55], [-s / 2, -s * .25]], { wash: col, fill: mixCol(col, PAL.ink, .3), fillOp: 60, tex: .6, ink: PAL.ink, sw: clamp(s / 150, .5, 1), curv: .2 });
  if (o.heart) paint(heartPts(0, 0, s * .27), { wash: '#3A2016', washOp: 230, ink: null });
  pop();
}
function coffeeMaker(x, y, s, o = {}) { // s = height
  const w = s * .62;
  if (o.glow) ctrlGlow(x, y - s / 2, w * .9, s * .65, o.glow);
  paint([[x - w / 2, y], [x + w / 2, y], [x + w / 2, y - s], [x - w / 2, y - s]], { wash: '#4E4A5C', ink: PAL.ink, sw: 1 });
  paint(rectPts(x - w * .35, y - s * .6, w * .7, s * .55), { wash: '#2D2A38', ink: null });
  paint(rrPts(x - w * .3, y - s * .9, w * .6, s * .16, 6), { wash: '#BFE3E6', ink: PAL.ink, sw: .6 });
  return { spout: [x, y - s * .6] };
}
function cup(x, y, s, o = {}) {
  paint([[x - s / 2, y - s], [x + s / 2, y - s], [x + s * .4, y], [x - s * .4, y]], { wash: o.col || PAL.cream, ink: PAL.ink, sw: .8 });
  inkLine([[x + s * .45, y - s * .8], [x + s * .8, y - s * .6], [x + s * .42, y - s * .3]], .8, PAL.ink, 'ink', .6);
  if (o.full) paint(ellPts(x, y - s, s / 2, s * .1, 12), { wash: '#6B3B20', ink: null });
}
function microwave(x, y, s, o = {}) { // s = width
  const h = s * .6, r = { x: x + s * .28, y: y - h * .82, w: s * .17, h: h * .2 };
  if (o.glow) ctrlGlow(x, y - h / 2, s * .65, h * .8, o.glow);
  paint(rrPts(x - s / 2, y - h, s, h, 12), { wash: '#E6E1DA', fill: STEEL_DK, fillOp: 50, ink: PAL.ink, sw: 1 });
  const win = rrPts(x - s * .44, y - h * .85, s * .66, h * .7, 8);
  paint(win, { wash: (o.on || 0) > .1 ? '#F4C76A' : '#3C3A48', fill: '#FFE9A8', fillOp: 90 * (o.on || 0), ink: PAL.ink, sw: .8 });
  paint(rrPts(r.x, r.y, r.w, r.h, 4), { wash: '#203034', ink: PAL.ink, sw: .5 });
  for (let i = 0; i < 6; i++) paint(ellPts(x + s * .32 + (i % 2) * s * .1, y - h * .45 + Math.floor(i / 2) * h * .13, 7, 7, 8), { wash: STEEL_DK, ink: null });
  return r;
}
function printer(x, y, s, o = {}) {   // s = width
  const h = s * .42, r = { x: x + s * .12, y: y - h * .78, w: s * .28, h: h * .3 };
  if (o.glow) ctrlGlow(x, y - h / 2, s * .7, h * 1.1, o.glow);
  paint([[x - s * .34, y - h], [x + s * .34, y - h], [x + s * .24, y - h - s * .22], [x - s * .24, y - h - s * .22]], { wash: '#FFFDF6', ink: PAL.ink, sw: .8 });
  paint(rrPts(x - s / 2, y - h, s, h, 14), { wash: '#ECE8F2', fill: STEEL_DK, fillOp: 50, ink: PAL.ink, sw: 1 });
  paint(rectPts(x - s * .4, y - h * .32, s * .8, h * .12), { wash: '#3B3550', ink: null });
  glass(r, o);
  return { screen: r, slot: [x, y - h * .26] };
}
function vacuum(x, y, s, o = {}) {    // s = diameter
  if (o.glow) ctrlGlow(x, y - s * .1, s * .7, s * .35, o.glow);
  paint(ellPts(x, y - s * .08, s / 2, s * .17, 22), { wash: '#3B3550', ink: PAL.ink, sw: .9 });
  paint(ellPts(x, y - s * .14, s * .46, s * .14, 22), { wash: '#5A5570', ink: null });
  paint(ellPts(x, y - s * .17, s * .12, s * .05, 12), { wash: (o.glow || 0) > .1 ? GLOW : '#7FD08A', ink: null });
}
function acUnit(x, y, s, o = {}) {    // wall-mounted, centre; s = width
  const h = s * .3, r = { x: x + s * .18, y: y - h * .2, w: s * .22, h: h * .38 };
  if (o.glow) ctrlGlow(x, y, s * .65, h * 1.3, o.glow);
  paint(rrPts(x - s / 2, y - h / 2, s, h, h * .3), { wash: '#F4F2EE', fill: STEEL, fillOp: 60, ink: PAL.ink, sw: 1 });
  inkLine([[x - s * .44, y + h * .3], [x + s * .44, y + h * .3]], .8, PAL.ink, 'inkfine', 0);
  paint(rrPts(r.x, r.y, r.w, r.h, 4), { wash: '#203034', ink: null });
  if (o.breeze) for (let i = 0; i < 3; i++) { const q = frac(o.breeze + i / 3), yy = y + h * .5 + q * 140; inkLine([[x - s * .3 + i * s * .2, yy], [x - s * .25 + i * s * .2, yy + 20], [x - s * .3 + i * s * .2, yy + 40]], .7 * (1 - q), PAL.sky, 'inkfine', .5); }
  return r;
}
function desk(x0, x1, y = GY, top = 560) {
  paint(rectPts(x0, top, x1 - x0, 26), { wash: WOOD, fill: WOOD_DK, fillOp: 60, tex: .6, ink: PAL.ink, sw: 1 });
  for (const lx of [x0 + 24, x1 - 48]) paint(rectPts(lx, top + 26, 24, y - top - 26), { wash: WOOD_DK, ink: PAL.ink, sw: .8 });
  return top;
}
function sofa(x, y, s, o = {}) {      // s = width
  const col = o.col || '#7A9CC6', dk = mixCol(col, PAL.ink, .25);
  paint(rrPts(x - s / 2, y - s * .5, s, s * .32, 30), { wash: col, fill: dk, fillOp: 50, tex: .6, ink: PAL.ink, sw: 1.1 });
  paint(rrPts(x - s / 2 + 20, y - s * .26, s - 40, s * .17, 20), { wash: mixCol(col, '#FFFFFF', .15), ink: PAL.ink, sw: 1 });
  for (const sd of [-1, 1]) paint(rrPts(x + sd * s / 2 - (sd > 0 ? 80 : 0), y - s * .34, 80, s * .3, 26), { wash: col, fill: dk, fillOp: 60, ink: PAL.ink, sw: 1.1 });
  for (const lx of [-.42, .42]) paint(rectPts(x + lx * s - 10, y - s * .05, 20, s * .05), { wash: WOOD_DK, ink: null });
}
function bed(x, y, s, o = {}) {       // s = width
  paint(rrPts(x - s / 2 - 30, y - s * .55, 60, s * .55, 16), { wash: WOOD, fill: WOOD_DK, fillOp: 60, ink: PAL.ink, sw: 1.1 });
  paint(rectPts(x - s / 2, y - s * .26, s, s * .16), { wash: '#F6F0E4', ink: PAL.ink, sw: 1 });
  paint(rectPts(x - s / 2, y - s * .1, s, s * .1), { wash: WOOD_DK, ink: PAL.ink, sw: 1 });
}
function nightstand(x, y, s) {
  paint(rectPts(x - s / 2, y - s * .75, s, s * .75), { wash: WOOD, fill: WOOD_DK, fillOp: 50, ink: PAL.ink, sw: 1 });
  paint(ellPts(x, y - s * .45, 10, 6, 8), { wash: WOOD_DK, ink: null });
  return y - s * .75;
}
function door(x, y, s, o = {}) {      // s = height
  const w = s * .45, op = clamp(o.open || 0);
  paint(rectPts(x - w / 2 - 14, y - s - 14, w + 28, s + 14), { wash: '#F6EEDF', ink: PAL.ink, sw: 1 });
  paint(rectPts(x - w / 2, y - s, w, s), { wash: op > .02 ? '#F7C77E' : '#C8A27A', fill: '#FFE6A8', fillOp: 80 * op, ink: null });
  const dw = w * (1 - op * .8);
  paint(rectPts(x - w / 2, y - s, dw, s), { wash: '#B07A52', fill: WOOD_DK, fillOp: 50, tex: .5, ink: PAL.ink, sw: 1 });
  paint(ellPts(x - w / 2 + dw - 24, y - s * .48, 9, 9, 10), { wash: PAL.ochre, ink: PAL.ink, sw: .5 });
}
function plant(x, y, s) {
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .4; paint(ellPts(x + Math.cos(a) * s * .5, y - s * .55 + Math.sin(a) * s * .5, s * .18, s * .36, 10, 0, a + Math.PI / 2), { wash: PAL.sap, fill: '#4F7D3E', fillOp: 60, ink: PAL.ink, sw: .6 }); }
  paint([[x - s * .3, y - s * .4], [x + s * .3, y - s * .4], [x + s * .22, y], [x - s * .22, y]], { wash: '#C9714E', ink: PAL.ink, sw: .8 });
}
function frameArt(x, y, w, h, col) {
  paint(rectPts(x - w / 2, y - h / 2, w, h), { wash: '#F6EEDF', ink: PAL.ink, sw: .9 });
  paint(rectPts(x - w / 2 + 12, y - h / 2 + 12, w - 24, h - 24), { fill: col, fillOp: 140, bleed: .2, tex: .6, ink: null });
}

// ---------- the e-book of love ----------
// Draw the open e-book inside a screen rect. title shows on the right page; flip 0..1 turns the page.
function bookUI(r, title, o = {}) {
  paint(rectPts(r.x, r.y, r.w, r.h), { wash: '#F7E7EA', ink: null });
  const cx = r.x + r.w / 2, m = r.w * .05, pw = r.w / 2 - m, top = r.y + r.h * .08, ph = r.h * .84;
  paint(rectPts(r.x + m, top, pw, ph), { wash: '#FFF9F0', ink: PAL.ink, sw: .6 });
  paint(rectPts(cx, top, pw, ph), { wash: '#FFF9F0', ink: PAL.ink, sw: .6 });
  for (let i = 0; i < 5; i++) inkLine([[r.x + m * 2, top + ph * (.25 + i * .13)], [cx - m, top + ph * (.25 + i * .13)]], .5, '#C9B8C0', 'inkfine', 0);
  paint(heartPts(r.x + m + pw / 2, top + ph * .12, r.h * .05), { wash: PINK, ink: null });
  const f = o.flip || 0;
  if (f > 0 && f < 1) {   // page turning from right to left
    const fx = cx + pw * Math.cos(f * Math.PI);
    paint([[cx, top], [fx, top - ph * .04 * Math.sin(f * Math.PI)], [fx, top + ph + ph * .04 * Math.sin(f * Math.PI)], [cx, top + ph]], { wash: '#FFFDF8', fill: '#E9D8DC', fillOp: 90, ink: PAL.ink, sw: .6 });
  }
  if (title && (f === 0 || f >= .6)) {
    const lines = Array.isArray(title) ? title : [title], longest = Math.max(...lines.map(l => l.length)), sz = o.size || Math.min(r.h * .1, pw * .86 / longest);
    lines.forEach((l, i) => letter(l, cx + pw / 2, top + ph * .38 + i * sz * 1.3 - (lines.length - 1) * sz * .65, sz * (i === 0 && lines.length > 1 ? .8 : 1), i === 0 && lines.length > 1 ? '#C24F6E' : PAL.ink, { ink: false, pop: o.pop ?? 1 }));
  }
}
// The book's closed cover (pink, a wobbly heart).
function bookCover(cx, cy, w, h, o = {}) {
  push(); translate(cx, cy); rotate(o.rot || 0);
  paint(rrPts(-w / 2, -h / 2, w, h, 10), { wash: PINK, fill: '#E27A92', fillOp: 80, tex: .6, ink: PAL.ink, sw: 1 });
  paint(rectPts(-w / 2, -h / 2, w * .08, h), { wash: '#D2617E', ink: null });
  const hp = heartPts(0, h * .12, w * .2).map((p, i) => [p[0] + Math.sin(i * 1.7) * w * .01, p[1]]);
  paint(hp, { wash: '#E2476E', ink: PAL.ink, sw: .8 });
  pop();
  letter(o.title || '爱的说明书', cx, cy - h * .24, w * .13, PAL.cream, { pop: o.pop ?? 1 });
}

// Chat UI on a phone screen (for the ending). msgs: [{ text, me }], typing: text in the input box.
function chatUI(r, o = {}) {
  paint(rectPts(r.x, r.y, r.w, r.h), { wash: '#FFF6EC', ink: null });
  paint(rectPts(r.x, r.y, r.w, r.h * .11), { wash: '#F2D2C2', ink: null });
  paint(ellPts(r.x + r.w * .14, r.y + r.h * .055, r.h * .035, r.h * .035, 12), { wash: PAL.clay, ink: PAL.ink, sw: .5 });
  letter('Clawd', r.x + r.w * .26, r.y + r.h * .057, r.h * .04, PAL.ink, { ink: false, align: 'left' });
  // input bar
  const iy = r.y + r.h * .88;
  paint(rrPts(r.x + r.w * .05, iy, r.w * .7, r.h * .08, r.h * .04), { wash: '#FFFFFF', ink: PAL.ink, sw: .6 });
  paint(ellPts(r.x + r.w * .86, iy + r.h * .04, r.h * .04 * (1 + (o.sendPress || 0) * .25), r.h * .04 * (1 + (o.sendPress || 0) * .25), 14), { wash: (o.typing || '').length ? PAL.clay : '#C9C1BA', ink: PAL.ink, sw: .5 });
  letter('➤', r.x + r.w * .862, iy + r.h * .041, r.h * .035, PAL.cream, { ink: false, font: `${r.h * .035}px sans-serif` });
  if (o.typing) letter(o.typing + (o.caret ? '|' : ''), r.x + r.w * .09, iy + r.h * .042, r.h * .036, PAL.ink, { ink: false, align: 'left' });
  return { body: { x: r.x, y: r.y + r.h * .11, w: r.w, h: r.h * .77 } };
}
// One chat bubble (right side = me). Returns nothing; y is the bubble's centre.
function bubble(r, y, text, me, sz, k = 1) {
  if (k < .02) return;
  const w = text.length * sz * .95 + sz * 1.6, h = sz * 1.9, x = me ? r.x + r.w * .93 - w : r.x + r.w * .07;
  push(); translate(x + w / 2, y); scale(backOut(k)); translate(-(x + w / 2), -y);
  paint(rrPts(x, y - h / 2, w, h, h * .45), { wash: me ? '#F6B48F' : '#FFFFFF', ink: PAL.ink, sw: .6 });
  pop();
  letter(text, x + w / 2, y + 2, sz, PAL.ink, { ink: false, pop: k });
}

// Search box UI on a screen (opening).
function searchUI(r, text, o = {}) {
  paint(rectPts(r.x, r.y, r.w, r.h), { wash: '#EEF3F8', ink: null });
  const bw = r.w * .8, bh = r.h * .17, bx = r.x + (r.w - bw) / 2, by = r.y + r.h * .42;
  letter('?', r.x + r.w / 2, r.y + r.h * .25, r.h * .14, PAL.sky);
  paint(rrPts(bx, by, bw, bh, bh / 2), { wash: '#FFFFFF', ink: PAL.ink, sw: .8 });
  paint(ellPts(bx + bh * .55, by + bh / 2, bh * .2, bh * .2, 12), { ink: PAL.ink, sw: .6 });
  if (text) letter(text + (o.caret ? '|' : ''), bx + bh * 1.05, by + bh * .53, bh * .55, PAL.ink, { ink: false, align: 'left' });
}

// ---------- shared shot pieces ----------
// Clawd's pixel reading glasses, for clawd({ draw: pixelGlasses(k) }). k 0..1 pops them on.
const pixelGlasses = (k = 1) => (u, sw) => {
  if (k < .05) return;
  push(); translate(0, -6 * u); scale(backOut(k)); translate(0, 6 * u);
  for (const ex of [-3, 2]) paint(rectPts(ex * u - .55 * u, -7.5 * u, 2.1 * u, 2.9 * u), { ink: PAL.ink, sw: sw * 1.6, br: 'ink' });
  inkLine([[-1.45 * u, -6.4 * u], [1.45 * u, -6.4 * u]], sw * 1.4, PAL.ink, 'ink', 0);
  pop();
};

// A device close-up that fills the frame. kind: laptop | fridge | tv | phone. Returns the screen rect.
function bigDevice(kind, o = {}) {
  const r = { x: 230, y: 110, w: 1460, h: 800 };
  if (kind === 'fridge') {
    paint(rectPts(-40, -40, W + 80, H + 80), { wash: '#BFE0DA', fill: '#8FBDB6', fillOp: 70, tex: .6, border: .4, ink: null });
    paint(rrPts(1790, 160, 60, 760, 30), { wash: STEEL, ink: PAL.ink, sw: 1.4 });
    paint(rrPts(r.x - 30, r.y - 30, r.w + 60, r.h + 60, 26), { wash: '#4E5866', ink: PAL.ink, sw: 1.6 });
  } else if (kind === 'tv') {
    paint(rectPts(-40, -40, W + 80, H + 80), { wash: '#2B2A36', ink: null });
    r.x = 110; r.y = 70; r.w = 1700; r.h = 940;
  } else if (kind === 'phone') {
    paint(rectPts(-40, -40, W + 80, H + 80), { wash: o.bg || '#E9D9C4', fill: '#D9C2A5', fillOp: 80, tex: .6, ink: null });
    r.x = 610; r.y = 60; r.w = 700; r.h = 960;
    paint(rrPts(r.x - 40, r.y - 50, r.w + 80, r.h + 140, 70), { wash: '#3B3550', ink: PAL.ink, sw: 1.8 });
  } else { // laptop
    paint(rectPts(-40, -40, W + 80, H + 80), { wash: '#4A4458', ink: null });
    paint([[-60, 1010], [W + 60, 1010], [W + 60, H + 60], [-60, H + 60]], { wash: STEEL, fill: STEEL_DK, fillOp: 60, ink: PAL.ink, sw: 1.4 });
  }
  return r;
}
// Chapter card: the e-book on a big device screen, page flips to the chapter title, Clawd (with glasses) reads.
// o.react(lt) may return extra clawd() options.
function bookCard(t, lt, dur, kind, title, o = {}) {
  const sh = shakeXY(t, o.shake || 0);
  camBegin(960 + sh[0], 540 + sh[1], o.zoom ? o.zoom(lt) : lerp(1, 1.05, lt / dur));
  const r = bigDevice(kind);
  glass(r, { lit: .8 });
  const br = { x: r.x + r.w * .03, y: r.y + r.h * .08, w: r.w * .66, h: r.h * .84 };
  bookUI(br, title, { flip: seg(lt, .05, .55), pop: seg(lt, .4, .75) });
  const u = r.h / 26, cx = r.x + r.w * .86, gy = r.y + r.h * .93;
  const extra = o.react ? o.react(lt) : {};
  const nod = Math.max(0, Math.sin(seg(lt, .7, 1.3) * Math.PI * 2)) * .3;
  softGlow(cx, gy - 4 * u, 7 * u, 5 * u, GLOW, 60, 3);
  clawd(cx, gy, u, { noShadow: true, eyes: 'look', lookX: -1, lookY: .3, mouth: 'o', aL: .5, aR: -.2, dy: -nod, draw: pixelGlasses(1), ...extra });
  camEnd();
}
