// Run: node tests/run.js   (no dependencies; N=200 for a quick run)
// Checks that generated strips match their answer key, and the quiz logic.
"use strict";
const assert = require("assert");
require("../js/rhythms.js");
require("../js/ecg.js");
require("../js/quiz.js");
const { rhythms, ecg, quiz } = globalThis.EKG;

const N = Number(process.env.N || 800);
let checks = 0;
function ok(cond, msg) { checks++; assert.ok(cond, msg); }
const FEATS = ["reg", "atrial", "pr", "qrs", "ectopy", "shape"];

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
// Biggest deflection within ±w s of t, measured from the median of the surrounding second.
function localAmp(strip, t, w) {
  const x = strip.samples, fs = strip.fs;
  const a = Math.max(0, Math.round((t - 0.5) * fs)), b = Math.min(x.length, Math.round((t + 0.5) * fs));
  const seg = Array.from(x.slice(a, b)).sort((p, q) => p - q);
  const med = seg[Math.floor(seg.length / 2)];
  let m = 0;
  for (let i = Math.max(0, Math.round((t - w) * fs)); i < Math.min(x.length, Math.round((t + w) * fs)); i++) m = Math.max(m, Math.abs(x[i] - med));
  return m;
}
const UNIFORM = new Set(["sinus", "sarr", "pause", "pac", "svt", "junc", "vent", "fib", "flutter", "wenck", "mobitz2"]);

function checkStrip(R, st, tag) {
  const m = st.measures, k = R.criteria, F = m.feat, kind = R.gen.kind;
  ok(st.samples.length === 6 * st.fs, tag + ": 6 s of samples");
  ok(st.samples.every(Number.isFinite), tag + ": finite samples");
  let lo = Infinity, hi = -Infinity;
  for (const v of st.samples) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  ok(hi - lo <= 3.4, tag + ": fits the 4 mV window (" + (hi - lo).toFixed(2) + ")");

  for (const f of FEATS) ok(k[f].includes(F[f]), tag + ": feature " + f + "=" + F[f] + " in criteria");

  const rate = quiz.readRate(m);
  if (k.rate) {
    ok(rate >= k.rate[0] && rate <= k.rate[1], tag + ": rate " + rate + " in criteria");
    if (F.reg === "regular") ok(m.rateFromBoxes >= k.rate[0] && m.rateFromBoxes <= k.rate[1], tag + ": 1500 rule rate " + m.rateFromBoxes);
  }
  if (F.qrs !== "none") ok(m.count6s >= 3, tag + ": at least 3 beats");
  else ok(m.count6s === 0, tag + ": no QRS");

  // Regularity statistics match the label.
  if (F.reg === "regular") ok(m.rrCV < 0.05, tag + ": regular (CV " + m.rrCV.toFixed(3) + ")");
  if (kind === "fib") ok(m.rrCV >= 0.12 && m.rrMax - m.rrMin >= 0.2, tag + ": AFib irregular");
  if (kind === "flutter" && F.reg === "irregular") ok(m.rrMax - m.rrMin >= 0.15, tag + ": variable flutter R-R spread");
  if (kind === "sarr") ok(m.ppMax - m.ppMin > 0.12, tag + ": sinus arrhythmia P-P varies over 0.12 s");

  // Displayed numbers agree with the categories (never cross a cutoff on screen).
  if (F.qrs === "narrow") ok(m.qrs < 0.12 && Number(m.qrs.toFixed(2)) < 0.12, tag + ": narrow QRS " + m.qrs.toFixed(3));
  if (F.qrs === "wide") ok(m.qrs >= 0.12 && Number(m.qrs.toFixed(2)) >= 0.12, tag + ": wide QRS " + m.qrs.toFixed(3));
  if (m.pvcQrs) ok(m.pvcQrs >= 0.12, tag + ": PVCs wide");
  if (F.pr === "normal") {
    ok(m.pr >= 0.12 && m.pr <= 0.2 && Number(m.pr.toFixed(2)) <= 0.2, tag + ": PR normal " + m.pr.toFixed(3));
    for (const b of st.beats) if (b.p && b.type === "n") ok(b.pr >= 0.12 && b.pr <= 0.2, tag + ": beat PR " + b.pr.toFixed(3));
  }
  if (F.pr === "long") { ok(m.prMin > 0.2 && Number(m.prMin.toFixed(2)) > 0.2, tag + ": PR long " + m.prMin.toFixed(3)); ok(m.prMax - m.prMin < 0.02, tag + ": PR constant"); }
  if (F.pr === "short") ok(m.pr < 0.12, tag + ": short PR");

  // Rhythm-specific checks.
  const conducted = st.beats.filter((b) => b.p).sort((a, b) => a.pOn - b.pOn);
  if (kind === "wenck") {
    ok(m.dropped >= 1, tag + ": a dropped P");
    // Inside each group the PR grows; after each drop it resets shorter.
    for (let i = 1; i < conducted.length; i++) {
      const a = conducted[i - 1], b = conducted[i];
      if (b.idx === a.idx + 1) ok(b.pr > a.pr + 0.01, tag + ": PR lengthens within group");
      if (b.idx === 0 && a.idx > 0) ok(b.pr < a.pr - 0.05, tag + ": PR shorter after the drop");
    }
    ok(m.prLast - m.prFirst >= 0.06, tag + ": visible PR growth");
  }
  if (kind === "mobitz2") {
    ok(m.dropped >= 1, tag + ": a dropped P");
    ok(m.prMax - m.prMin < 0.015, tag + ": PR constant in type II");
    // The pause around a dropped P is two P-P.
    const vis = st.beats.filter((b) => b.r >= 0 && b.r < 6).map((b) => b.r);
    const rr = vis.slice(1).map((r, i) => r - vis[i]);
    const pp = st.info.pp;
    ok(rr.every((x) => Math.abs(x - pp) < 0.05 || Math.abs(x - 2 * pp) < 0.06), tag + ": R-R is one or two P-P");
  }
  if (kind === "third") {
    ok(m.atrialRate > m.rate, tag + ": atrial faster than ventricular");
    ok(m.pqMax - m.pqMin >= 0.12, tag + ": AV dissociation");
  }
  if (kind === "pvc") {
    const pvcs = st.beats.filter((b) => b.type === "pvc" && b.r > 0 && b.r < 6);
    ok(pvcs.length >= 1, tag + ": PVC on strip");
    const ns = st.beats.filter((b) => b.type === "n");
    for (const v of pvcs) {
      const before = ns.filter((b) => b.r < v.r).pop(), after = ns.find((b) => b.r > v.r);
      const prev = st.beats.filter((x) => x.r < v.r).pop();
      if (prev) ok(v.r - prev.r < 0.75 * m.baseRR, tag + ": PVC is early");
      if (before && after && R.gen.pattern !== "couplet") ok(Math.abs(after.r - before.r - 2 * m.baseRR) < 0.12, tag + ": full compensatory pause");
    }
    if (R.gen.pattern === "multi") ok(m.foci >= 2, tag + ": two shapes");
    if (R.gen.pattern === "couplet") ok(pvcs.length === 2, tag + ": exactly one couplet");
    if (R.gen.pattern === "bigeminy") {
      const seq = st.beats.filter((b) => b.r > 0 && b.r < 6).map((b) => b.type);
      for (let i = 1; i < seq.length; i++) ok(seq[i] !== seq[i - 1], tag + ": alternating N/PVC");
    }
    if (R.gen.pattern === "uni") ok(new Set(pvcs.map((b) => b.focus)).size === 1, tag + ": one focus");
  }
  if (kind === "pac") {
    const all = st.beats.slice().sort((a, b) => a.r - b.r);
    for (let i = 1; i < all.length - 1; i++) if (all[i].type === "pac") {
      ok(all[i].r - all[i - 1].r < 0.8 * m.baseRR, tag + ": PAC early");
      ok(all[i + 1].r - all[i - 1].r < 2 * m.baseRR - 0.05, tag + ": not a full compensatory pause");
    }
  }
  if (kind === "flutter") ok(m.flutterRate >= 200 && m.flutterRate <= 400, tag + ": flutter rate");
  if (kind === "vf") { ok(hi - lo >= 0.2, tag + ": VF has visible deflections (" + (hi - lo).toFixed(2) + ")"); }
  if (kind === "asystole") ok(hi - lo < 0.15, tag + ": asystole flat (" + (hi - lo).toFixed(2) + ")");
  if (kind === "torsades") ok(new Set(st.beats.filter((b) => b.r > 0 && b.r < 6).map((b) => b.focus.pol)).size === 2, tag + ": twists");

  // Signal check: every big QRS is visible in the samples.
  const expected = st.beats.filter((b) => b.r >= 0.05 && b.r <= 5.95 && (!b.focus || b.focus.amp >= 0.5));
  for (const b of expected) ok(localAmp(st, b.r, 0.05) >= 0.3, tag + ": beat at " + b.r.toFixed(2) + " s visible");
  if (UNIFORM.has(kind)) {
    const peaks = detectPeaks(st);
    ok(peaks.length <= m.count6s + 1, tag + ": no extra peaks (" + peaks.length + " vs " + m.count6s + ")");
  }

  // Answer key: the true rhythm fits, every other rhythm fails at least once.
  ok(quiz.mismatches(R.id, st).length === 0, tag + ": correct answer has no mismatch: " + quiz.mismatches(R.id, st).join(" | "));
  for (const other of rhythms.list) {
    if (other.id === R.id) continue;
    const why = quiz.mismatches(other.id, st);
    ok(why.length > 0, tag + ": " + other.id + " is ruled out");
    for (const w of why) ok(!/undefined|NaN|null/.test(w), tag + ": clean why-not text: " + w);
  }
  const fi = quiz.findings(st);
  ok(fi.length === 5, tag + ": 5-step findings");
  for (const f of fi) ok(f[1] && !/undefined|NaN|null/.test(f[1]), tag + ": clean finding " + f[0] + ": " + f[1]);
  if (st.edge) ok(quiz.edgeNote(st) && !/undefined|NaN/.test(quiz.edgeNote(st)), tag + ": edge note");
}

// Data sanity.
for (const R of rhythms.list) {
  ok(R.review === "pending", R.id + ": pending review");
  ok(R.sources.length && R.sources.every((s) => rhythms.sources[s]), R.id + ": sources exist");
  ok(R.lookalikes.every((id) => rhythms.byId[id] && id !== R.id), R.id + ": lookalikes exist");
  for (const f of FEATS) ok(Array.isArray(R.criteria[f]) && R.criteria[f].length, R.id + ": criteria " + f);
  ok(rhythms.groups.some((g) => g.id === R.group), R.id + ": group");
}
ok(rhythms.list.length === 26, "26 rhythms");
ok(rhythms.list.filter((r) => r.lethal).map((r) => r.id).sort().join() === "asystole,torsades,vf,vt", "lethal set");

for (const R of rhythms.list) {
  const edges = R.gen.edge ? Object.keys(R.gen.edge) : [];
  const seen = {};
  for (let s = 1; s <= N; s++) {
    const seed = s * 7919 + R.id.length * 104729;
    const borderline = edges.length > 0 && s % 3 === 0;
    const st = ecg.generate(R.id, { seed, borderline });
    checkStrip(R, st, R.id + (borderline ? " edge" : "") + " seed " + seed);
    const key = FEATS.map((f) => st.measures.feat[f]).join("/");
    seen[key] = (seen[key] || 0) + 1;
    if (borderline) ok(st.edge, R.id + ": borderline strip has an edge");
  }
  console.log(R.id.padEnd(9), "ok ·", N, "strips ·", Object.keys(seen).length, "feature variant(s)");
}

// Same seed gives the same strip.
const a = ecg.generate("wenck", { seed: 42 }), b = ecg.generate("wenck", { seed: 42 });
ok(a.samples.every((v, i) => v === b.samples[i]), "deterministic with seed");

// Choices: 4 unique options including the answer, mostly lookalikes.
let r = ecg.makeRand(1).raw;
for (const R of rhythms.list) {
  let look = 0, total = 0;
  for (let i = 0; i < 300; i++) {
    const c = quiz.choices(R.id, r);
    ok(c.length === 4 && new Set(c).size === 4 && c.includes(R.id), "choices for " + R.id);
    c.forEach((id) => { if (id !== R.id) { total++; if (R.lookalikes.includes(id) || rhythms.byId[id].group === R.group) look++; } });
  }
  ok(look / total > 0.8, R.id + ": distractors are mostly lookalikes (" + (look / total).toFixed(2) + ")");
}
// Choices limited to a rhythm set.
const core = rhythms.sets.find((s) => s.id === "core").ids;
for (let i = 0; i < 200; i++) ok(quiz.choices("vt", r, 4, core).every((id) => core.includes(id)), "core set choices stay in set");

// Exam plan: lethal rhythms covered, groups covered, no repeats in a row.
for (const n of [10, 20, 25]) {
  const p = quiz.examPlan(n, r);
  ok(p.length === n, "exam length " + n);
  for (const id of ["vt", "vf", "asystole", "torsades"]) ok(p.includes(id), "exam " + n + " has " + id);
  for (const g of rhythms.groups) ok(p.some((id) => rhythms.byId[id].group === g.id), "exam " + n + " covers " + g.id);
  ok(new Set(p).size === Math.min(n, 26), "exam " + n + " has no needless repeats");
  for (let i = 1; i < p.length; i++) ok(p[i] !== p[i - 1], "no rhythm twice in a row");
  const pc = quiz.examPlan(n, r, core);
  for (const id of core) ok(pc.includes(id), "core exam " + n + " has " + id);
  ok(pc.filter((id) => id === "vt").length >= 2, "core exam " + n + " has VT twice");
}

// Exam scoring, lethal rule and group breakdown.
const res = (okFlags, ids) => okFlags.map((o, i) => ({ rhythm: ids[i], ok: o }));
let sc = quiz.scoreExam(res([true, true, true, true, false], ["nsr", "brady", "tach", "afib", "vf"]), 80, true);
ok(sc.pct === 80 && sc.passScore && !sc.passLethal && !sc.passed, "80% but missed VF fails with lethal rule");
sc = quiz.scoreExam(res([true, true, true, true, false], ["nsr", "brady", "tach", "afib", "asystole"]), 80, false);
ok(sc.passed, "same result passes without lethal rule");
sc = quiz.scoreExam(res([true, false, true, true, true], ["nsr", "wenck", "third", "afib", "vt"]), 85, true);
ok(!sc.passed && sc.passLethal, "80% fails an 85% pass mark");
ok(sc.groups.find((g) => g.id === "blocks").correct === 1 && sc.groups.find((g) => g.id === "blocks").total === 2, "group breakdown");

for (let i = 0; i < 1000; i++) ok(quiz.pickRhythm({ nsr: 0, vt: 1, afib: 2 }, r) !== "nsr", "zero weight never picked");
ok(quiz.boxes(0.10) === "2.5" && quiz.boxes(0.2) === "5", "small boxes shown with one decimal");

console.log("all", checks, "checks passed");
