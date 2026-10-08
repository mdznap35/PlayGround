/* STARMAIL — "رسالة لم تصل من النجوم" (A Message That Never Arrived).
   A night meadow under a huge sky. The Listener constellation calls in
   light + tone; the child answers by tapping stars back in order. Mistakes
   morph the signal (never fail). Midway the signal asks a FEELING — the child
   picks Nova's dance, Nova performs, the star answers. Finale: the motif
   becomes a bird, a NEW STAR ignites and stays in NOVA's sky forever.
   Sound IS the gameplay here: motif synth, echo scoring, duet, lullaby. */

import type { App } from '../core/app';
import { decide } from '../core/adaptive';
import { bus } from '../core/events';
import type { Difficulty } from '../core/types';
import { Feedback, spotlight } from '../engine/feedback';
import { WorldScene, type SceneObj } from '../engine/scene';
import { el } from '../ui/helpers';
import { mountScreen } from './shell';
import { drawNova, lookFromAvatar, type NovaMood } from '../engine/art';
import {
  duetAnswer, EMOTIONS, genMotif, MOTIF_FREQS, nextMotif,
  roundLength, roundTolerance, scoreEcho, type EmotionId,
} from '../world/starmotif';

const W = 720;
const H = 1080;

/* The Listener: five fixed stars (an arc). Difficulty gates the active pool. */
const STARS = [
  { x: 150, y: 330 }, // tail
  { x: 280, y: 250 }, // wing-low
  { x: 400, y: 300 }, // body
  { x: 510, y: 230 }, // wing-high
  { x: 620, y: 330 }, // beak
];
const NEW_STAR = { x: 470, y: 272 }; // the eye — born at the finale
const CALL_GAP = 650; // ms between call notes (the rhythm to feel)

/* ---------- motif voice (Prototype backend; respects settings) ---------- */
class StarSynth {
  private ctx: AudioContext | null = null;
  constructor(private app: App) {}
  tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0): void {
    if (!this.app.save.data.settings.sfx) return;
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t); o.stop(t + dur + 0.05);
      // shimmer partial — the star-voice, not a beep
      const o2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      o2.type = 'sine'; o2.frequency.value = freq * 2;
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.03);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o2.connect(g2).connect(this.ctx.destination);
      o2.start(t); o2.stop(t + dur + 0.05);
    } catch { /* never break play */ }
  }
  callNote(star: number): void { this.tone(MOTIF_FREQS[star % MOTIF_FREQS.length], 0.5, 'sine', 0.12); }
  echoGood(): void { this.tone(990, 0.15, 'sine', 0.08); }
  morph(): void { this.tone(392, 0.4, 'triangle', 0.08); this.tone(330, 0.5, 'triangle', 0.06, 0.15); }
  duetPartner(freq: number, when: number): void { this.tone(freq, 0.5, 'triangle', 0.1, when); }
  lullaby(): void {
    [523, 587, 659, 784, 880, 784, 659, 523].forEach((f, i) => this.tone(f, 0.55, 'sine', 0.09, i * 0.32));
  }
  twinkle(): void { this.tone(2400 + Math.random() * 800, 0.08, 'sine', 0.02); }
  dispose(): void { try { void this.ctx?.close(); } catch { /* noop */ } this.ctx = null; }
}

type Phase = 'arrive' | 'calling' | 'yours' | 'praise' | 'emotion' | 'finale' | 'done';

export function starmail(app: App, root: HTMLElement): void {
  const s = mountScreen(root);
  s.classList.add('star-screen');
  const d = app.save.data;
  const rm = d.settings.reduceMotion;

  const chrome = el('div', 'world-chrome');
  const home = el('button', 'orb', '🏠') as HTMLButtonElement;
  home.setAttribute('aria-label', 'رجوع');
  const replay = el('button', 'orb', '🔊') as HTMLButtonElement;
  replay.setAttribute('aria-label', 'إعادة الصوت');
  chrome.append(home, replay);
  s.append(chrome);

  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas star-canvas';
  canvas.setAttribute('aria-label', 'تلة النجوم');
  s.append(canvas);

  const scene = new WorldScene(canvas, { worldW: W, worldH: H, reduceMotion: rm, background: '#070b24' });
  scene.panEnabled = false; // fixed sky: taps are for stars, never the camera
  const fx = new Feedback(scene.particles, app.audio);
  const synth = new StarSynth(app);

  const dec = decide(d.attempts, 'star-echo');
  const diff: Difficulty = dec.difficulty;
  const tol = roundTolerance(diff);
  const poolSize = diff === 0 ? 3 : diff === 1 ? 4 : 5;
  const poolOffset = diff === 0 ? 1 : 0; // gentle pool: the 3 central stars
  let seed = (Date.now() % 100000) + (d.starmail?.rounds ?? 0) * 131;

  const rand01 = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // ---- live state ----
  let phase: Phase = 'arrive';
  let round = 1;
  let motif = genMotif(rand01, roundLength(diff, 1), poolSize).map((i) => i + poolOffset);
  let callIdx = -1;          // star currently sounding (-1 = silence)
  let tapped: number[] = [];
  let tapTimes: number[] = [];
  let mistakes = 0;
  let successes = 0;
  let perfectRounds = 0;
  let emotionDone = false;
  let dance: { kind: EmotionId; until: number } | null = null;
  let finaleT0 = 0;
  let finished = false;
  let stallAt = performance.now();
  let stallSaid = false;
  let hints = 0;
  let firstTap = false;
  const t0 = Date.now();

  const say = (() => {
    const said = new Set<string>();
    let lastLine = '';
    replay.onclick = () => { app.audio.sfx('tap'); if (lastLine) app.voice.speak(lastLine, 'ar', true); };
    return (key: string, text: string) => {
      if (said.has(key)) return;
      said.add(key); lastLine = text;
      bus.emit('nova:say', { text });
      app.voice.speak(text, 'ar', true);
    };
  })();

  home.onclick = () => {
    app.audio.sfx('tap');
    synth.dispose();
    try { scene.destroy(); } catch { /* noop */ }
    app.go('world');
  };

  // ================= SKY (deep night, static stars, the Listener) =================
  const bgStars = Array.from({ length: 70 }, (_, i) => ({
    x: (i * 173 + 40) % W, y: (i * 119 + 20) % 560, s: i % 7 === 0 ? 3.5 : 2, ph: i * 1.3,
  }));
  scene.addLayer({
    parallax: 0.04,
    paint: (ctx, t) => {
      const g = ctx.createLinearGradient(0, 0, 0, 700);
      g.addColorStop(0, '#050718');
      g.addColorStop(0.7, '#0d1440');
      g.addColorStop(1, '#1c2456');
      ctx.fillStyle = g;
      ctx.fillRect(-100, -100, W + 200, 800);
      ctx.fillStyle = '#fff';
      for (const st of bgStars) {
        ctx.globalAlpha = rm ? 0.6 : 0.25 + 0.45 * Math.abs(Math.sin(t / 900 + st.ph));
        ctx.fillRect(st.x, st.y, st.s, st.s);
      }
      ctx.globalAlpha = 1;
      // small moon, far away — not interactive, just company
      ctx.fillStyle = 'rgba(235,240,255,0.85)';
      ctx.beginPath(); ctx.arc(610, 110, 24, 0, Math.PI * 2); ctx.fill();
    },
  });

  // ================= MEADOW HILL =================
  scene.addLayer({
    parallax: 1,
    paint: (ctx, t) => {
      ctx.fillStyle = '#101c33';
      ctx.beginPath(); ctx.ellipse(360, 1250, 560, 320, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#16263f';
      ctx.beginPath(); ctx.ellipse(360, 1180, 480, 240, 0, Math.PI, Math.PI * 2); ctx.fill();
      // grass tufts breathing in night wind
      ctx.strokeStyle = 'rgba(95,174,107,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 22; i++) {
        const gx = 30 + i * 32;
        const gy = 950 + ((i * 67) % 90);
        const sway = rm ? 0 : Math.sin(t / 1000 + i * 1.7) * 5;
        ctx.beginPath(); ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx + sway, gy - 16, gx + sway * 1.6, gy - 26); ctx.stroke();
      }
      // sleeping flowers (closed till the finale)
      const open = finished ? 1 : 0.25;
      for (let i = 0; i < 7; i++) {
        const fx2 = 90 + i * 90;
        const fy2 = 990 + ((i * 41) % 50);
        ctx.fillStyle = finished ? '#ff8fb0' : '#5a6a94';
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(fx2 + Math.cos(a) * 7 * open, fy2 + Math.sin(a) * 7 * open, 6 * open + 1, 4 * open + 1, a, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      void t;
    },
  });

  // ================= THE LISTENER (5 stars + the one to be born) =================
  const bornStar = (d.starmail?.completedAt ?? 0) > 0;
  const starObjs: SceneObj[] = [];
  STARS.forEach((sp, i) => {
    const inPool = i >= poolOffset && i < poolOffset + poolSize;
    const o: SceneObj = {
      id: `star-${i}`, x: sp.x, y: sp.y, r: 52, depth: 300,
      draw: (ctx, t) => {
        const sounding = callIdx === i;
        const base = rm ? 1 : 1 + 0.12 * Math.sin(t / 700 + i * 2);
        const glowR = (sounding ? 52 : 26) * base;
        const g = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, glowR);
        g.addColorStop(0, '#fffdf4');
        g.addColorStop(0.4, sounding ? '#ffe9a8' : 'rgba(200,215,255,0.7)');
        g.addColorStop(1, 'rgba(160,180,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, glowR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sounding ? 13 : 9, 0, Math.PI * 2); ctx.fill();
        // pool membership whisper: active stars breathe, others rest dim
        if (!inPool) {
          ctx.fillStyle = 'rgba(10,14,40,0.45)';
          ctx.beginPath(); ctx.arc(sp.x, sp.y, 9, 0, Math.PI * 2); ctx.fill();
        }
        // next-to-answer breathing (affordance, never the answer)
        if (phase === 'yours' && inPool) {
          const p = rm ? 0.5 : 0.3 + 0.2 * Math.sin(t / 520 + i);
          ctx.strokeStyle = `rgba(255,230,160,${p})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(sp.x, sp.y, 30, 0, Math.PI * 2); ctx.stroke();
        }
        // first touch cue (pre-reader): gone forever once the child taps
        if (!firstTap && i === poolOffset && (phase === 'yours' || phase === 'calling')) {
          spotlight(ctx, sp.x, sp.y, 40, t, rm);
        }
      },
      onTap: () => onStarTap(i),
    };
    starObjs.push(o);
    scene.addObject(o);
  });

  // the born star (persistence made visible — tonight and every night)
  const bornObj: SceneObj = {
    id: 'born-star', x: NEW_STAR.x, y: NEW_STAR.y, r: 30, depth: 301,
    draw: (ctx, t) => {
      if (!bornStar && !finished) return;
      const k = finished ? Math.min(1, (performance.now() - finaleT0) / 2000) : 1;
      const tw = rm ? 0.8 : 0.6 + 0.4 * Math.sin(t / 400);
      ctx.fillStyle = `rgba(255,240,200,${0.35 * k * tw})`;
      ctx.beginPath(); ctx.arc(NEW_STAR.x, NEW_STAR.y, 40 * k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff8dc';
      ctx.beginPath(); ctx.arc(NEW_STAR.x, NEW_STAR.y, 10 * k, 0, Math.PI * 2); ctx.fill();
    },
    onTap: () => { fx.discover(NEW_STAR.x, NEW_STAR.y); synth.twinkle(); },
  };
  scene.addObject(bornObj);

  // finale bird lines (drawn only in the WOW)
  const birdObj: SceneObj = {
    id: 'bird', x: 400, y: 290, r: 0.0001, depth: 299,
    draw: (ctx) => {
      if (!finished) return;
      ctx.strokeStyle = 'rgba(255,235,180,0.85)';
      ctx.lineWidth = 3;
      const P = [STARS[0], STARS[1], STARS[2], STARS[3], STARS[4]];
      const path: [number, number][] = [
        [P[0].x, P[0].y], [P[1].x, P[1].y], [P[2].x, P[2].y],
        [P[3].x, P[3].y], [P[4].x, P[4].y],
      ];
      ctx.beginPath();
      ctx.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(P[2].x, P[2].y); ctx.lineTo(NEW_STAR.x, NEW_STAR.y);
      ctx.stroke(); // the eye
    },
  };
  scene.addObject(birdObj);

  function onStarTap(i: number): void {
    if (phase === 'done' || finished) return;
    if (phase !== 'yours') {
      // listening, praising, feeling: every tap twinkles back — never dead, never judged
      fx.discover(STARS[i].x, STARS[i].y);
      synth.twinkle();
      return;
    }
    if (!firstTap) firstTap = true;
    const expected = motif[tapped.length];
    const now = performance.now();
    tapped.push(i);
    tapTimes.push(now);
    stallAt = now;
    synth.callNote(i);
    fx.splash(STARS[i].x, STARS[i].y);
    if (i !== expected) {
      // kind morph: the signal changes shape — information, never WRONG!
      mistakes++;
      synth.morph();
      setMood('react', 1500);
      motif = nextMotif(false, motif, rand01, diff, round);
      tapped = []; tapTimes = [];
      say('morph', '…غيّرت شكلها! اسمع منيح!');
      window.setTimeout(() => { if (document.body.contains(canvas)) playCall(); }, 1600);
      return;
    }
    synth.echoGood();
    if (tapped.length >= motif.length) {
      // round complete — praise first (extra celebratory taps twinkle, never punish)
      phase = 'praise';
      const gaps = tapTimes.slice(1).map((tm, k) => tm - tapTimes[k]);
      const sc = scoreEcho(motif, tapped, gaps.map((g) => g - CALL_GAP), tol);
      if (sc.onBeatShare >= 0.66) perfectRounds++;
      setMood('celebrate', 1800);
      fx.win(360, 300);
      app.save.update((sv) => {
        sv.starmail = {
          rounds: (sv.starmail?.rounds ?? 0) + 1,
          completedAt: sv.starmail?.completedAt ?? 0,
          motif: [...motif],
          starTint: sv.starmail?.starTint ?? 'gold',
        };
      });
      tapped = []; tapTimes = [];
      if (successes === 2 && !emotionDone) {
        phase = 'emotion';
        showEmotions();
      } else if (successes >= 3) {
        finishMail();
      } else {
        round++;
        motif = nextMotif(true, motif, rand01, diff, round);
        say('round', 'حلو! اسمع اللي بعدها!');
        window.setTimeout(() => { if (document.body.contains(canvas)) playCall(); }, 1800);
      }
    }
  }

  // ================= THE CALL (sky speaks first, always) =================
  function playCall(): void {
    if (finished || phase === 'done') return;
    phase = 'calling';
    setMood('look', motif.length * CALL_GAP + 1200);
    motif.forEach((sIdx, k) => {
      window.setTimeout(() => {
        if (!document.body.contains(canvas) || finished) return;
        callIdx = sIdx;
        synth.callNote(sIdx);
        scene.particles.spawn('star', STARS[sIdx].x, STARS[sIdx].y, 6, 40, -30);
        window.setTimeout(() => { if (callIdx === sIdx) callIdx = -1; }, 420);
        if (k === motif.length - 1) {
          window.setTimeout(() => {
            if (!document.body.contains(canvas) || finished) return;
            phase = 'yours';
            tapped = []; tapTimes = [];
            stallAt = performance.now();
            say('yours', 'دورك! المس النجوم متل ما سمعتها!');
          }, CALL_GAP);
        }
      }, 900 + k * CALL_GAP);
    });
  }

  // ================= EMOTION ROUND (she asks how Nova feels) =================
  let emotionRow: HTMLElement | null = null;
  function showEmotions(): void {
    emotionDone = true;
    say('feeling', 'نوفا حاسة بشي! شو حاسة؟ اختار!');
    emotionRow = el('div', 'emotion-row');
    for (const e of EMOTIONS) {
      const b = el('button', 'orb emotion-orb', e.emoji) as HTMLButtonElement;
      b.style.fontSize = '34px';
      b.setAttribute('aria-label', e.id);
      b.onclick = () => {
        app.audio.sfx('pop');
        dance = { kind: e.id, until: performance.now() + 3000 };
        setMood('celebrate', 3000);
        // the star answers the feeling: brighter pulse + happy motif
        motif.forEach((sIdx, k) => {
          window.setTimeout(() => {
            if (!document.body.contains(canvas)) return;
            callIdx = sIdx;
            synth.callNote(sIdx);
            window.setTimeout(() => { if (callIdx === sIdx) callIdx = -1; }, 420);
          }, 600 + k * 380);
        });
        emotionRow?.remove();
        emotionRow = null;
        round++;
        motif = nextMotif(true, motif, rand01, diff, round);
        window.setTimeout(() => {
          if (!document.body.contains(canvas) || finished) return;
          say('round', 'رقصتلك! كمّل اسمع!');
          playCall();
        }, 600 + motif.length * 380 + 1200);
      };
      emotionRow.append(b);
    }
    s.append(emotionRow);
  }

  // ================= NOVA (watches the sky, dances feelings, duets) =================
  let novaMood: NovaMood = 'idle';
  let novaUntil = 0;
  const setMood = (m: NovaMood, ms = 1600) => { novaMood = m; novaUntil = performance.now() + ms; };
  const novaObj: SceneObj = {
    id: 'nova', x: 360, y: 880, r: 48, depth: 900,
    draw: (ctx, t) => {
      const now = performance.now();
      const m = now > novaUntil ? 'idle' : novaMood;
      const dancing = dance && now < dance.until;
      let dx = 360, dy = 880;
      if (dancing && !rm) {
        const k = (now % 3000) / 3000;
        if (dance!.kind === 'joy') { dy -= Math.abs(Math.sin(k * Math.PI * 4)) * 46; dx += Math.sin(k * Math.PI * 2) * 26; }
        else if (dance!.kind === 'calm') { dx += Math.sin(k * Math.PI * 2) * 40; dy += Math.sin(k * Math.PI * 4) * 6; }
        else { dy -= Math.abs(Math.sin(k * Math.PI * 3)) * 30; dx += Math.cos(k * Math.PI * 6) * 14; }
      }
      // gaze: at the calling star, else at the next expected tap
      const lookIdx = callIdx >= 0 ? callIdx : phase === 'yours' && motif[tapped.length] !== undefined ? motif[tapped.length] : -1;
      drawNova(ctx, dx, dy, 32,
        { mood: dancing ? 'celebrate' : m, gazeX: lookIdx >= 0 ? STARS[lookIdx].x : undefined, gazeY: lookIdx >= 0 ? STARS[lookIdx].y : undefined },
        t, rm, lookFromAvatar(app.save.data.avatar), app.save.data.avatar.charm);
    },
    onTap: () => {
      fx.discover(360, 850);
      setMood('celebrate', 900);
      app.audio.sfx('pop');
    },
  };
  scene.addObject(novaObj);

  // ================= stall steward: replay the call, never the answer =================
  const steward: SceneObj = {
    id: 'steward', x: -1000, y: -1000, r: 0.0001, depth: -1000,
    draw: () => {
      const now = performance.now();
      if (!finished && phase === 'yours' && !stallSaid && now - stallAt > 50000) {
        stallSaid = true;
        hints++;
        setMood('point', 2500);
        say('stall', 'نسيت؟ اسمع مرة تانية!');
        playCall();
      }
    },
  };
  scene.addObject(steward);

  // ================= WOW: the message becomes a bird + a star is born =================
  function finishMail(): void {
    finished = true;
    phase = 'done';
    finaleT0 = performance.now();
    setMood('celebrate', 6000);
    bus.emit('nova:mood', { mood: 'celebrate' as const });
    fx.win(470, 272);
    // the full motif, then Nova's duet answer a third higher
    const answer = duetAnswer(motif);
    motif.forEach((sIdx, k) => {
      window.setTimeout(() => { if (!document.body.contains(canvas)) return; synth.callNote(sIdx); }, k * 420);
    });
    answer.forEach((sIdx, k) => {
      window.setTimeout(() => {
        if (!document.body.contains(canvas)) return;
        synth.duetPartner(MOTIF_FREQS[sIdx % MOTIF_FREQS.length], 0);
        setMood('celebrate', 1200);
      }, motif.length * 420 + 500 + k * 420);
    });
    window.setTimeout(() => { if (document.body.contains(canvas)) synth.lullaby(); }, motif.length * 420 + 500 + answer.length * 420 + 400);
    app.save.update((sv) => {
      sv.starmail = {
        rounds: (sv.starmail?.rounds ?? 0) + successes,
        completedAt: Date.now(),
        motif: [...motif],
        starTint: perfectRounds >= 2 ? 'gold' : 'silver',
      };
      sv.museum.push({
        id: `star-letter-${Date.now()}`, kind: 'star-letter',
        title: 'نجمة الرسالة', emoji: '⭐',
        description: 'سمعت السماء وفهمتها!',
        createdAt: Date.now(),
      });
    });
    app.save.saveNow();
    app.ctx().report({
      activityId: 'star-echo',
      skillIds: ['memory', 'patterns', 'listening', 'sequencing', 'sound', 'emotions', 'prediction'],
      success: true, durationMs: Date.now() - t0,
      tries: successes + mistakes, hintsUsed: hints,
      errorKind: mistakes > 0 ? 'off-beat' : undefined,
      strategyChanged: mistakes > 0, difficulty: diff,
    });
    app.ctx().earnCoins(12, 'فهمت رسالة النجوم!');
    say('finale', 'فهمت الرسالة! صار عندك نجمة باسمك!');
    const again = el('button', 'orb', '🌠') as HTMLButtonElement;
    again.setAttribute('aria-label', 'سماء جديدة');
    again.onclick = () => { app.audio.sfx('pop'); again.remove(); emotionRow?.remove(); synth.dispose(); app.go('starmail'); };
    const chrome = s.querySelector('.world-chrome');
    chrome?.append(again);
  }

  scene.start();
  if ((d.starmail?.completedAt ?? 0) > 0) {
    say('again', 'السماء مشتاقتلك! رسالة جديدة الليلة!');
  } else {
    say('arrive', 'ششش… في شي عم يلمع فوق. اسمع منيح!');
  }
  window.setTimeout(() => { if (document.body.contains(canvas)) playCall(); }, 2200);
}
