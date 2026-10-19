// c01_wakeup: 8–18 s. Chapter 1, "温柔地叫醒对方". Clawd, living in the bedside phone, wakes the human "gently":
// phone alarm, then the speaker blasts an orchestra, the curtains whoosh open, the lamp goes to full and the frame
// burns white. The human tumbles out of bed; Clawd sweats and turns the volume down one notch.
// Palette: pre-dawn blue that brightens to a blinding morning white.
(() => {
  const PHONE = [330, 675], SPK = [1530, GY], MOTOR = [1745, 115], LAMP = [930, 250];
  const DIM_WALL = '#56608F', DAY_WALL = '#F4E6CC';

  // The bedroom. st = { light, curtain, lamp, glow: { phone, speaker, motor, lamp }, waves, human: fn }
  function bedroom(t, st) {
    const L = st.light;
    room(t, { wall: mixCol(DIM_WALL, DAY_WALL, L), floor: mixCol('#4B4466', '#C99A6E', L) });
    windowCurtains(1260, 170, 400, 330, st.curtain, { sky: mixCol('#7A86C0', '#9ED3F2', L), sun: L > .4, curtain: '#D9737E', glow: st.glow.motor || 0, sway: st.sway || 0 });
    frameArt(560, 320, 200, 150, PAL.rose);
    // sunbeam through the window onto the bed
    if (st.curtain > .2) paint([[1270, 180], [1650, 180], [1450, GY + 60], [480, GY + 60]], { wash: '#FFF2C4', washOp: 70 * st.curtain * L, fill: '#FFE7A0', fillOp: 70 * st.curtain, bleed: .2, tex: .3, ink: null });
    lamp(LAMP[0], LAMP[1], 80, { on: st.lamp, col: '#FFF0C2', glow: st.glow.lamp || 0 });
    speaker(SPK[0], SPK[1], 210, { ring: st.glow.speaker || 0, glow: st.glow.speaker || 0, waves: st.waves || 0, waveT: t, waveCol: PAL.clayDk });
    bed(980, GY, 820);
    st.human ? st.human() : null;
    const top = nightstand(PHONE[0], GY, 300);
    const r = phone(PHONE[0], top, 220, { lit: .5 + .4 * (st.glow.phone || 0), glow: st.glow.phone || 0, rot: st.phoneRot || 0 });
    return r;
  }

  // The human in bed: lying with the head on the pillow at the left, blanket over the body.
  function inBed(o = {}) {
    return () => {
      paint(rrPts(600, 610, 230, 90, 40), { wash: '#FFF9EC', fill: '#E8DCC6', fillOp: 60, ink: PAL.ink, sw: 1 });   // pillow
      push(); translate(1000, 668); rotate(-Math.PI / 2 + (o.tilt || 0)); translate(-1000, -668);
      researcher(1000, 668, 24, { casual: true, coat: '#F2B8C6', shirt: PAL.cream, pants: '#F2B8C6', noShadow: true, eyes: o.eyes || 'closed', mouth: o.mouth || 'o', hairUp: o.hairUp || 0, dy: o.dy || 0 });
      pop();
      // blanket: a soft lump over everything but the head
      const b = [[760, 640], [880, 600 - (o.lift || 0)], [1100, 590 - (o.lift || 0)], [1330, 610], [1395, 690], [1395, 730], [760, 730]];
      paint(b, { wash: '#7FB3D5', fill: '#5E93BA', fillOp: 70, tex: .6, border: .4, ink: PAL.ink, sw: 1.2, curv: .5 });
      for (let i = 0; i < 4; i++) inkLine([[860 + i * 130, 615 - (o.lift || 0) * .6], [840 + i * 130, 725]], .6, '#4A7DA5', 'inkfine', .3);
    };
  }

  // 8–9.5: chapter card on the laptop.
  function card(t, lt, dur) {
    bookCard(t, lt, dur, 'laptop', ['第一章', '温柔地叫醒对方'], { react: l => ({ mouth: l > .8 ? 'smile' : 'o', eyes: l > .8 ? 'happy' : 'look', dy: -Math.abs(Math.sin(seg(l, .8, 1.4) * Math.PI * 2)) * .8 }) });
  }

  // 9.5–11.5: phone alarm, then the speaker blasts.
  function alarm(t, lt, dur) {
    const ring = lt > .3 ? 1 : 0, blast = seg(lt, 1.25, 1.35);
    const sh = shakeXY(t, 14 * blast * (1 - seg(lt, 1.6, 2)));
    camBegin(900 + sh[0] + lt * 10, 560 + sh[1], 1.08);
    const sig = seg(lt, .9, 1.25);
    const r = bedroom(t, {
      light: 0, curtain: 0, lamp: 0, waves: blast, phoneRot: ring * .06 * Math.sin(lt * 60),
      glow: { phone: ring, speaker: blast },
      human: inBed({ eyes: blast > .5 ? 'wide' : 'closed', mouth: blast > .5 ? 'O' : 'o', hairUp: blast, lift: blast * 30 * Math.abs(Math.sin(lt * 18)) })
    });
    clawdIn(r, { k: seg(lt, 0, .3), eyes: lt > .9 ? 'happy' : 'normal', mouth: 'grin', aL: 1 + .3 * Math.sin(lt * 20), aR: 1 - .3 * Math.sin(lt * 20) });
    if (ring && blast < .5) sfx('叮铃铃', PHONE[0] + 40, PHONE[1] - 260, 54, PAL.ochre, lt - .3, { life: .9, rot: -.12 });
    if (sig > 0 && sig < 1) hopDot([PHONE[0], PHONE[1] - 120], [SPK[0], SPK[1] - 200], sig, 260);
    if (blast > 0) {
      for (let i = 0; i < 5; i++) { const q = frac(lt * .9 + i / 5), a = -1.3 + i * .55; emote('music', SPK[0] + Math.cos(a) * (120 + q * 380), SPK[1] - 220 + Math.sin(a) * (80 + q * 260) - q * 120, 26, 1 - q * .8); }
      sfx('当当当当!', SPK[0] - 180, SPK[1] - 470, 76, PAL.clay, lt - 1.3, { life: .8, rot: .08 });
    }
    if (lt < .9) { const z = frac(lt / 1.2); letter('z', 760 + z * 30, 560 - z * 60, 30, PAL.cream, { alpha: 1 - z }); }
    camEnd();
    flash(.35 * (1 - blast * .3), '#20264F');
  }

  // 11.5–14: curtains whoosh open, then the lamp goes to full and everything burns white.
  function bright(t, lt, dur) {
    const sig1 = seg(lt, 0, .35), open = easeOut(seg(lt, .35, .7)), sig2 = seg(lt, 1.1, 1.45), on = seg(lt, 1.45, 1.6), burn = easeIn(seg(lt, 1.6, 2.3));
    camBegin(1060 + lt * 15, 520, lerp(1.0, 1.06, lt / dur));
    const r = bedroom(t, {
      light: lerp(0, .75, open) + .25 * on, curtain: open, lamp: on * (1 + burn), sway: (1 - seg(lt, .7, 1.1)) * open,
      glow: { phone: .6, motor: sig1 >= 1 ? 1 - seg(lt, .8, 1.1) : 0, lamp: on * (1 - burn) },
      waves: .4,
      human: inBed({ eyes: 'wide', mouth: 'O', hairUp: 1, lift: 10 })
    });
    clawdIn(r, { eyes: 'happy', mouth: 'grin', aL: 1.3, aR: 1.3 });
    if (sig1 > 0 && sig1 < 1) hopDot([PHONE[0], PHONE[1] - 120], MOTOR, sig1, 300);
    if (sig2 > 0 && sig2 < 1) hopDot([PHONE[0], PHONE[1] - 120], LAMP, sig2, 200);
    if (open > 0) sfx('唰!', 1460, 330, 90, PAL.cream, lt - .4, { life: .7 });
    camEnd();
    flash(lerp(.3, 0, open), '#20264F');
    flash(.97 * burn, '#FFFDF4');
  }

  // 14–16.5: the white fades; the human tumbles out of bed onto the floor.
  function tumble(t, lt, dur) {
    const fade = 1 - ease(seg(lt, 0, .45)), fall = seg(lt, .35, 1.0), land = lt > 1.0;
    const sh = shakeXY(t, land ? 12 * (1 - seg(lt, 1.0, 1.35)) : 0);
    camBegin(1000 + sh[0], 560 + sh[1], 1.04);
    bedroom(t, {
      light: 1, curtain: 1, lamp: 1, waves: .3, glow: { phone: .4 },
      human: fall <= 0 ? inBed({ eyes: 'wide', mouth: 'O', hairUp: 1 }) : () => {
        paint(rrPts(600, 610, 230, 90, 40), { wash: '#FFF9EC', fill: '#E8DCC6', fillOp: 60, ink: PAL.ink, sw: 1 });
        paint([[760, 700], [1395, 700], [1395, 730], [760, 730]], { wash: '#F6F0E4', ink: null });
      }
    });
    if (fall > 0) {
      // arc from the bed out to the floor in front of it, spinning, blanket flying with them
      const e = easeIn(fall), x = lerp(1000, 1250, fall), y = lerp(680, GY + 110, e) - Math.sin(fall * Math.PI) * 160;
      const rot = land ? Math.PI * .5 : lerp(-Math.PI / 2, Math.PI * .5, fall);
      const wob = land ? Math.sin(lt * 9) * .6 * (1 - seg(lt, 1.0, 2.2)) : 0;
      push(); translate(x, y); rotate(rot); translate(-x, -y);
      researcher(x, y, 24, { casual: true, coat: '#F2B8C6', shirt: PAL.cream, pants: '#F2B8C6', noShadow: true, eyes: land ? 'swirl' : 'wide', mouth: land ? 'wobble' : 'O', hairUp: 1, aL: .8 + wob, aR: .8 - wob });
      pop();
      const bx = land ? 1180 : x + 40, by = land ? GY + 80 : y - 60;
      paint([[bx - 220, by - 40], [bx - 40, by - 90], [bx + 200, by - 50], [bx + 240, by + 40], [bx - 200, by + 50]], { wash: '#7FB3D5', fill: '#5E93BA', fillOp: 70, tex: .6, ink: PAL.ink, sw: 1.2, curv: .5 });
      if (land) { sfx('咚!', 1300, GY - 80, 100, PAL.clay, lt - 1.0, { life: .9 }); emote('swirl', 1000, GY - 40, 40, seg(lt, 1.1, 1.3)); }
    }
    camEnd();
    flash(.97 * fade, '#FFFDF4');
  }

  // 16.5–18: phone close-up. Clawd sweats, nudges the volume down by exactly one notch, then zips off to the kitchen.
  function oops(t, lt, dur) {
    camBegin(960, 540, lerp(1, 1.04, lt / dur));
    const r = bigDevice('phone', { bg: '#C99A6E' });
    glass(r, { lit: .9 });
    paint(rectPts(r.x, r.y, r.w, r.h), { wash: '#FBE3D2', ink: null });
    // volume bar
    const vol = lerp(1, .9, ease(seg(lt, .6, .8))), bx = r.x + 80, by = r.y + 120, bw = r.w - 160;
    paint(rrPts(bx, by, bw, 46, 23), { wash: '#E9D4C6', ink: PAL.ink, sw: 1 });
    paint(rrPts(bx, by, bw * vol, 46, 23), { wash: PAL.clay, ink: null });
    paint([[bx - 70, by + 10], [bx - 52, by + 10], [bx - 30, by - 8], [bx - 30, by + 54], [bx - 52, by + 36], [bx - 70, by + 36]], { wash: PAL.ink, ink: null });
    const h = hopK(t, 17.5, .5), m = mood(lt, [[0, 'normal'], [.15, 'normal', 'sweat']]);
    clawdIn({ x: r.x, y: r.y + 200, w: r.w, h: r.h - 260 }, { k: h.out, ...m, mouth: 'wobble', aR: lt > .5 && lt < .9 ? 1.2 : .1, aL: .1, scale: .9 });
    if (h.fly > 0 && h.fly < 1) hopDot([960, 700], [2200, 300], h.fly, 200);
    camEnd();
  }

  chapter('wakeup', 8, 18, [[8, card], [9.5, alarm], [11.5, bright], [14, tumble], [16.5, oops]]);
})();
