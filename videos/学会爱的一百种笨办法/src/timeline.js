// timeline.js: chapter registry. Each chapter file calls chapter(name, start, end, shots) with shots = [[t0, fn], ...].
// A shot fn(t, lt, dur) paints the whole frame and must be a pure function of t (frames render in parallel, out of order).
const CH = [];
function chapter(name, start, end, shots) { CH.push({ name, start, end, shots }); CH.sort((a, b) => a.start - b.start); }

const LOOPS = {};
function drawWorld(t) {
  if (window.LOOP) { window.LOOP(t); flushLetters(); return; }
  const ch = CH.find(c => t >= c.start && t < c.end);
  if (!ch) placeholder(t);
  else {
    let i = 0; while (i + 1 < ch.shots.length && t >= ch.shots[i + 1][0]) i++;
    const t0 = ch.shots[i][0], end = i + 1 < ch.shots.length ? ch.shots[i + 1][0] : ch.end;
    ch.shots[i][1](t, t - t0, end - t0);
    CAM = null;
  }
  flushLetters();
}

function placeholder(t) {
  paint(ellPts(960, 460, 520, 260, 30, 20), { fill: PAL.sky, fillOp: 90, bleed: .3, ink: null });
  letter('(还没画)', 960, 440, 60, PAL.ink, { ink: false });
  dancer(960, 900, 12, 'idle', t, {});
}
