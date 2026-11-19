/* Waveform generator. Each beat is a sum of Gaussian waves (P, Q, R, S, T), the
   morphology approach used by the ECGSYN model (McSharry et al. 2003, source S10).
   Each rhythm first builds its events (P waves, conduction, dropped beats, ectopic
   beats), then draws them, then reports the features it built, so the strip always
   matches the answer key. Output: millivolts sampled at fs Hz, lead II. */
(function (root) {
  "use strict";

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRand(seed) {
    const r = mulberry32(seed);
    return {
      u: function (a, b) { return a + (b - a) * r(); },
      i: function (a, b) { return a + Math.floor(r() * (b - a + 1)); },
      pick: function (arr) { return arr[Math.floor(r() * arr.length)]; },
      n: function (mu, sd) {
        let u = 0, v = 0;
        while (u === 0) u = r();
        while (v === 0) v = r();
        return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      },
      raw: r
    };
  }

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function mean(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 0; }
  function sd(a) { const m = mean(a); return Math.sqrt(mean(a.map(function (x) { return (x - m) * (x - m); }))); }
  function diffs(a) { const o = []; for (let i = 1; i < a.length; i++) o.push(a[i] - a[i - 1]); return o; }

  function clearlyIrregular(rTimes, seconds) {
    const vis = rTimes.filter(function (t) { return t >= 0 && t < seconds; });
    const rr = diffs(vis);
    if (rr.length < 3) return false;
    let steady = 0, maxSteady = 0;
    for (let i = 1; i < rr.length; i++) {
      steady = Math.abs(rr[i] - rr[i - 1]) < 0.04 ? steady + 1 : 0;
      maxSteady = Math.max(maxSteady, steady);
    }
    return sd(rr) / mean(rr) >= 0.12 && Math.max.apply(null, rr) - Math.min.apply(null, rr) >= 0.2 && maxSteady < 2;
  }

  // Add a Gaussian wave (amplitude mV, center s, sigma s) into the sample buffer.
  // Asymmetric if sigmaR is given (sigma on the left, sigmaR on the right).
  function addWave(S, amp, center, sigma, sigmaR) {
    const buf = S.buf, fs = S.fs, t0 = S.t0;
    const sR = sigmaR || sigma;
    const from = Math.max(0, Math.floor((center - 4 * sigma - t0) * fs));
    const to = Math.min(buf.length - 1, Math.ceil((center + 4 * sR - t0) * fs));
    for (let i = from; i <= to; i++) {
      const d = t0 + i / fs - center;
      const s = d < 0 ? sigma : sR;
      buf[i] += amp * Math.exp(-(d * d) / (2 * s * s));
    }
  }

  // ---------- drawing primitives ----------
  function drawP(S, m, pOn, kind) {
    const sp = m.pDur / 5;
    if (kind === "retro") addWave(S, -m.retroAmp, pOn + 2.2 * sp, sp * 0.85);
    else if (kind === "pac") {
      if (m.pacInv) addWave(S, -m.pAmp * 0.8, pOn + 2.2 * sp, sp * 0.85);
      else addWave(S, m.pAmp * m.pacScale, pOn + 2 * sp, sp * 0.7);
    } else addWave(S, m.pAmp, pOn + 2.5 * sp, sp);
  }

  // Narrow QRS + T. Returns the beat's QRS onset and duration.
  function drawNarrow(S, m, rT, d, rrPrev, k) {
    addWave(S, m.qAmp * k, rT - 0.30 * d, 0.08 * d);
    addWave(S, m.rAmp * k, rT, 0.12 * d);
    addWave(S, m.sAmp * k, rT + 0.30 * d, 0.09 * d);
    const qrsOn = rT - 0.5 * d;
    const qt = m.qtc * Math.sqrt(clamp(rrPrev, 0.3, 1.6));
    const sFall = clamp(0.14 * qt, 0.03, 0.05);
    addWave(S, m.tAmp * k, qrsOn + qt - 2.5 * sFall, sFall * 1.5, sFall);
    return { qrsOn: qrsOn, tEnd: qrsOn + qt };
  }

  // Wide QRS (ventricular or aberrant) with a discordant T wave.
  // f = { pol, amp, tRatio, notch } ; gap = time to the next beat.
  function drawWide(S, f, rT, d, gap, k) {
    const qrsOn = rT - 0.42 * d;
    const A = f.pol * f.amp * k;
    addWave(S, A, rT, 0.17 * d, 0.21 * d);
    addWave(S, -0.3 * A + f.notch, qrsOn + 0.86 * d, 0.12 * d);
    const free = Math.max(0.04, gap - d);
    const tC = qrsOn + d + Math.min(0.16, 0.4 * free);
    const tS = clamp(0.25 * free, 0.02, 0.09);
    addWave(S, -f.tRatio * A, tC, tS * 1.2, tS);
    return { qrsOn: qrsOn };
  }

  function focus(rnd, pol, wide) {
    return { pol: pol, amp: rnd.u(0.9, 1.5), tRatio: rnd.u(0.28, 0.42), notch: rnd.u(-0.08, 0.08), qrs: wide || rnd.u(0.13, 0.17) };
  }

  // ---------- event builders (one per generator kind) ----------
  // Each returns { beats, atria, info } or null to ask for a re-draw.
  // beat: { r, type: "n" | "pac" | "pvc" | "v" | "j" | "w", qrs, p, pr, focus }
  // atria: [{ t: P onset, kind, conducted }]

  function rrSeq(rnd, meanRR, jitter, from, to) {
    const out = [];
    let t = from;
    while (t < to) { out.push(t); t += meanRR * (1 + clamp(rnd.n(0, jitter), -2.5 * jitter, 2.5 * jitter)); }
    return out;
  }

  function sinusBeats(times, prFn, d) {
    return times.map(function (pOn) {
      const pr = prFn();
      return { r: pOn + pr + 0.5 * d, type: "n", p: true, pr: pr, pOn: pOn };
    });
  }

  const builders = {
    sinus: function (g, rnd, m, T) {
      const PP = 60 / T.hr;
      const ps = rrSeq(rnd, PP, g.jitter, -rnd.u(1.2, 1.6), T.end);
      const lo = T.prLo, hi = T.prHi;
      const beats = sinusBeats(ps, function () { return clamp(m.pr + rnd.n(0, 0.003), lo, hi); }, m.qrs);
      return { beats: beats, atria: ps.map(function (t) { return { t: t, kind: "sinus", conducted: true }; }) };
    },

    sarr: function (g, rnd, m, T) {
      const PP = 60 / T.hr, A = rnd.u(0.13, 0.2), Tb = rnd.u(3.2, 5), ph = rnd.u(0, 2 * Math.PI);
      const ps = [];
      let t = -rnd.u(1.2, 1.6);
      while (t < T.end) { ps.push(t); t += PP * (1 + A * Math.sin(2 * Math.PI * t / Tb + ph)); }
      const vis = ps.filter(function (x) { return x >= 0 && x < T.seconds; });
      const pp = diffs(vis);
      if (pp.length < 4 || Math.max.apply(null, pp) - Math.min.apply(null, pp) < 0.16) return null;
      if (Math.max.apply(null, diffs(pp).map(Math.abs)) > 0.14) return null; // smooth, not sudden
      const beats = sinusBeats(ps, function () { return clamp(m.pr + rnd.n(0, 0.003), 0.121, 0.199); }, m.qrs);
      return { beats: beats, atria: ps.map(function (x) { return { t: x, kind: "sinus", conducted: true }; }), info: { ppMin: Math.min.apply(null, pp), ppMax: Math.max.apply(null, pp) } };
    },

    pause: function (g, rnd, m, T) {
      const PP = 60 / T.hr;
      const k = rnd.raw() < 0.5 ? rnd.u(1.6, 1.85) : rnd.u(2.3, 2.7); // never an exact multiple
      const at = rnd.u(1.0, 3.2);
      const ps = [];
      let t = -rnd.u(1.2, 1.6), paused = false, pauseLen = 0, pauseAt = 0;
      while (t < T.end) {
        ps.push(t);
        let step = PP * (1 + clamp(rnd.n(0, g.jitter), -0.025, 0.025));
        if (!paused && t >= at) { pauseLen = PP * k; pauseAt = t; step = pauseLen; paused = true; }
        t += step;
      }
      if (pauseAt + pauseLen > T.seconds - 0.4) return null;
      const beats = sinusBeats(ps, function () { return clamp(m.pr + rnd.n(0, 0.003), 0.121, 0.199); }, m.qrs);
      return { beats: beats, atria: ps.map(function (x) { return { t: x, kind: "sinus", conducted: true }; }), info: { pauseLen: pauseLen, pp: PP } };
    },

    pac: function (g, rnd, m, T) {
      const PP = 60 / T.hr;
      const nPac = rnd.raw() < 0.6 ? 1 : 2;
      const ps = [];
      let t = -rnd.u(1.2, 1.6), sinceLast = 0, made = 0;
      const pacAt = [rnd.u(0.6, 2.4), rnd.u(3.0, 4.4)].slice(0, nPac);
      const beats = [];
      while (t < T.end) {
        beats.push({ pOn: t, type: "n" });
        let next = t + PP * (1 + clamp(rnd.n(0, g.jitter), -0.025, 0.025));
        if (made < pacAt.length && t >= pacAt[made] && sinceLast >= 2) {
          const pt = t + PP * rnd.u(0.62, 0.74);
          beats.push({ pOn: pt, type: "pac" });
          next = pt + PP * rnd.u(1.02, 1.15); // sinus node reset: less than a full compensatory pause
          made++; sinceLast = 0;
        } else sinceLast++;
        t = next;
      }
      if (made < 1) return null;
      const out = beats.map(function (b) {
        const pr = b.type === "pac" ? clamp(m.pr + rnd.u(-0.02, 0.02), 0.125, 0.195) : clamp(m.pr + rnd.n(0, 0.003), 0.121, 0.199);
        return { r: b.pOn + pr + 0.5 * m.qrs, type: b.type, p: true, pr: pr, pOn: b.pOn };
      });
      return { beats: out, atria: out.map(function (b) { return { t: b.pOn, kind: b.type === "pac" ? "pac" : "sinus", conducted: true }; }), info: { pp: PP } };
    },

    pvc: function (g, rnd, m, T) {
      const RR = 60 / T.hr;
      const fa = focus(rnd, rnd.raw() < 0.6 ? 1 : -1);
      const fb = focus(rnd, -fa.pol);
      fb.qrs = clamp(fa.qrs + (rnd.raw() < 0.5 ? -1 : 1) * rnd.u(0.02, 0.035), 0.125, 0.19);
      const sched = rrSeq(rnd, RR, g.jitter, -rnd.u(1.0, 1.4), T.end + 1);
      const beats = [];
      const pat = g.pattern;
      // Choose which sinus slots get a PVC after them.
      const slots = [];
      sched.forEach(function (s, i) { if (s >= 0.15 && s <= T.seconds - 1.0) slots.push(i); });
      let pvcAfter = {};
      if (pat === "bigeminy") {
        const start = slots[0] + (rnd.raw() < 0.5 ? 0 : 0);
        for (let i = start - 4; i < sched.length; i += 2) pvcAfter[i] = [fa];
      } else if (pat === "couplet") {
        const i = rnd.pick(slots.filter(function (j) { return sched[j] >= 0.8 && sched[j] <= T.seconds - 1.8; }));
        if (i == null) return null;
        pvcAfter[i] = [fa, fa];
      } else {
        const want = pat === "multi" ? rnd.i(2, 3) : rnd.i(1, 2);
        const pool = slots.slice();
        for (let n = 0; n < want; n++) {
          const free = pool.filter(function (j) { return !pvcAfter[j] && !pvcAfter[j - 1] && !pvcAfter[j + 1] && !pvcAfter[j - 2] && !pvcAfter[j + 2]; });
          if (!free.length) break;
          pvcAfter[rnd.pick(free)] = [null];
        }
        const keys = Object.keys(pvcAfter).map(Number).sort(function (a, b) { return a - b; });
        if (pat === "multi" && keys.length < 2) return null;
        keys.forEach(function (j, n) {
          pvcAfter[j] = [pat === "multi" ? (n % 2 === 0 ? fa : fb) : fa];
        });
      }
      let skip = 0;
      for (let i = 0; i < sched.length; i++) {
        if (skip > 0) { skip--; continue; }
        const pOn = sched[i];
        const pr = clamp(m.pr + rnd.n(0, 0.003), 0.121, 0.199);
        const r = pOn + pr + 0.5 * m.qrs;
        beats.push({ r: r, type: "n", p: true, pr: pr, pOn: pOn });
        if (pvcAfter[i]) {
          let t = r + RR * rnd.u(0.56, 0.68);
          pvcAfter[i].forEach(function (f, n) {
            if (n > 0) t += rnd.u(0.40, 0.46);
            beats.push({ r: t, type: "pvc", p: false, focus: f, qrs: f.qrs });
          });
          // Full compensatory pause: the next sinus beat comes on schedule, the one(s)
          // hidden by the PVC are skipped.
          skip = 1;
          while (i + skip + 1 < sched.length && sched[i + skip + 1] + pr + 0.5 * m.qrs - t < 0.42) skip++;
        }
      }
      const vis = beats.filter(function (b) { return b.type === "pvc" && b.r >= 0.1 && b.r <= T.seconds - 0.25; });
      const all = beats.filter(function (b) { return b.type === "pvc" && b.r > -0.2 && b.r < T.seconds + 0.2; });
      if (vis.length !== all.length || !vis.length) return null;
      if (pat === "multi" && new Set(vis.map(function (b) { return b.focus; })).size < 2) return null;
      if (pat === "bigeminy" && vis.length < 2) return null;
      return { beats: beats, atria: beats.filter(function (b) { return b.p; }).map(function (b) { return { t: b.pOn, kind: "sinus", conducted: true }; }), info: { rr: RR, foci: new Set(vis.map(function (b) { return b.focus; })).size, pvcs: vis.length } };
    },

    junc: function (g, rnd, m, T) {
      const RR = 60 / T.hr;
      const mode = rnd.pick(g.pModes);
      const rs = rrSeq(rnd, RR, g.jitter, -rnd.u(1.0, 1.6), T.end);
      const prJ = rnd.u(0.06, 0.10), rp = rnd.u(0.05, 0.10);
      const beats = [], atria = [];
      rs.forEach(function (r) {
        const qrsOn = r - 0.5 * m.qrs;
        const b = { r: r, type: "j", p: false };
        if (mode === "before") { b.pOn = qrsOn - prJ; b.pr = prJ; atria.push({ t: b.pOn, kind: "retro", conducted: true }); }
        if (mode === "after") { atria.push({ t: qrsOn + m.qrs + rp, kind: "retro", conducted: true }); }
        beats.push(b);
      });
      return { beats: beats, atria: atria, info: { pMode: mode } };
    },

    svt: function (g, rnd, m, T) {
      const RR = 60 / T.hr;
      const rs = rrSeq(rnd, RR, g.jitter, -rnd.u(0.6, 1.0), T.end);
      return { beats: rs.map(function (r) { return { r: r, type: "j", p: false }; }), atria: [] };
    },

    flutter: function (g, rnd, m, T) {
      const fr = rnd.u(g.atrialRate[0], g.atrialRate[1]), Tf = 60 / fr;
      const x = rnd.raw();
      const mode = x < 0.32 ? 2 : x < 0.5 ? 3 : x < 0.78 ? 4 : "var";
      const fStart = -rnd.u(1.6, 2.0);
      const av = rnd.u(0.20, 0.26);
      const beats = [];
      let k = 0, ratios = [];
      while (fStart + k * Tf < T.end) {
        const n = mode === "var" ? rnd.pick([2, 2, 3, 4]) : mode;
        beats.push({ r: fStart + k * Tf + av + 0.5 * m.qrs, type: "n", p: false });
        ratios.push(n);
        k += n;
      }
      const vis = beats.filter(function (b) { return b.r >= 0 && b.r < T.seconds; });
      const rr = diffs(vis.map(function (b) { return b.r; }));
      if (mode === "var") {
        const rounded = new Set(rr.map(function (v) { return Math.round(v / Tf); }));
        if (rounded.size < 2) return null;
      }
      return { beats: beats, atria: [], info: { flutterRate: fr, Tf: Tf, fStart: fStart, ratio: mode, ratios: ratios } };
    },

    fib: function (g, rnd, m, T) {
      const meanRR = 60 / T.hr;
      const sigmaIrr = rnd.u(g.irregularity[0], g.irregularity[1]);
      let rs = [];
      for (let attempt = 0; attempt < 60; attempt++) {
        rs = [];
        let t = -rnd.u(0.6, 1.0) * meanRR - meanRR;
        while (t < T.end) {
          rs.push(t);
          t += clamp(meanRR * Math.exp(rnd.n(0, sigmaIrr) - (sigmaIrr * sigmaIrr) / 2), 0.36, 1.6);
        }
        if (clearlyIrregular(rs, T.seconds)) break;
      }
      if (!clearlyIrregular(rs, T.seconds)) return null;
      return { beats: rs.map(function (r) { return { r: r, type: "n", p: false }; }), atria: [], info: { coarse: rnd.raw() < 0.4 } };
    },

    vent: function (g, rnd, m, T) {
      const RR = 60 / T.hr;
      const f = focus(rnd, rnd.raw() < 0.6 ? 1 : -1, Math.min(m.qrsW, 0.55 * RR));
      const rs = rrSeq(rnd, RR, g.jitter, -rnd.u(0.6, 1.2) * RR - RR, T.end);
      return { beats: rs.map(function (r) { return { r: r, type: "v", p: false, focus: f, qrs: f.qrs }; }), atria: [] };
    },

    torsades: function (g, rnd, m, T) {
      const RR = 60 / T.hr;
      const Tw = rnd.u(3.6, 5.0), ph = rnd.u(0, 2 * Math.PI), Amax = rnd.u(1.0, 1.5);
      const rs = rrSeq(rnd, RR, 0.05, -1.0, T.end);
      const d = Math.min(m.qrsW, 0.5 * RR);
      const beats = rs.map(function (r) {
        const c = Math.cos(2 * Math.PI * r / Tw + ph);
        return { r: r, type: "v", p: false, qrs: d, focus: { pol: c >= 0 ? 1 : -1, amp: Amax * Math.abs(c), tRatio: 0, notch: 0 } };
      });
      const vis = beats.filter(function (b) { return b.r >= 0 && b.r < T.seconds; });
      if (new Set(vis.map(function (b) { return b.focus.pol; })).size < 2) return null;
      return { beats: beats, atria: [], info: { twist: Tw, ph: ph, Amax: Amax } };
    },

    vf: function (g, rnd, m, T) { return { beats: [], atria: [], info: { coarse: rnd.raw() < 0.55 } }; },
    asystole: function () { return { beats: [], atria: [] }; },

    wenck: function (g, rnd, m, T) {
      const PP = 60 / T.atrialHr;
      const G = rnd.i(g.groups[0], T.atrialHr > 85 ? Math.min(4, g.groups[1]) : g.groups[1]);
      const vary = rnd.raw() < 0.25;
      const pr0 = rnd.u(g.pr0[0], g.pr0[1]);
      const inc1 = rnd.u(0.07, T.atrialHr > 85 ? 0.10 : 0.13), decay = rnd.u(0.45, 0.6);
      const beats = [], atria = [];
      let t = -rnd.u(2.5, 3.5), pos = rnd.i(0, G - 1), size = G;
      while (t < T.end) {
        if (pos < size - 1) {
          let pr = pr0, inc = inc1;
          for (let j = 0; j < pos; j++) { pr += inc; inc = Math.max(0.016, inc * decay); }
          beats.push({ r: t + pr + 0.5 * m.qrs, type: "n", p: true, pr: pr, pOn: t, idx: pos });
          atria.push({ t: t, kind: "sinus", conducted: true });
          pos++;
        } else {
          atria.push({ t: t, kind: "sinus", conducted: false });
          pos = 0;
          size = vary ? clamp(G + rnd.i(-1, 1), 3, 6) : G;
        }
        t += PP * (1 + clamp(rnd.n(0, 0.006), -0.015, 0.015));
      }
      const drops = atria.filter(function (a) { return !a.conducted && a.t >= 0.4 && a.t <= T.seconds - 0.5; });
      if (!drops.length) return null;
      // Need a visible conducted beat before and after at least one drop.
      const ok = drops.some(function (a) {
        return beats.some(function (b) { return b.pOn < a.t && b.pOn > a.t - 1.5 * PP && b.r > 0; }) &&
          beats.some(function (b) { return b.pOn > a.t && b.pOn < a.t + 1.5 * PP && b.r < T.seconds - 0.1; });
      });
      if (!ok) return null;
      return { beats: beats, atria: atria, info: { pp: PP, group: G } };
    },

    mobitz2: function (g, rnd, m, T) {
      const PP = 60 / T.atrialHr;
      const wide = rnd.raw() < g.wideChance;
      const pr = rnd.u(g.pr[0], g.pr[1]);
      const run = rnd.i(g.runs[0], g.runs[1]);
      const vary = rnd.raw() < 0.3;
      const d = wide ? rnd.u(g.qrsWide[0], g.qrsWide[1]) : m.qrs;
      const f = wide ? focus(rnd, 1, d) : null;
      const beats = [], atria = [];
      let t = -rnd.u(2.5, 3.5), pos = rnd.i(0, run), size = run;
      while (t < T.end) {
        if (pos < size) {
          const p = clamp(pr + rnd.n(0, 0.002), 0.121, 0.199);
          beats.push(wide ? { r: t + p + 0.42 * d, type: "w", p: true, pr: p, pOn: t, focus: f, qrs: d }
            : { r: t + p + 0.5 * d, type: "n", p: true, pr: p, pOn: t });
          atria.push({ t: t, kind: "sinus", conducted: true });
          pos++;
        } else {
          atria.push({ t: t, kind: "sinus", conducted: false });
          pos = 0;
          size = vary ? clamp(run + rnd.i(-1, 1), 2, 5) : run;
        }
        t += PP * (1 + clamp(rnd.n(0, 0.005), -0.012, 0.012));
      }
      const drops = atria.filter(function (a) { return !a.conducted && a.t >= 0.4 && a.t <= T.seconds - 0.6; });
      if (!drops.length) return null;
      return { beats: beats, atria: atria, info: { pp: PP, wide: wide } };
    },

    third: function (g, rnd, m, T) {
      const PP = 60 / T.atrialHr;
      const ventEsc = rnd.raw() < 0.5;
      const vr = ventEsc ? rnd.u(g.vent[0], g.vent[1]) : rnd.u(g.junc[0], g.junc[1]);
      if (T.atrialHr < 1.4 * vr) return null;
      const RR = 60 / vr;
      const d = ventEsc ? rnd.u(g.qrsWide[0], g.qrsWide[1]) : m.qrs;
      const f = ventEsc ? focus(rnd, rnd.raw() < 0.6 ? 1 : -1, d) : null;
      const rs = rrSeq(rnd, RR, 0.008, -rnd.u(0.5, 1.0) * RR - RR, T.end);
      const ps = rrSeq(rnd, PP, 0.006, -rnd.u(1.5, 2.5), T.end);
      const beats = rs.map(function (r) {
        return ventEsc ? { r: r, type: "v", p: false, focus: f, qrs: d } : { r: r, type: "j", p: false, qrs: d };
      });
      // P-to-QRS distance for each QRS (nearest P before it): must wander (dissociation).
      const vis = beats.filter(function (b) { return b.r >= 0 && b.r < T.seconds; });
      if (vis.length < 3) return null;
      const pq = vis.map(function (b) {
        const on = b.r - (ventEsc ? 0.42 : 0.5) * d;
        const before = ps.filter(function (p) { return p < on - 0.02; });
        return on - before[before.length - 1];
      });
      if (Math.max.apply(null, pq) - Math.min.apply(null, pq) < 0.12) return null;
      return { beats: beats, atria: ps.map(function (t) { return { t: t, kind: "sinus", conducted: false }; }), info: { vr: vr, ventEsc: ventEsc, pqMin: Math.min.apply(null, pq), pqMax: Math.max.apply(null, pq) } };
    }
  };

  function draw(kind, ev, m, S, rnd, T) {
    const beats = ev.beats;
    if (kind === "torsades") return drawTorsades(S, ev);
    for (let i = 0; i < beats.length; i++) {
      const b = beats[i];
      const rrPrev = i > 0 ? b.r - beats[i - 1].r : 0.8;
      const gap = i < beats.length - 1 ? beats[i + 1].r - b.r : 0.8;
      const k = 1 + rnd.n(0, 0.02);
      if (b.type === "n" || b.type === "pac" || b.type === "j") {
        const d = b.qrs || clamp(m.qrs * (1 + rnd.n(0, 0.02)), 0.05, m.narrowMax);
        b.qrs = d;
        const o = drawNarrow(S, m, b.r, d, kind === "fib" ? clamp(rrPrev, 0.4, 1.4) : (kind === "pvc" || kind === "pac" ? 60 / T.hr : rrPrev), k);
        b.qrsOn = o.qrsOn; b.tEnd = o.tEnd;
      } else {
        const o = drawWide(S, b.focus, b.r, b.qrs, gap, k);
        b.qrsOn = o.qrsOn;
      }
    }
    ev.atria.forEach(function (a) { drawP(S, m, a.t, a.kind); });
  }

  // Torsades: one continuous oscillation, one cycle per beat, whose amplitude follows a
  // slow cosine, so the complexes grow, shrink and flip direction (the "twist").
  function drawTorsades(S, ev) {
    const rs = ev.beats.map(function (b) { return b.r; });
    const info = ev.info;
    let j = 0;
    for (let i = 0; i < S.buf.length; i++) {
      const t = S.t0 + i / S.fs;
      while (j < rs.length - 2 && t > rs[j + 1]) j++;
      if (t < rs[0] || t > rs[rs.length - 1]) continue;
      const ph = 2 * Math.PI * ((t - rs[j]) / (rs[j + 1] - rs[j]));
      const env = info.Amax * Math.cos(2 * Math.PI * t / info.twist + info.ph);
      S.buf[i] += env * (0.8 * Math.cos(ph) + 0.2 * Math.cos(2 * ph));
    }
    ev.beats.forEach(function (b) { b.qrsOn = b.r - 0.42 * b.qrs; });
  }

  function addFlutter(S, info, rnd) {
    const A = rnd.u(0.2, 0.32), fall = rnd.u(0.22, 0.35);
    const raw = new Float32Array(S.buf.length);
    for (let i = 0; i < raw.length; i++) {
      const t = S.t0 + i / S.fs;
      let ph = ((t - info.fStart) / info.Tf) % 1;
      if (ph < 0) ph += 1;
      // Inverted sawtooth in lead II: quick fall, slower climb back.
      raw[i] = ph < fall ? -ph / fall : -1 + (ph - fall) / (1 - fall);
    }
    const w = Math.round(0.02 * S.fs);
    for (let i = 0; i < raw.length; i++) {
      let s = 0, c = 0;
      for (let j = i - w; j <= i + w; j++) if (j >= 0 && j < raw.length) { s += raw[j]; c++; }
      S.buf[i] += A * (s / c + 0.5);
    }
  }

  function addFib(S, info, rnd) {
    const A0 = info.coarse ? rnd.u(0.06, 0.11) : rnd.u(0.02, 0.05);
    const comps = [0, 1, 2].map(function () { return { f: rnd.u(6, 9), ph: rnd.u(0, 2 * Math.PI), w: rnd.u(0.4, 1) }; });
    const modF = rnd.u(0.2, 0.5), modPh = rnd.u(0, 2 * Math.PI);
    const wsum = comps.reduce(function (s, c) { return s + c.w; }, 0);
    for (let i = 0; i < S.buf.length; i++) {
      const tt = S.t0 + i / S.fs;
      let v = 0;
      for (const c of comps) v += c.w * Math.sin(2 * Math.PI * c.f * tt + c.ph + 0.6 * Math.sin(2 * Math.PI * 0.7 * tt + c.ph));
      S.buf[i] += A0 * (0.65 + 0.35 * Math.sin(2 * Math.PI * modF * tt + modPh)) * (v / wsum) * 1.6;
    }
  }

  // VF: chaotic deflections, 4 to 7 Hz components (240 to 420/min, inside LITFL's 150 to 500).
  function addVF(S, info, rnd) {
    const A = info.coarse ? rnd.u(0.45, 0.8) : rnd.u(0.16, 0.26);
    const comps = [0, 1, 2, 3].map(function () { return { f: rnd.u(4, 7), ph: rnd.u(0, 2 * Math.PI), w: rnd.u(0.5, 1), mf: rnd.u(0.3, 1.2), mp: rnd.u(0, 6.28) }; });
    const wsum = comps.reduce(function (s, c) { return s + c.w; }, 0);
    for (let i = 0; i < S.buf.length; i++) {
      const t = S.t0 + i / S.fs;
      let v = 0;
      for (const c of comps) v += c.w * (0.55 + 0.45 * Math.sin(2 * Math.PI * c.mf * t + c.mp)) * Math.sin(2 * Math.PI * c.f * t + c.ph + 0.8 * Math.sin(2 * Math.PI * 0.9 * t + c.mp));
      S.buf[i] += A * 1.4 * v / wsum;
    }
  }

  // ---------- generate ----------
  function pickEdge(g, rnd) {
    if (!g.edge) return null;
    const keys = Object.keys(g.edge);
    const key = rnd.pick(keys);
    return { key: key, range: rnd.pick(g.edge[key]) };
  }

  function generate(rhythmId, opts) {
    opts = opts || {};
    const R = root.EKG.rhythms.byId[rhythmId];
    if (!R) throw new Error("Unknown rhythm " + rhythmId);
    const seed0 = opts.seed != null ? opts.seed : Math.floor(Math.random() * 4294967296);
    for (let attempt = 0; attempt < 200; attempt++) {
      const st = build(R, Object.assign({}, opts, { seed: (seed0 + attempt * 2654435761) >>> 0 }));
      if (st && fits(R, st)) { st.seed = seed0; st.attempt = attempt; return st; }
    }
    throw new Error("Could not build a valid strip for " + rhythmId);
  }

  // The strip's rate (both methods) must sit inside the criteria; narrow/wide etc. too.
  function fits(R, st) {
    const m = st.measures, k = R.criteria;
    if (k.rate) {
      const rate = m.feat.reg === "regular" ? m.rate : m.rate6s;
      if (rate < k.rate[0] || rate > k.rate[1]) return false;
      if (m.feat.reg === "regular" && (m.rateFromBoxes < k.rate[0] || m.rateFromBoxes > k.rate[1])) return false;
    }
    if (m.qrsKind !== "none" && m.count6s < 3) return false;
    if (m.feat.reg === "regular" && m.rrCV >= 0.05) return false;
    for (const f of ["reg", "atrial", "pr", "qrs", "ectopy", "shape"]) {
      if (k[f].indexOf(m.feat[f]) < 0) return false;
    }
    return true;
  }

  function build(R, opts) {
    const g = R.gen;
    const fs = opts.fs || 250;
    const seconds = opts.seconds || 6;
    const rnd = makeRand(opts.seed);
    const edge = opts.borderline ? pickEdge(g, rnd) : null;
    const rng = function (key, fallback) { return edge && edge.key === key ? edge.range : (g[key] || fallback); };

    const rateR = rng("rate", g.rate || [60, 60]);
    const T = {
      seconds: seconds, end: seconds + 1.2,
      hr: rnd.u(rateR[0], rateR[1]),
      atrialHr: g.atrialRate ? rnd.u(g.atrialRate[0], g.atrialRate[1]) : 0,
      prLo: 0.121, prHi: 0.199
    };
    const prR = rng("pr", g.pr || [0.14, 0.18]);
    if (prR[0] > 0.2) { T.prLo = 0.206; T.prHi = 0.40; }
    const qrsR = rng("qrs", g.qrs || [0.08, 0.10]);
    const fib = g.kind === "fib", flut = g.kind === "flutter";
    const m = {
      pAmp: rnd.u(0.10, 0.20),
      pDur: rnd.u(0.08, 0.11),
      retroAmp: rnd.u(0.08, 0.14),
      pacScale: rnd.u(1.3, 1.6),
      pacInv: rnd.raw() < 0.45,
      pr: rnd.u(prR[0], prR[1]),
      qrs: rnd.u(qrsR[0], qrsR[1]),
      qrsW: rnd.u(qrsR[0], qrsR[1]),
      narrowMax: 0.114,
      rAmp: rnd.u(0.8, 1.5),
      qAmp: -rnd.u(0.04, 0.14),
      sAmp: -rnd.u(0.12, 0.32),
      tAmp: rnd.u(0.18, 0.38) * (fib ? 0.8 : flut ? 0.4 : 1),
      qtc: rnd.u(0.38, 0.43)
    };
    if (m.qrs >= 0.12) m.narrowMax = 0.2;

    const ev = builders[g.kind](g, rnd, m, T);
    if (!ev) return null;
    ev.info = ev.info || {};

    const pad = 2.0;
    const S = { fs: fs, t0: -pad, buf: new Float32Array(Math.round((seconds + pad + 1.5) * fs)) };
    draw(g.kind, ev, m, S, rnd, T);
    if (flut) addFlutter(S, ev.info, rnd);
    if (fib) addFib(S, ev.info, rnd);
    if (g.kind === "vf") addVF(S, ev.info, rnd);

    // Baseline wander and a little noise, like a real monitor.
    const wA = g.kind === "asystole" ? rnd.u(0.01, 0.03) : rnd.u(0.01, 0.04);
    const wF = rnd.u(0.15, 0.35), wPh = rnd.u(0, 2 * Math.PI);
    const noise = rnd.u(0.003, 0.008);
    for (let i = 0; i < S.buf.length; i++) {
      const tt = S.t0 + i / fs;
      S.buf[i] += wA * Math.sin(2 * Math.PI * wF * tt + wPh) + rnd.n(0, noise);
    }

    const start = Math.round(pad * fs);
    const samples = S.buf.slice(start, start + Math.round(seconds * fs));
    const beats = ev.beats.filter(function (b) { return b.r > -1 && b.r < seconds + 1; });
    const atria = ev.atria.filter(function (a) { return a.t > -1 && a.t < seconds + 1; });
    return {
      rhythm: R.id,
      fs: fs,
      seconds: seconds,
      samples: samples,
      beats: beats,
      atria: atria,
      edge: edge ? edge.key : null,
      info: ev.info,
      measures: measure(R, g.kind, ev, seconds)
    };
  }

  // What a careful reader would measure on this strip, plus the feature labels the
  // answer key compares (used for feedback and tests).
  function measure(R, kind, ev, seconds) {
    const inS = function (t) { return t >= 0 && t < seconds; };
    const beats = ev.beats.filter(function (b) { return inS(b.r); });
    const rT = beats.map(function (b) { return b.r; });
    const rr = diffs(rT);
    const mRR = mean(rr) || 1;
    const dom = beats.filter(function (b) { return b.type !== "pvc" && b.type !== "pac"; });
    const pvcs = beats.filter(function (b) { return b.type === "pvc"; });
    const conducted = dom.filter(function (b) { return b.p; });
    const prs = conducted.map(function (b) { return b.pr; });
    const qrs = mean(dom.map(function (b) { return b.qrs; }));
    const atriaIn = ev.atria.filter(function (a) { return inS(a.t); });
    const pp = diffs(atriaIn.filter(function (a) { return a.kind === "sinus"; }).map(function (a) { return a.t; }));
    const boxes = Math.round(mRR / 0.04);
    const out = {
      count6s: beats.length,
      rate6s: Math.round(beats.length * (60 / seconds)),
      rate: Math.round(60 / mRR),
      rateBoxes: boxes,
      rateFromBoxes: Math.round(1500 / boxes),
      rrMean: mRR,
      rrMin: rr.length ? Math.min.apply(null, rr) : 0,
      rrMax: rr.length ? Math.max.apply(null, rr) : 0,
      rrCV: rr.length ? sd(rr) / mRR : 0,
      pr: prs.length ? mean(prs) : null,
      prMin: prs.length ? Math.min.apply(null, prs) : null,
      prMax: prs.length ? Math.max.apply(null, prs) : null,
      qrs: qrs,
      pvcQrs: pvcs.length ? mean(pvcs.map(function (b) { return b.qrs; })) : null,
      pvcCount: pvcs.length,
      pacCount: beats.filter(function (b) { return b.type === "pac"; }).length,
      pCount: atriaIn.length,
      dropped: atriaIn.filter(function (a) { return a.kind === "sinus" && !a.conducted; }).length,
      atrialRate: pp.length ? Math.round(60 / mean(pp)) : null,
      ppMin: pp.length ? Math.min.apply(null, pp) : null,
      ppMax: pp.length ? Math.max.apply(null, pp) : null
    };
    out.wide = qrs >= 0.12;
    out.qrsKind = beats.length ? (out.wide ? "wide" : "narrow") : "none";

    // Feature labels (same vocabulary as rhythms.js criteria).
    const f = { reg: "regular", atrial: "sinus", pr: "normal", qrs: out.qrsKind, ectopy: "none", shape: "organized" };
    switch (kind) {
      case "sinus": f.pr = out.pr > 0.2 ? "long" : "normal"; break;
      case "sarr": f.reg = "phasic"; break;
      case "pause": f.reg = "pause"; break;
      case "pac": f.reg = "early"; f.ectopy = "pac"; break;
      case "pvc": f.reg = "early"; f.ectopy = { uni: "pvc-uni", multi: "pvc-multi", bigeminy: "bigeminy", couplet: "couplet" }[R.gen.pattern]; break;
      case "junc":
        f.atrial = ev.info.pMode === "hidden" ? "none" : "retro";
        f.pr = ev.info.pMode === "before" ? "short" : "none";
        if (f.pr === "short") out.pr = mean(beats.map(function (b) { return b.pr; }));
        break;
      case "svt": f.atrial = "none"; f.pr = "none"; break;
      case "flutter": f.atrial = "flutter"; f.pr = "none"; f.reg = ev.info.ratio === "var" ? "irregular" : "regular"; out.flutterRate = Math.round(ev.info.flutterRate); break;
      case "fib": f.atrial = "fib"; f.pr = "none"; f.reg = "irregular"; break;
      case "vent": f.atrial = "none"; f.pr = "none"; f.shape = "mono"; break;
      case "torsades": f.atrial = "none"; f.pr = "none"; f.shape = "twist"; f.reg = out.rrCV < 0.05 ? "regular" : "irregular"; break;
      case "vf": f.atrial = "none"; f.pr = "none"; f.reg = "none"; f.shape = "chaotic"; break;
      case "asystole": f.atrial = "none"; f.pr = "none"; f.reg = "none"; f.shape = "flat"; break;
      case "wenck": f.reg = "dropped"; f.atrial = "more"; f.pr = "lengthens"; break;
      case "mobitz2": f.reg = "dropped"; f.atrial = "more"; f.pr = out.pr > 0.2 ? "long" : "normal"; break;
      case "third": f.atrial = "more"; f.pr = "variable"; out.pqMin = ev.info.pqMin; out.pqMax = ev.info.pqMax; break;
    }
    if (kind === "wenck") {
      // PR right after a drop (shortest) and right before the next drop (longest).
      const after = conducted.filter(function (b) { return b.idx === 0; }).map(function (b) { return b.pr; });
      const maxIdx = Math.max.apply(null, conducted.map(function (b) { return b.idx; }));
      out.prFirst = after.length ? mean(after) : out.prMin;
      out.prLast = out.prMax;
      out.maxIdx = maxIdx;
    }
    if (kind === "vf") out.coarse = !!ev.info.coarse;
    if (kind === "fib") out.coarse = !!ev.info.coarse;
    if (kind === "flutter") out.ratio = ev.info.ratio;
    if (kind === "pause") { out.pauseLen = ev.info.pauseLen; out.pp = ev.info.pp; }
    if (kind === "pvc") out.foci = ev.info.foci;
    if (kind === "junc") out.pMode = ev.info.pMode;
    if (kind === "third") out.escape = ev.info.ventEsc ? "ventricular" : "junctional";
    if (kind === "pac" || kind === "pvc") {
      out.baseRR = kind === "pac" ? ev.info.pp : ev.info.rr;
      out.baseRate = Math.round(60 / out.baseRR);
    }
    out.feat = f;
    out.regular = f.reg === "regular";
    out.pWaves = f.atrial === "sinus";
    return out;
  }

  root.EKG = root.EKG || {};
  root.EKG.ecg = { generate: generate, makeRand: makeRand, fits: fits };
})(typeof window !== "undefined" ? window : globalThis);
