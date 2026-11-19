/* Waveform generator. Each beat is a sum of Gaussian waves (P, Q, R, S, T), the
   morphology approach used by the ECGSYN model (McSharry et al. 2003, source S10).
   Timing comes from the rhythm's generator ranges in rhythms.js, so the strip always
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
    const rand = {
      u: function (a, b) { return a + (b - a) * r(); },
      pick: function (arr) { return arr[Math.floor(r() * arr.length)]; },
      n: function (mu, sd) {
        let u = 0, v = 0;
        while (u === 0) u = r();
        while (v === 0) v = r();
        return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      },
      raw: r
    };
    return rand;
  }

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  function clearlyIrregular(rTimes, seconds) {
    const vis = rTimes.filter(function (t) { return t >= 0 && t < seconds; });
    const rr = [];
    for (let i = 1; i < vis.length; i++) rr.push(vis[i] - vis[i - 1]);
    if (rr.length < 3) return false;
    const mean = rr.reduce(function (a, b) { return a + b; }, 0) / rr.length;
    const sd = Math.sqrt(rr.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / rr.length);
    // No two neighbouring intervals nearly equal for long, and an obvious spread.
    let steady = 0, maxSteady = 0;
    for (let i = 1; i < rr.length; i++) {
      steady = Math.abs(rr[i] - rr[i - 1]) < 0.04 ? steady + 1 : 0;
      maxSteady = Math.max(maxSteady, steady);
    }
    return sd / mean >= 0.12 && Math.max.apply(null, rr) - Math.min.apply(null, rr) >= 0.2 && maxSteady < 2;
  }

  // Add a Gaussian wave (amplitude mV, center s, sigma s) into the sample buffer.
  // Asymmetric if sigmaR is given (sigma on the left, sigmaR on the right).
  function addWave(buf, fs, t0, amp, center, sigma, sigmaR) {
    const sR = sigmaR || sigma;
    const from = Math.max(0, Math.floor((center - 4 * sigma - t0) * fs));
    const to = Math.min(buf.length - 1, Math.ceil((center + 4 * sR - t0) * fs));
    for (let i = from; i <= to; i++) {
      const t = t0 + i / fs;
      const d = t - center;
      const s = d < 0 ? sigma : sR;
      buf[i] += amp * Math.exp(-(d * d) / (2 * s * s));
    }
  }

  function generate(rhythmId, opts) {
    opts = opts || {};
    const R = root.EKG.rhythms.byId[rhythmId];
    if (!R) throw new Error("Unknown rhythm " + rhythmId);
    const g = R.gen;
    const fs = opts.fs || 250;
    const seconds = opts.seconds || 6;
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 4294967296);
    const rnd = makeRand(seed);

    const hr = rnd.u(g.rate[0], g.rate[1]);
    const meanRR = 60 / hr;

    // Beat times (R peaks), starting before the strip so the edges are cut naturally.
    const sigmaIrr = g.atrial === "fib" ? rnd.u(g.irregularity[0], g.irregularity[1]) : 0;
    let rTimes = [];
    // AFib: redraw until the visible R-R spacing is clearly irregular, so a random
    // draw never produces a strip that looks regular (that would be a bad teaching strip).
    for (let attempt = 0; attempt < 60; attempt++) {
      rTimes = [];
      let t = -rnd.u(0.6, 1.0) * meanRR - meanRR;
      while (t < seconds + 1.0) {
        rTimes.push(t);
        let rr;
        if (g.atrial === "fib") {
          rr = meanRR * Math.exp(rnd.n(0, sigmaIrr) - (sigmaIrr * sigmaIrr) / 2);
          rr = clamp(rr, 0.36, 1.6);
        } else {
          rr = meanRR * (1 + clamp(rnd.n(0, g.jitter), -2.5 * g.jitter, 2.5 * g.jitter));
        }
        t += rr;
      }
      if (g.atrial !== "fib" || clearlyIrregular(rTimes, seconds)) break;
    }

    // Per-strip morphology (one patient), small per-beat variation on top.
    const m = {
      pAmp: rnd.u(0.10, 0.20),
      pDur: rnd.u(0.08, 0.11),
      pr: g.pr ? rnd.u(g.pr[0], g.pr[1]) : null,
      qrs: rnd.u(g.qrs[0], g.qrs[1]),
      rAmp: rnd.u(0.8, 1.5),
      qAmp: -rnd.u(0.04, 0.14),
      sAmp: -rnd.u(0.12, 0.32),
      tAmp: rnd.u(0.18, 0.38) * (g.atrial === "fib" ? 0.8 : 1),
      qtc: rnd.u(0.38, 0.43),
      polarity: rnd.raw() < 0.6 ? 1 : -1, // VT main deflection in lead II can go either way
      vtAmp: rnd.u(1.0, 1.5),
      vtTRatio: rnd.u(0.28, 0.42)
    };
    if (g.atrial === "none") m.qrs = Math.min(m.qrs, 0.55 * meanRR);

    const pad = 2.0; // seconds of buffer before 0
    const t0 = -pad;
    const n = Math.round((seconds + pad + 1.5) * fs);
    const buf = new Float32Array(n);
    const beats = [];

    for (let i = 0; i < rTimes.length; i++) {
      const rT = rTimes[i];
      const rrPrev = i > 0 ? rT - rTimes[i - 1] : meanRR;
      const rrNext = i < rTimes.length - 1 ? rTimes[i + 1] - rT : meanRR;
      const k = 1 + rnd.n(0, 0.02); // beat-to-beat amplitude wobble
      const beat = { r: rT };

      if (g.atrial === "none") {
        // Monomorphic VT: one wide QRS shape repeated, discordant T wave.
        const d = m.qrs;
        const qrsOn = rT - 0.42 * d;
        const A = m.polarity * m.vtAmp * k;
        addWave(buf, fs, t0, A, qrsOn + 0.42 * d, 0.17 * d, 0.21 * d);
        addWave(buf, fs, t0, -0.3 * A, qrsOn + 0.86 * d, 0.12 * d);
        const gap = Math.max(0.04, rrNext - d);
        const tC = qrsOn + d + Math.min(0.10, 0.4 * gap);
        const tS = clamp(0.25 * gap, 0.02, 0.06);
        addWave(buf, fs, t0, -m.vtTRatio * A, tC, tS * 1.2, tS);
        beat.qrsOn = qrsOn; beat.qrs = d; beat.p = false;
      } else {
        const d = m.qrs * (1 + rnd.n(0, 0.02));
        const qrsOn = rT - 0.5 * d;
        // QRS
        addWave(buf, fs, t0, m.qAmp * k, rT - 0.30 * d, 0.08 * d);
        addWave(buf, fs, t0, m.rAmp * k, rT, 0.12 * d);
        addWave(buf, fs, t0, m.sAmp * k, rT + 0.30 * d, 0.09 * d);
        // T: QT scales with heart rate (Bazett form, QT = QTc × √RR)
        const rrForQt = g.atrial === "fib" ? clamp(rrPrev, 0.4, 1.4) : meanRR;
        const qt = m.qtc * Math.sqrt(rrForQt);
        const tEnd = qrsOn + qt;
        const sFall = clamp(0.14 * qt, 0.03, 0.05);
        addWave(buf, fs, t0, m.tAmp * k, tEnd - 2.5 * sFall, sFall * 1.5, sFall);
        beat.qrsOn = qrsOn; beat.qrs = d; beat.tEnd = tEnd;
        // P wave (sinus only)
        if (g.atrial === "sinus") {
          const pr = clamp(m.pr + rnd.n(0, 0.003), 0.121, 0.199);
          const sp = m.pDur / 5;
          const pOn = qrsOn - pr;
          addWave(buf, fs, t0, m.pAmp, pOn + 2.5 * sp, sp);
          beat.p = true; beat.pOn = pOn; beat.pr = pr;
        } else {
          beat.p = false;
        }
      }
      beats.push(beat);
    }

    // Atrial fibrillation: fibrillatory waves, an irregular low-amplitude oscillation.
    // Frequencies 6 to 9 Hz (360 to 540/min), inside the commonly taught 350 to 600/min.
    if (g.atrial === "fib") {
      const coarse = rnd.raw() < 0.4;
      const A0 = coarse ? rnd.u(0.06, 0.11) : rnd.u(0.02, 0.05);
      const comps = [0, 1, 2].map(function () {
        return { f: rnd.u(6, 9), ph: rnd.u(0, 2 * Math.PI), w: rnd.u(0.4, 1) };
      });
      const modF = rnd.u(0.2, 0.5), modPh = rnd.u(0, 2 * Math.PI);
      const wsum = comps.reduce(function (s, c) { return s + c.w; }, 0);
      for (let i = 0; i < n; i++) {
        const tt = t0 + i / fs;
        let v = 0;
        for (const c of comps) v += c.w * Math.sin(2 * Math.PI * c.f * tt + c.ph + 0.6 * Math.sin(2 * Math.PI * 0.7 * tt + c.ph));
        buf[i] += A0 * (0.65 + 0.35 * Math.sin(2 * Math.PI * modF * tt + modPh)) * (v / wsum) * 1.6;
      }
    }

    // Baseline wander and a little noise, like a real monitor.
    const wA = rnd.u(0.01, 0.04), wF = rnd.u(0.15, 0.35), wPh = rnd.u(0, 2 * Math.PI);
    const noise = rnd.u(0.003, 0.008);
    for (let i = 0; i < n; i++) {
      const tt = t0 + i / fs;
      buf[i] += wA * Math.sin(2 * Math.PI * wF * tt + wPh) + rnd.n(0, noise);
    }

    // Keep only 0..seconds.
    const start = Math.round(pad * fs);
    const samples = buf.slice(start, start + Math.round(seconds * fs));
    return {
      rhythm: rhythmId,
      seed: seed,
      fs: fs,
      seconds: seconds,
      samples: samples,
      beats: beats.filter(function (b) { return b.r > -1 && b.r < seconds + 1; }),
      measures: measure(beats, seconds, g)
    };
  }

  // What a careful reader would measure on this strip (used for feedback and tests).
  function measure(beats, seconds, g) {
    const inStrip = beats.filter(function (b) { return b.r >= 0 && b.r < seconds; });
    const rr = [];
    for (let i = 1; i < inStrip.length; i++) rr.push(inStrip[i].r - inStrip[i - 1].r);
    const mean = rr.reduce(function (a, b) { return a + b; }, 0) / (rr.length || 1);
    const sd = Math.sqrt(rr.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / (rr.length || 1));
    const qrs = inStrip.reduce(function (a, b) { return a + b.qrs; }, 0) / (inStrip.length || 1);
    const prs = inStrip.filter(function (b) { return b.p; }).map(function (b) { return b.pr; });
    const pr = prs.length ? prs.reduce(function (a, b) { return a + b; }, 0) / prs.length : null;
    const boxes = Math.round(mean / 0.04);
    return {
      count6s: inStrip.length,
      rate6s: Math.round(inStrip.length * (60 / seconds)),
      rate: Math.round(60 / mean),
      rateBoxes: boxes,
      rateFromBoxes: Math.round(1500 / boxes),
      rrMean: mean,
      rrMin: Math.min.apply(null, rr),
      rrMax: Math.max.apply(null, rr),
      rrCV: sd / mean,
      regular: g.atrial !== "fib",
      pWaves: g.atrial === "sinus",
      pr: pr,
      qrs: qrs,
      wide: qrs >= 0.12
    };
  }

  root.EKG = root.EKG || {};
  root.EKG.ecg = { generate: generate, makeRand: makeRand };
})(typeof window !== "undefined" ? window : globalThis);
