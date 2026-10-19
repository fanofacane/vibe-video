// c00_open: 0–8 s. Late night. The human is asleep at the desk; Clawd peeks out of the laptop, searches
// "怎么爱一个人", and the e-book of love pops up. Palette: deep night blue, cold screen light.
(() => {
  const NIGHT_WALL = '#2E3566', NIGHT_FLOOR = '#3A3456';
  const QUERY = '怎么爱一个人';

  // The desk scene, reused by the first shot. k = laptop light strength.
  function deskScene(t, k = 1) {
    room(t, { wall: NIGHT_WALL, floor: NIGHT_FLOOR });
    windowCurtains(140, 170, 380, 330, .55, { sky: '#1B2147', moon: true, curtain: '#5D5C8E' });
    frameArt(1560, 300, 220, 160, PAL.violet);
    plant(1700, GY, 170);
    // screen light pooling on the wall and desk
    paint(ellPts(900, 520, 520, 330, 26), { wash: '#9FB8E8', washOp: 40 * k, fill: '#B9D0F2', fillOp: 70 * k, bleed: .3, tex: .3, ink: null });
    // the human, asleep: drawn first, then the desk front hides the body
    const sx = 1180, s = 30;
    researcher(sx, 862, s, { casual: true, coat: '#8DB59A', shirt: PAL.cream, pants: '#4E5C8C', eyes: 'closed', mouth: 'o', rot: .04, noShadow: true });
    const top = 600;
    paint(rectPts(520, top, 1000, 28), { wash: WOOD, fill: WOOD_DK, fillOp: 60, tex: .6, ink: PAL.ink, sw: 1.1 });
    paint(rectPts(545, top + 28, 950, GY - top - 60), { wash: WOOD_DK, fill: '#7A5236', fillOp: 60, tex: .6, ink: PAL.ink, sw: 1 });
    for (const lx of [550, 1470]) paint(rectPts(lx, GY - 40, 20, 40), { wash: '#7A5236', ink: PAL.ink, sw: .7 });
    // folded arms on the desk, in front of the chin
    for (const sd of [-1, 1]) paint(rrPts(sx - 110 + (sd > 0 ? 70 : 0), top - 44, 150, 50, 24), { wash: '#8DB59A', fill: '#6E9A7E', fillOp: 50, ink: PAL.ink, sw: .9 });
    cup(1400, top, 50, {});
    const r = laptop(830, top, 230, { lit: lerp(.3, .95, k) });
    return r;
  }

  // 0–3: wide, slow push toward the glowing laptop; the human snores.
  function asleep(t, lt, dur) {
    const e = ease(lt / dur);
    camBegin(lerp(960, 860, e), lerp(540, 470, e), lerp(1, 1.45, e));
    const r = deskScene(t, 1);
    searchUI(r, '', {});
    // Clawd peeks over the bottom of the screen near the end of the shot
    const peek = seg(lt, 1.6, 2.4);
    if (peek > 0) clawdIn(r, { k: peek, fx: .8, fy: .95, eyes: 'look', lookX: 1, lookY: -.2, scale: .55, aL: .6, aR: .6 });
    const z = frac(lt / 1.4);
    letter('z', 1230 + z * 40, 480 - z * 70, 34 + z * 20, PAL.cream, { alpha: 1 - z, rot: -.2 });
    letter('z', 1260 + frac(z + .5) * 40, 470 - frac(z + .5) * 70, 30 + frac(z + .5) * 20, PAL.cream, { alpha: 1 - frac(z + .5), rot: -.2 });
    camEnd();
    flash(.25 * (1 - e), '#141833');
  }

  // A close-up laptop desktop: wallpaper, a search window and Clawd.
  function desktop(t, lt, o) {
    const r = bigDevice('laptop');
    glass(r, { lit: .8 });
    paint(rectPts(r.x, r.y, r.w, r.h), { wash: '#BCD6EE', fill: '#9EC1E4', fillOp: 70, tex: .5, ink: null });
    for (let i = 0; i < 4; i++) paint(ellPts(r.x + r.w * (.15 + i * .25), r.y + r.h * (.8 + .05 * Math.sin(i)), 150, 60, 16), { fill: '#FFFFFF', fillOp: 60, bleed: .3, ink: null });
    return r;
  }
  const win = r => ({ x: r.x + r.w * .18, y: r.y + r.h * .14, w: r.w * .5, h: r.h * .62 });

  // 3–5.5: Clawd slips out from behind the search window, glances at the sleeping human, types the question.
  function search(t, lt, dur) {
    camBegin(960, 540, lerp(1.02, 1.08, lt / dur));
    const r = desktop(t, lt), w = win(r), u = 24, gy = r.y + r.h * .92;
    // walk out from behind the window's right edge
    const out = easeOut(seg(lt, 0, .7)), cx = lerp(w.x + w.w - 100, w.x + w.w + 150, out);
    const typing = lt > .9 && lt < 2.3;
    const look = lt < .9;
    clawd(cx, gy, u, {
      noShadow: true, walk: lt < .7 ? lt * 3 : null, eyes: look ? 'look' : 'normal', lookX: look ? 1 : 0, mouth: typing ? 'o' : 'flat',
      aL: typing ? .6 + .5 * Math.sin(lt * 40) : .3, aR: typing ? .6 + .5 * Math.cos(lt * 37) : .2,
      dy: typing ? -Math.abs(Math.sin(lt * 20)) * .3 : 0, flip: false
    });
    // the window sits in front of where Clawd started
    paint(rrPts(w.x, w.y, w.w, w.h, 16), { wash: '#F4F7FB', ink: PAL.ink, sw: 1.2 });
    paint(rrPts(w.x, w.y, w.w, 50, 16), { wash: '#D9E4F0', ink: PAL.ink, sw: 1 });
    for (let i = 0; i < 3; i++) paint(ellPts(w.x + 30 + i * 30, w.y + 25, 9, 9, 10), { wash: [PAL.rose, PAL.ochre, PAL.sap][i], ink: null });
    const n = Math.floor(clamp((lt - 1.0) / 1.2) * QUERY.length);
    searchUI({ x: w.x, y: w.y + 50, w: w.w, h: w.h - 50 }, QUERY.slice(0, n), { caret: Math.floor(lt * 4) % 2 === 0 });
    // Enter
    if (lt > 2.3) sfx('⏎', w.x + w.w * .86, w.y + w.h * .52, 60, PAL.clay, lt - 2.3, { life: .5 });
    camEnd();
  }

  // 5.5–8: the e-book pops up; Clawd's eyes sparkle, it puts on pixel glasses and the book opens; push into the page.
  function bookPops(t, lt, dur) {
    const push2 = easeIn(seg(lt, 1.9, 2.5));
    camBegin(lerp(960, 820, push2), lerp(540, 470, push2), lerp(1.08, 3.2, push2));
    const r = desktop(t, lt), w = win(r), u = 24, gy = r.y + r.h * .92;
    const m = mood(lt, [[0, 'normal'], [.35, 'spark', 'spark'], [1.4, 'normal']]);
    const gl = seg(lt, .9, 1.15);
    clawd(w.x + w.w + 150, gy, u, { noShadow: true, ...m, mouth: lt > .35 ? 'grin' : 'o', aL: lt > .9 && lt < 1.3 ? 1.6 : .4, aR: lt > .9 && lt < 1.3 ? 1.6 : .4, dy: -Math.max(0, Math.sin(seg(lt, .35, .75) * Math.PI)) * 1.5, draw: pixelGlasses(gl) });
    paint(rrPts(w.x, w.y, w.w, w.h, 16), { wash: '#F4F7FB', ink: PAL.ink, sw: 1.2 });
    searchUI({ x: w.x, y: w.y + 50, w: w.w, h: w.h - 50 }, QUERY, {});
    if (seg(lt, 1.4, 1.9) > .5) LETTERS = LETTERS.filter(L => L.txt !== QUERY && L.txt !== '?');   // the page covers the search window
    // the book: pops in, then the cover swings open into a page
    const popK = backOut(seg(lt, .05, .4)), open = ease(seg(lt, 1.4, 1.9));
    const bx = w.x + w.w * .5, by = w.y + w.h * .5;
    push(); translate(bx, by); scale(popK); translate(-bx, -by);
    if (open < .5) { push(); translate(bx, by); scale(1 - open * 2, 1); translate(-bx, -by); bookCover(bx, by, 300, 400, { pop: open < .05 ? seg(lt, .2, .5) : 0 }); pop(); }
    else { const pr = { x: bx - 300 * (open - .5) * 2, y: by - 200, w: 600 * (open - .5) * 2, h: 400 }; bookUI(pr, null); }
    pop();
    camEnd();
  }

  chapter('open', 0, 8, [[0, asleep], [3, search], [5.5, bookPops]]);
})();
