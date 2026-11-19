/* Quiz logic: answer choices, explanations built from the strip's own measurements,
   "why not" reasons for wrong choices, and exam scoring. No DOM code here. */
(function (root) {
  "use strict";
  const RH = function () { return root.EKG.rhythms; };

  function s2(x) { return x.toFixed(2) + " s"; }
  function boxes(sec) { return Math.round(sec / 0.04); }
  function rangeText(r) {
    if (r[0] <= 0) return "under " + (r[1] + 1) + "/min";
    if (r[1] >= 300) return "over " + (r[0] - 1) + "/min";
    return r[0] + " to " + r[1] + "/min";
  }

  // The rate a reader would report: exact method for regular rhythms, 6-second for irregular.
  function readRate(m) {
    return m.regular ? m.rate : m.rate6s;
  }

  // Measured findings for the strip on screen, in the 5-step order.
  function findings(strip) {
    const m = strip.measures;
    const out = [];
    if (m.regular) {
      out.push(["Rate", "About " + m.rate + "/min. R to R is about " + m.rateBoxes + " small boxes, 1500 ÷ " + m.rateBoxes + " ≈ " + m.rateFromBoxes + "."]);
      out.push(["Regularity", "Regular. R-R stays between " + s2(m.rrMin) + " and " + s2(m.rrMax) + "."]);
    } else {
      out.push(["Rate", m.count6s + " QRS in 6 seconds × 10 ≈ " + m.rate6s + "/min" + (m.rate6s > 100 ? " (rapid ventricular response)." : ".")]);
      out.push(["Regularity", "Irregularly irregular. R-R jumps between " + s2(m.rrMin) + " and " + s2(m.rrMax) + " with no pattern."]);
    }
    if (m.pWaves) {
      out.push(["P waves", "Upright P before every QRS, all the same shape."]);
      out.push(["PR", "About " + s2(m.pr) + " (" + boxes(m.pr) + " small boxes), constant."]);
    } else if (strip.rhythm === "afib") {
      out.push(["P waves", "None. The baseline is wavy (fibrillatory waves), not P waves."]);
      out.push(["PR", "Nothing to measure."]);
    } else {
      out.push(["P waves", "None visible in front of the QRS complexes."]);
      out.push(["PR", "Nothing to measure."]);
    }
    out.push(["QRS", "About " + s2(m.qrs) + " (" + boxes(m.qrs) + " small boxes): " + (m.wide ? "wide, all the same shape." : "narrow.")]);
    return out;
  }

  // Every criterion a candidate rhythm fails on this strip. Empty list = consistent.
  function mismatches(candidateId, strip) {
    const c = RH().byId[candidateId];
    const k = c.criteria;
    const m = strip.measures;
    const rate = readRate(m);
    const out = [];
    if (k.wide !== m.wide) {
      out.push(k.wide
        ? c.short + " has a wide QRS (0.12 s or more). These QRS are about " + s2(m.qrs) + ", narrow."
        : c.short + " has a narrow QRS (under 0.12 s). These QRS are about " + s2(m.qrs) + ", wide.");
    }
    if (k.p !== m.pWaves) {
      out.push(k.p
        ? c.short + " needs an upright P wave before every QRS. There are no P waves here."
        : c.short + " has no organized P waves. Here every QRS has a P wave in front of it.");
    }
    if (k.regular !== m.regular) {
      out.push(k.regular
        ? c.short + " is regular. These R-R intervals vary from " + s2(m.rrMin) + " to " + s2(m.rrMax) + " with no pattern."
        : c.short + " is irregularly irregular. These R-R intervals are steady.");
    }
    if (k.rate && (rate < k.rate[0] || rate > k.rate[1])) {
      out.push(c.short + " is " + rangeText(k.rate) + ". This strip is about " + rate + "/min.");
    }
    return out;
  }

  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Correct answer plus the closest lookalikes, shuffled. n choices (default 4).
  function choices(correctId, rand, n) {
    n = n || 4;
    rand = rand || Math.random;
    const all = RH().list.map(function (r) { return r.id; });
    const picked = [correctId];
    const look = RH().byId[correctId].lookalikes || [];
    // Mostly the closest lookalikes, sometimes a random one, so the set isn't a giveaway.
    shuffle(look, rand).forEach(function (id) {
      if (picked.length < n && picked.indexOf(id) < 0 && rand() < 0.85) picked.push(id);
    });
    shuffle(all, rand).forEach(function (id) {
      if (picked.length < n && picked.indexOf(id) < 0) picked.push(id);
    });
    return shuffle(picked, rand);
  }

  // Pick the next rhythm. weights: { id: number } (higher = more likely).
  function pickRhythm(weights, rand, avoidId) {
    rand = rand || Math.random;
    const ids = Object.keys(weights).filter(function (id) { return weights[id] > 0; });
    let pool = ids.length > 1 && avoidId ? ids.filter(function (id) { return id !== avoidId || rand() < 0.15; }) : ids;
    if (!pool.length) pool = ids;
    const total = pool.reduce(function (s, id) { return s + weights[id]; }, 0);
    let x = rand() * total;
    for (const id of pool) { x -= weights[id]; if (x <= 0) return id; }
    return pool[pool.length - 1];
  }

  // Exam question list: every rhythm at least once, lethal rhythms at least twice when
  // the exam is long enough, the rest random, no rhythm twice in a row if avoidable.
  function examPlan(count, rand) {
    rand = rand || Math.random;
    const list = RH().list;
    const plan = [];
    list.forEach(function (r) { if (plan.length < count) plan.push(r.id); });
    list.forEach(function (r) { if (r.lethal && count >= 10 && plan.length < count) plan.push(r.id); });
    while (plan.length < count) plan.push(list[Math.floor(rand() * list.length)].id);
    let best = shuffle(plan, rand);
    for (let tries = 0; tries < 50; tries++) {
      let repeats = 0;
      for (let i = 1; i < best.length; i++) if (best[i] === best[i - 1]) repeats++;
      if (!repeats) break;
      best = shuffle(plan, rand);
    }
    return best;
  }

  // results: [{ rhythm, ok }]. Returns score, pass, lethal details.
  function scoreExam(results, passMark, lethalRule) {
    const total = results.length;
    const correct = results.filter(function (r) { return r.ok; }).length;
    const lethal = results.filter(function (r) { return RH().byId[r.rhythm].lethal; });
    const lethalMissed = lethal.filter(function (r) { return !r.ok; }).length;
    const pct = total ? Math.round((correct / total) * 1000) / 10 : 0;
    const passScore = pct >= passMark;
    const passLethal = !lethalRule || lethalMissed === 0;
    return {
      total: total, correct: correct, pct: pct,
      lethalTotal: lethal.length, lethalMissed: lethalMissed,
      passScore: passScore, passLethal: passLethal, passed: passScore && passLethal
    };
  }

  root.EKG = root.EKG || {};
  root.EKG.quiz = {
    findings: findings, mismatches: mismatches, choices: choices, pickRhythm: pickRhythm,
    examPlan: examPlan, scoreExam: scoreExam, readRate: readRate, shuffle: shuffle
  };
})(typeof window !== "undefined" ? window : globalThis);
