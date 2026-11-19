// Run: node tests/run.js   (no dependencies)
// Checks that generated strips match their answer key, and the quiz logic.
"use strict";
const assert = require("assert");
require("../js/rhythms.js");
require("../js/ecg.js");
require("../js/quiz.js");
const { rhythms, ecg, quiz } = globalThis.EKG;

const N = Number(process.env.N || 1500);
let checks = 0;
function ok(cond, msg) { checks++; assert.ok(cond, msg); }

// Independent R-peak detection straight from the samples (not from the beat list).
function detectPeaks(strip) {
  const x = strip.samples, fs = strip.fs;
  const sorted = Array.from(x).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  let maxAbs = 0;
  for (const v of x) maxAbs = Math.max(maxAbs, Math.abs(v - median));
  const thr = 0.6 * maxAbs, refr = Math.round(0.2 * fs);
  const peaks = [];
  for (let i = 1; i < x.length - 1; i++) {
    const a = Math.abs(x[i] - median);
    if (a > thr && a >= Math.abs(x[i - 1] - median) && a >= Math.abs(x[i + 1] - median)) {
      if (peaks.length && i - peaks[peaks.length - 1] < refr) {
        if (a > Math.abs(x[peaks[peaks.length - 1]] - median)) peaks[peaks.length - 1] = i;
      } else peaks.push(i);
    }
  }
  return peaks.map((i) => i / fs);
}

for (const R of rhythms.list) {
  let cvMax = 0, cvMin = 1;
  for (let s = 1; s <= N; s++) {
    const seed = s * 7919 + R.id.length * 104729;
    const st = ecg.generate(R.id, { seed });
    const m = st.measures;
    const tag = R.id + " seed " + seed;
    const k = R.criteria;

    ok(st.samples.length === 6 * st.fs, tag + ": 6 s of samples");
    ok(st.samples.every(Number.isFinite), tag + ": finite samples");
    let lo = Infinity, hi = -Infinity;
    for (const v of st.samples) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    ok(hi - lo <= 3.4, tag + ": fits the 4 mV window (" + (hi - lo).toFixed(2) + ")");

    const rate = quiz.readRate(m);
    if (k.rate) ok(rate >= k.rate[0] && rate <= k.rate[1], tag + ": rate " + rate + " in criteria");
    if (m.regular) {
      ok(m.rateFromBoxes >= (k.rate ? k.rate[0] : 0) && m.rateFromBoxes <= (k.rate ? k.rate[1] : 999),
        tag + ": 1500 rule rate " + m.rateFromBoxes + " in criteria");
    }
    ok(m.count6s >= 3, tag + ": at least 3 beats");

    if (k.regular) ok(m.rrCV < 0.05, tag + ": regular (CV " + m.rrCV.toFixed(3) + ")");
    else ok(m.rrCV >= 0.12 && m.rrMax - m.rrMin >= 0.2, tag + ": irregular (CV " + m.rrCV.toFixed(3) + ")");
    cvMax = Math.max(cvMax, m.rrCV); cvMin = Math.min(cvMin, m.rrCV);

    ok(m.wide === k.wide, tag + ": QRS width category");
    if (k.wide) ok(m.qrs >= 0.12, tag + ": wide QRS"); else ok(m.qrs < 0.12, tag + ": narrow QRS");
    ok(m.pWaves === k.p, tag + ": P waves");
    if (k.p) {
      for (const b of st.beats) ok(b.p && b.pr >= 0.12 && b.pr <= 0.20, tag + ": PR " + (b.pr || 0).toFixed(3));
    }

    // Signal check: peaks found in the samples line up with the beat list.
    const peaks = detectPeaks(st);
    const expected = st.beats.filter((b) => b.r >= 0.02 && b.r <= 5.98);
    for (const b of expected) {
      ok(peaks.some((p) => Math.abs(p - b.r) < 0.06), tag + ": beat at " + b.r.toFixed(2) + " s visible in signal");
    }
    ok(peaks.length <= m.count6s + 1, tag + ": no extra peaks (" + peaks.length + " vs " + m.count6s + ")");

    // Answer key: the true rhythm fits the strip, every other rhythm fails at least once.
    ok(quiz.mismatches(R.id, st).length === 0, tag + ": correct answer has no mismatch: " + quiz.mismatches(R.id, st).join(" | "));
    for (const other of rhythms.list) {
      if (other.id !== R.id) ok(quiz.mismatches(other.id, st).length > 0, tag + ": " + other.id + " is ruled out");
    }
    ok(quiz.findings(st).length === 5, tag + ": 5-step findings");
  }
  console.log(R.id.padEnd(6), "ok ·", N, "strips · R-R CV", cvMin.toFixed(3), "to", cvMax.toFixed(3));
}

// Same seed gives the same strip.
const a = ecg.generate("nsr", { seed: 42 }), b = ecg.generate("nsr", { seed: 42 });
ok(a.samples.every((v, i) => v === b.samples[i]), "deterministic with seed");

// Choices: 4 unique options including the answer.
let r = ecg.makeRand(1).raw;
for (let i = 0; i < 500; i++) {
  for (const R of rhythms.list) {
    const c = quiz.choices(R.id, r);
    ok(c.length === 4 && new Set(c).size === 4 && c.includes(R.id), "choices for " + R.id);
  }
}

// Exam plan covers everything and doubles the lethal rhythm.
for (const n of [10, 20, 25]) {
  const p = quiz.examPlan(n, r);
  ok(p.length === n, "exam length " + n);
  for (const R of rhythms.list) ok(p.includes(R.id), "exam " + n + " has " + R.id);
  ok(p.filter((id) => id === "vt").length >= 2, "exam " + n + " has VT twice");
}

// Exam scoring and the lethal rule.
const res = (okFlags, ids) => okFlags.map((o, i) => ({ rhythm: ids[i], ok: o }));
let sc = quiz.scoreExam(res([true, true, true, true, false], ["nsr", "brady", "tach", "afib", "vt"]), 80, true);
ok(sc.pct === 80 && sc.passScore && !sc.passLethal && !sc.passed, "80% but missed VT fails with lethal rule");
sc = quiz.scoreExam(res([true, true, true, true, false], ["nsr", "brady", "tach", "afib", "vt"]), 80, false);
ok(sc.passed, "same result passes without lethal rule");
sc = quiz.scoreExam(res([true, true, true, false, true], ["nsr", "brady", "tach", "afib", "vt"]), 85, true);
ok(!sc.passed && sc.passLethal, "80% fails an 85% pass mark");

// Weighted pick never returns a zero-weight rhythm.
for (let i = 0; i < 1000; i++) ok(quiz.pickRhythm({ nsr: 0, vt: 1, afib: 2 }, r) !== "nsr", "zero weight never picked");

console.log("all", checks, "checks passed");
