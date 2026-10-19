// tools/sfx.mjs: synthesise every sound effect and mix them onto one 90 s track → assets/sfx.wav.
// No samples, no music: each effect is built from oscillators and filtered noise, so the track is reproducible
// and free of licensing questions. Edit CUES to move or add effects; times are in film seconds.
//   node tools/sfx.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const SR = 48000, DUR = 90, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const TAU = Math.PI * 2;

// deterministic noise
let seed = 12345; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

// ---------- building blocks ----------
// Write a mono signal fn(i, tSec) of `dur` seconds at time t0, with gain and pan (-1..1).
function put(t0, dur, gain, pan, fn) {
  const s0 = Math.round(t0 * SR), n = Math.round(dur * SR), gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) { const j = s0 + i; if (j < 0 || j >= N) continue; const v = fn(i, i / SR); L[j] += v * gl; R[j] += v * gr; }
}
const env = (t, a, d, total) => t < a ? t / a : Math.max(0, 1 - (t - a) / Math.max(1e-4, total - a)) ** d;   // attack, then power decay to 0 at total
const osc = (type, ph) => type === 'sin' ? Math.sin(ph * TAU) : type === 'tri' ? 1 - 4 * Math.abs(((ph + .25) % 1) - .5) : type === 'sq' ? (ph % 1 < .5 ? 1 : -1) : 2 * (ph % 1) - 1;
// one-pole low-pass state helper
const lp = () => { let y = 0; return (x, k) => (y += k * (x - y)); };

// A pitched tone with optional glide (f0 → f1) and vibrato.
function tone(t0, dur, f0, o = {}) {
  const f1 = o.f1 ?? f0, type = o.type || 'sin', a = o.a ?? .005, d = o.d ?? 1.5, vib = o.vib || 0; let ph = 0;
  const filt = lp();
  put(t0, dur, o.gain ?? .3, o.pan ?? 0, (i, t) => {
    const f = (o.exp ? f0 * Math.pow(f1 / f0, t / dur) : f0 + (f1 - f0) * t / dur) * (1 + vib * Math.sin(t * TAU * 6));
    ph += f / SR; let v = osc(type, ph);
    if (o.lp) v = filt(v, o.lp);
    return v * env(t, a, d, dur);
  });
}
// Filtered noise burst; lpk = low-pass amount (small = darker), hp removes rumble.
function noise(t0, dur, o = {}) {
  const a = o.a ?? .005, d = o.d ?? 2, f1 = lp(), f2 = lp();
  put(t0, dur, o.gain ?? .2, o.pan ?? 0, (i, t) => {
    const k = o.lpk1 != null ? o.lpk + (o.lpk1 - o.lpk) * t / dur : (o.lpk ?? .3);
    let v = f1(rnd(), k); if (o.hp) v -= f2(v, o.hp);
    return v * env(t, a, d, dur) * (o.am ? .5 + .5 * Math.sin(t * TAU * o.am) : 1);
  });
}
const chord = (t0, dur, fs, o) => fs.forEach((f, i) => tone(t0, dur, f, { ...o, pan: (o.pan ?? 0) + (i - (fs.length - 1) / 2) * .2, gain: (o.gain ?? .2) / Math.sqrt(fs.length) }));
const note = n => 440 * Math.pow(2, (n - 69) / 12);   // MIDI → Hz

// ---------- the effects ----------
const FX = {
  pop: (t, o = {}) => { tone(t, .12, 500 * (o.pitch || 1), { f1: 1100 * (o.pitch || 1), exp: true, gain: .25 * (o.gain || 1), d: 2, pan: o.pan }); },
  blip: (t, o = {}) => tone(t, .09, 1200 * (o.pitch || 1), { type: 'tri', gain: .15 * (o.gain || 1), d: 2, pan: o.pan }),
  bloop: (t, o = {}) => tone(t, .16, 700 * (o.pitch || 1), { f1: 300 * (o.pitch || 1), exp: true, type: 'tri', gain: .2 * (o.gain || 1), pan: o.pan }),
  zip: (t, o = {}) => { const d = o.dur || .35; tone(t, d, 500, { f1: 2400, exp: true, type: 'tri', gain: .12 * (o.gain || 1), a: .02, d: 1.2, vib: .02, pan: o.pan }); noise(t, d, { lpk: .5, hp: .3, gain: .05, a: .05, pan: o.pan }); },
  key: (t, o = {}) => { noise(t, .035, { lpk: .8, hp: .4, gain: .22 * (o.gain || 1), d: 3, pan: o.pan }); tone(t, .03, 1800 + 300 * rnd(), { gain: .04, d: 3, pan: o.pan }); },
  enter: (t, o = {}) => { noise(t, .07, { lpk: .5, hp: .2, gain: .3, d: 3, pan: o.pan }); tone(t, .08, 220, { gain: .15, d: 3 }); },
  step: (t, o = {}) => { tone(t, .06, 180 * (o.pitch || 1), { f1: 90, gain: .12 * (o.gain || 1), d: 3, pan: o.pan }); noise(t, .04, { lpk: .3, gain: .05, d: 3 }); },
  sparkle: (t, o = {}) => [0, 4, 7, 12, 16].forEach((s, i) => tone(t + i * .045, .5, note(84 + s), { type: 'sin', gain: .08 * (o.gain || 1), d: 2.5, pan: (i - 2) * .25 })),
  chime: (t, o = {}) => { const b = o.base || 76; tone(t, 1.0, note(b), { gain: .14 * (o.gain || 1), d: 2.2, pan: o.pan }); tone(t, 1.0, note(b) * 2.01, { gain: .05 * (o.gain || 1), d: 3, pan: o.pan }); },
  click: (t, o = {}) => { noise(t, .02, { lpk: .9, hp: .5, gain: .3 * (o.gain || 1), d: 4, pan: o.pan }); tone(t, .025, 3000, { gain: .05, d: 4 }); },
  pageflip: (t, o = {}) => noise(t, .35, { lpk: .25, lpk1: .7, hp: .15, gain: .22 * (o.gain || 1), a: .08, d: 1.5, pan: o.pan }),
  whoosh: (t, o = {}) => noise(t, o.dur || .5, { lpk: .05, lpk1: .5, hp: .05, gain: .3 * (o.gain || 1), a: (o.dur || .5) * .5, d: 1.3, pan: o.pan }),
  snore: (t, o = {}) => { noise(t, 1.0, { lpk: .04, gain: .25, a: .45, d: 1.5, am: 28 }); tone(t, 1.0, 95, { f1: 80, type: 'saw', lp: .02, gain: .12, a: .45, d: 1.5 }); },
  alarm: (t, o = {}) => { for (let k = 0; k < (o.n || 4); k++) for (let j = 0; j < 2; j++) tone(t + k * .24 + j * .08, .06, 2600, { type: 'sq', lp: .3, gain: .07, d: .5, pan: o.pan }); },
  // "da-da-da-DUM": four orchestral stabs (stacked detuned saws + timpani thump)
  orchestra: (t, o = {}) => {
    const hits = [[0, .14, [55, 62, 67]], [.16, .14, [55, 62, 67]], [.32, .14, [55, 62, 67]], [.48, .8, [51, 58, 63]]];
    for (const [dt, len, ns] of hits) {
      for (const n of ns) for (const det of [-.004, .004]) tone(t + dt, len, note(n) * (1 + det), { type: 'saw', lp: .12, gain: .06, a: .01, d: .8, pan: det * 60 });
      tone(t + dt, len, note(ns[0] - 12), { type: 'saw', lp: .06, gain: .09, a: .01, d: .8 });
      tone(t + dt, .35, 70, { f1: 45, gain: .25, d: 1.6 }); noise(t + dt, .12, { lpk: .1, gain: .12, d: 2 });
    }
  },
  curtain: (t, o = {}) => { noise(t, .45, { lpk: .08, lpk1: .5, hp: .1, gain: .35, a: .12, d: 1.6, pan: o.pan }); tone(t, .4, 120, { f1: 160, type: 'saw', lp: .05, gain: .05, a: .05, pan: o.pan }); },
  switchOn: (t, o = {}) => { FX.click(t, o); },
  swell: (t, o = {}) => { const d = o.dur || 1; tone(t, d, 220, { f1: 1760, exp: true, type: 'tri', lp: .2, gain: .1, a: d * .95, d: 1, vib: .01 }); noise(t, d, { lpk: .02, lpk1: .6, hp: .1, gain: .12, a: d * .95, d: 1 }); },
  shimmer: (t, o = {}) => { for (let i = 0; i < 6; i++) tone(t + i * .05, .6, note(96 + [0, 3, 7, 10, 12, 15][i]), { gain: .04, d: 2, pan: (i - 2.5) * .3 }); },
  rustle: (t, o = {}) => noise(t, o.dur || .5, { lpk: .3, hp: .2, gain: .18, a: .1, d: 1.2, am: 9, pan: o.pan }),
  thud: (t, o = {}) => { tone(t, .45, 110, { f1: 40, exp: true, gain: .42 * (o.gain || 1), d: 2 }); noise(t, .2, { lpk: .08, gain: .4 * (o.gain || 1), d: 3 }); },
  boing: (t, o = {}) => tone(t, .5, 220, { f1: 520, type: 'tri', gain: .14, vib: .08, d: 1.5, pan: o.pan }),
  // quiet room tone so silence never sounds like a dropout
  roomtone: (t, o = {}) => noise(t, o.dur, { lpk: .02, gain: o.gain || .05, a: .3, d: .2 }),
  birds: (t, o = {}) => { for (let i = 0; i < 3; i++) tone(t + i * .22, .14, 2800, { f1: 3600, type: 'sin', gain: .05, d: 1.5, pan: -.4 + i * .4 }); },
};

// ---------- cue list (film seconds) ----------
const CUES = [
  // 0–8 opening: night desk, the search, the book
  ['roomtone', 0, { dur: 9.6, gain: .06 }],
  ['snore', .4], ['snore', 1.9],
  ['pop', 2.05, { pitch: .8, gain: .6, pan: -.2 }],
  ['step', 3.05], ['step', 3.2], ['step', 3.35], ['step', 3.5], ['step', 3.65],
  ...Array.from({ length: 6 }, (_, i) => ['key', 4.0 + i * .2 + (i % 2) * .03]), ['key', 4.1], ['key', 4.5], ['key', 4.9],
  ['enter', 5.3],
  ['boing', 5.55], ['pop', 5.6],
  ['sparkle', 5.85],
  ['click', 6.42], ['pop', 6.4, { pitch: 1.4, gain: .5 }],
  ['pageflip', 6.95],
  ['whoosh', 7.4, { dur: .6 }],
  // 8–18 chapter 1: waking up
  ['pageflip', 8.05], ['chime', 8.45, { base: 79 }],
  ['bloop', 8.9, { pitch: 1.2 }], ['bloop', 9.15, { pitch: 1.3 }],
  ['pop', 9.5, { pan: -.6 }],
  ['alarm', 9.8, { n: 4, pan: -.6 }],
  ['zip', 10.4, { pan: 0 }],
  ['orchestra', 10.75],
  ['zip', 11.5, { pan: .4 }], ['curtain', 11.85, { pan: .5 }],
  ['zip', 12.6, { pan: 0 }], ['switchOn', 12.95], ['swell', 13.0, { dur: .9 }], ['shimmer', 13.85],
  ['rustle', 14.35, { dur: .55 }], ['thud', 15.0], ['birds', 15.3],
  ['bloop', 16.65, { pitch: .7 }], ['click', 17.1], ['zip', 17.5, { pan: .6 }],
];

for (const [name, t, o] of CUES) { if (!FX[name]) throw new Error('unknown sfx ' + name); FX[name](t, o || {}); }

// ---------- master: gentle limiter, normalise, 16-bit stereo WAV ----------
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = peak > 0 ? .89 / peak : 1;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
const sat = x => Math.tanh(x * 1.2) / Math.tanh(1.2);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(sat(L[i] * g) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(sat(R[i] * g) * 32767), 46 + i * 4); }
mkdirSync('assets', { recursive: true });
writeFileSync('assets/sfx.wav', buf);
console.log(`assets/sfx.wav  ${CUES.length} cues, peak ${peak.toFixed(2)}`);
