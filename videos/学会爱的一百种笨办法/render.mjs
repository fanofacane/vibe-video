// render.mjs: drive studio.html in headless Chromium. Adapted from ClawdVideo/render.mjs.
//   node render.mjs --sheet=1,2,3 [--cols=3] [--w=640] --out=out/check.jpg   contact sheet (fast visual check)
//   node render.mjs --stills=0.8,3 --out=out/stills                         full-res PNG stills
//   node render.mjs --clip=8:18 --out=out/clip.mp4                           short clip with the sound-effect track
//   node render.mjs --frames=0:90 --workers=4                                full-res JPEG frames → out/frames (resumable)
//   node render.mjs --encode [--out=output/学会爱的一百种笨办法_v01.mp4]       frames + sound effects → MP4
// The sound-effect track (assets/sfx.wav) is built by `node tools/sfx.mjs`.
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, statSync, renameSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const CHROME = args.chrome || process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const DUR = 90, fps = +(args.fps || 24);
// Animated "on twos" like hand-drawn animation: 12 drawings per second (matching the 12 fps line boil),
// each held for two frames of the 24 fps video. Pass --ones to draw all 24.
const rfps = args.ones ? fps : fps / 2;
const FRAMES_DIR = 'out/frames', AUDIO = 'assets/sfx.wav';
const audioArgs = (a, b) => existsSync(AUDIO) ? ['-ss', String(a), '-t', String(b - a), '-i', AUDIO] : [];
const audioMap = () => existsSync(AUDIO) ? ['-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k'] : [];

const run = (cmd, a) => new Promise((ok, bad) => { const p = spawn(cmd, a, { stdio: 'inherit' }); p.on('close', c => c ? bad(new Error(cmd + ' exited ' + c)) : ok()); });

if (args.encode) {
  const out = args.out || 'output/学会爱的一百种笨办法_v01.mp4', n = readdirSync(FRAMES_DIR).filter(f => f.endsWith('.jpg')).length;
  mkdirSync(dirname(out), { recursive: true });
  console.log(`encoding ${n} drawings (${(n / rfps).toFixed(1)} s) → ${out}`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-stats', '-framerate', String(rfps), '-i', `${FRAMES_DIR}/f%05d.jpg`, ...audioArgs(0, n / rfps),
    ...audioMap(), '-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-shortest', out]);
  console.log('wrote ' + out);
  process.exit(0);
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, protocolTimeout: 0,
  args: ['--allow-file-access-from-files', '--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--window-size=1920,1080',
    '--disable-renderer-backgrounding', '--disable-background-timer-throttling', ...(process.env.HTTPS_PROXY ? [`--proxy-server=${process.env.HTTPS_PROXY}`, '--ignore-certificate-errors'] : [])]
});
async function openPage(tag = '') {
  const page = await browser.newPage();
  page.on('console', m => { if (['error', 'warn'].includes(m.type())) console.log(`[page${tag}]`, m.text()); });
  page.on('pageerror', e => console.log(`[page error${tag}]`, e.message));
  await page.goto(pathToFileURL(resolve('studio.html')).href + '?render', { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction('window.ready === true', { timeout: 120000 });
  return page;
}
const frameOf = async (page, t, type, q) => {
  const url = await page.evaluate((t, type, q) => window.renderAt(t, type, q), t, type, q);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
};
const times = s => String(s).split(',').map(Number);

if (args.sheet) {
  const page = await openPage(), out = args.out || 'out/sheet.jpg'; mkdirSync(dirname(out), { recursive: true });
  const { url, ms } = await page.evaluate((ts, c, w) => window.renderSheet(ts, c, w), times(args.sheet), +(args.cols || 3), +(args.w || 640));
  writeFileSync(out, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  console.log(`${out}  ms/frame: ${ms.join(' ')}`);
} else if (args.stills) {
  const page = await openPage(), out = args.out || 'out/stills'; mkdirSync(out, { recursive: true });
  for (const s of times(args.stills)) {
    const t0 = Date.now(), buf = await frameOf(page, s, 'image/png');
    const f = `${out}/t${s.toFixed(2).replace('.', '_')}.png`; writeFileSync(f, buf);
    console.log(`${f}  ${Date.now() - t0} ms`);
  }
} else if (args.frames) {
  // Parallel, resumable: each worker page pulls the next missing frame index; files are written atomically.
  const [a, b] = String(args.frames).split(':').map(Number), workers = +(args.workers || 4);
  mkdirSync(FRAMES_DIR, { recursive: true });
  const first = Math.round(a * rfps), last = Math.min(Math.ceil(DUR * rfps) - 1, Math.round(b * rfps) - 1);
  const todo = []; for (let i = first; i <= last; i++) { const f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`; if (!existsSync(f) || statSync(f).size < 1000) todo.push(i); }
  console.log(`${todo.length} frames to render (${last - first + 1 - todo.length} already done), ${workers} workers`);
  let next = 0, done = 0; const start = Date.now();
  const work = async w => {
    const page = await openPage('#' + w);
    while (next < todo.length) {
      const i = todo[next++], f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`;
      const buf = await frameOf(page, i / rfps, 'image/jpeg', .94);
      writeFileSync(f + '.tmp', buf); renameSync(f + '.tmp', f);
      if (++done % 12 === 0 || done === todo.length) {
        const el = (Date.now() - start) / 1000;
        console.log(`drawing ${done}/${todo.length}  ${(el / done * 1000).toFixed(0)} ms/frame effective  eta ${((todo.length - done) * el / done / 60).toFixed(1)} min`);
      }
    }
  };
  await Promise.all(Array.from({ length: workers }, (_, w) => work(w)));
} else {
  const page = await openPage();
  const [a, b] = args.clip ? String(args.clip).split(':').map(Number) : [0, DUR];
  const out = args.out || 'out/clip.mp4'; mkdirSync(dirname(out), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(rfps), '-c:v', 'mjpeg', '-i', '-',
    ...audioArgs(a, b), ...audioMap(), '-r', String(fps), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-shortest', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((b - a) * rfps), start = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await frameOf(page, a + i / rfps, 'image/jpeg', .92);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 24 === 0 || i === n - 1) console.log(`frame ${i + 1}/${n}  ${((Date.now() - start) / (i + 1)).toFixed(0)} ms/frame`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(`wrote ${out}`);
}
await browser.close();
