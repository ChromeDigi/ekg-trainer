/* Quiz logic: answer choices, explanations built from the strip's own measurements,
   "why not" reasons for wrong choices, and exam scoring. No DOM code here. */
(function (root) {
  "use strict";
  const RH = function () { return root.EKG.rhythms; };

  function s2(x) { return x == null ? "" : x.toFixed(2) + " s"; }
  // Small boxes with one decimal, so 0.10 s reads 2.5 boxes (never rounds up to 3).
  function boxes(sec) { const b = Math.round((sec / 0.04) * 10) / 10; return (b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)); }
  function rangeText(r) {
    if (r[0] <= 0) return "under " + (r[1] + 1) + "/min";
    if (r[1] >= 300) return "over " + (r[0] - 1) + "/min";
    return r[0] + " to " + r[1] + "/min";
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  // The rate a reader would report: exact method for regular rhythms, 6-second otherwise.
  function readRate(m) { return m.feat.reg === "regular" ? m.rate : m.rate6s; }

  // ---------- findings: the 5 steps for the strip on screen ----------
  function findings(strip) {
    const m = strip.measures, F = m.feat;
    const out = [];
    const ratioText = m.ratio === "var" ? "variable conduction" : m.ratio + ":1 conduction";

    // Rate
    if (F.qrs === "none") out.push(["Rate", F.shape === "flat" ? "None. No QRS complexes at all." : "No QRS complexes to count, only chaotic waves."]);
    else {
      let t = F.reg === "regular"
        ? "About " + m.rate + "/min. R to R is about " + m.rateBoxes + " small boxes, 1500 ÷ " + m.rateBoxes + " ≈ " + m.rateFromBoxes + "."
        : m.count6s + " QRS in 6 seconds × 10 ≈ " + m.rate6s + "/min" + (strip.rhythm === "afib" && m.rate6s > 100 ? " (rapid ventricular response)." : ".");
      if (F.atrial === "more" && m.atrialRate) t += " Atrial (P wave) rate about " + m.atrialRate + "/min.";
      if (F.atrial === "flutter") t += " Flutter waves about " + m.flutterRate + "/min.";
      out.push(["Rate", t]);
    }

    // Regularity
    const rrs = s2(m.rrMin) + " and " + s2(m.rrMax);
    const reg = {
      regular: "Regular. R-R stays between " + rrs + ".",
      phasic: "Irregular, but smoothly: R-R drifts between " + rrs + ", lengthening and shortening gradually.",
      pause: "Regular, then one pause of about " + (m.pauseLen ? s2(m.pauseLen) : "") + " with no P wave (normal P-P about " + (m.pp ? s2(m.pp) : "") + ").",
      dropped: "Irregular because " + plural(m.dropped, "P wave has", "P waves have") + " no QRS after it.",
      irregular: strip.rhythm === "afib" ? "Irregularly irregular. R-R jumps between " + rrs + " with no pattern."
        : strip.rhythm === "flutter" ? "Irregular: the conduction ratio keeps changing, so R-R jumps between " + rrs + "."
        : "Not steady: R-R varies between " + rrs + ".",
      none: "Nothing to measure: no QRS complexes."
    };
    if (F.reg === "early") {
      const base = m.baseRR ? " (sinus R-R about " + s2(m.baseRR) + ")" : "";
      const e = {
        pac: plural(m.pacCount, "early beat", "early beats") + " interrupt a regular sinus rhythm" + base + ". The pause after is short of a full compensatory pause.",
        "pvc-uni": plural(m.pvcCount, "early wide beat", "early wide beats") + " interrupt a regular sinus rhythm" + base + ", each followed by a full compensatory pause.",
        "pvc-multi": plural(m.pvcCount, "early wide beat", "early wide beats") + " interrupt a regular sinus rhythm" + base + ".",
        bigeminy: "Pairs: a sinus beat, then an early PVC, then a pause, again and again.",
        couplet: "Regular sinus rhythm" + base + " interrupted by two early wide beats in a row, then a pause."
      };
      out.push(["Regularity", e[F.ectopy]]);
    } else out.push(["Regularity", reg[F.reg]]);

    // P waves
    let p;
    switch (F.atrial) {
      case "sinus":
        p = F.ectopy === "pac" ? "Upright sinus P before each sinus beat. The early beats have their own P that looks different."
          : F.ectopy !== "none" ? "Upright P before every sinus beat. No P before the wide early beats."
          : "Upright P before every QRS, all the same shape.";
        break;
      case "more": p = "More P waves than QRS. The P waves are regular (P-P about " + s2(m.ppMin) + " to " + s2(m.ppMax) + ")" + (F.pr === "variable" ? " and march straight through the QRS complexes, ignoring them." : ", and " + plural(m.dropped, "of them has", "of them have") + " no QRS after it."); break;
      case "fib": p = "None. The baseline is wavy (" + (m.coarse ? "coarse" : "fine") + " fibrillatory waves), not P waves."; break;
      case "flutter": p = "No P waves. Sawtooth flutter waves, inverted in lead II, " + ratioText + "."; break;
      case "retro": p = "Inverted P waves " + (m.pMode === "before" ? "just before" : "just after") + " each QRS (retrograde)."; break;
      default: p = F.qrs === "none" ? "None." : "None visible.";
    }
    out.push(["P waves", p]);

    // PR
    const prT = {
      normal: m.pr != null ? "About " + s2(m.pr) + " (" + boxes(m.pr) + " small boxes), constant" + (F.atrial === "more" ? " in every conducted beat." : ".") : "",
      long: m.pr != null ? "About " + s2(m.pr) + " (" + boxes(m.pr) + " small boxes): over 0.20 s, constant" + (F.atrial === "more" ? " in every conducted beat." : ".") : "",
      lengthens: m.prFirst != null ? "Gets longer every beat: about " + s2(m.prFirst) + " right after a dropped beat, up to " + s2(m.prLast) + " just before the next drop." : "",
      variable: m.pqMin != null ? "No fixed PR. The distance from P to QRS changes every beat (" + s2(m.pqMin) + " to " + s2(m.pqMax) + "): the P waves and QRS ignore each other." : "",
      short: m.pr != null ? "About " + s2(m.pr) + " (" + boxes(m.pr) + " small boxes): short, under 0.12 s." : "",
      none: "Nothing to measure."
    };
    out.push(["PR", prT[F.pr]]);

    // QRS
    let q;
    if (F.qrs === "none") q = F.shape === "flat" ? "None. A flat line with only slight drift." : "No identifiable QRS or T waves: " + (m.coarse ? "coarse" : "fine (low-amplitude)") + " chaotic deflections.";
    else if (F.shape === "twist") q = "Wide, and the complexes keep changing height and direction, twisting around the baseline.";
    else {
      q = "About " + s2(m.qrs) + " (" + boxes(m.qrs) + " small boxes): " + (F.qrs === "wide" ? "wide" : "narrow") + (F.shape === "mono" ? ", all the same shape." : ".");
      if (m.pvcQrs) q = "Sinus beats narrow, about " + s2(m.qrs) + ". " + (F.ectopy === "pvc-multi" ? "PVCs wide (about " + s2(m.pvcQrs) + ") with " + m.foci + " different shapes." : "PVCs wide, about " + s2(m.pvcQrs) + ", all the same shape.");
      if (F.atrial === "more" && m.escape) q += " " + (m.escape === "ventricular" ? "Wide escape: ventricular." : "Narrow escape: junctional.");
    }
    out.push(["QRS", q]);
    return out;
  }

  // ---------- "why not": every feature a candidate rhythm fails on this strip ----------
  const expect = {
    reg: {
      regular: "a regular rhythm", phasic: "R-R that lengthens and shortens gradually (with breathing)",
      pause: "a sudden pause where a P wave fails to come", early: "a regular rhythm interrupted by early beats",
      dropped: "regular P waves with QRS complexes that drop out", irregular: "an irregular R-R", none: "no QRS complexes at all"
    },
    atrial: {
      sinus: "one upright P before every QRS", more: "more P waves than QRS complexes", none: "no visible P waves",
      fib: "no P waves, only a wavy fibrillating baseline", flutter: "sawtooth flutter waves instead of P waves",
      retro: "inverted P waves right before or after the QRS"
    },
    pr: {
      normal: "a PR of 0.12 to 0.20 s that stays the same", long: "a PR over 0.20 s that stays the same",
      lengthens: "a PR that gets longer each beat until a QRS drops", variable: "P waves unrelated to the QRS (PR changes every beat)",
      short: "a short PR under 0.12 s", none: "no PR to measure"
    },
    qrs: { narrow: "a narrow QRS (under 0.12 s)", wide: "a wide QRS (0.12 s or more)", none: "no QRS complexes" },
    ectopy: {
      none: "no early beats", pac: "early beats with their own P wave and a narrow QRS",
      "pvc-uni": "single early wide beats that all look the same", "pvc-multi": "early wide beats with different shapes",
      bigeminy: "a wide early beat every other beat", couplet: "two wide early beats in a row"
    },
    shape: {
      organized: "organized QRS complexes", mono: "wide complexes that all look the same",
      twist: "complexes that twist, growing and shrinking around the baseline", chaotic: "chaotic waves with no real QRS",
      flat: "a flat line"
    }
  };

  function here(f, strip) {
    const m = strip.measures;
    const v = m.feat[f];
    const rrs = s2(m.rrMin) + " to " + s2(m.rrMax);
    switch (f) {
      case "reg": return {
        regular: "the R-R is steady (" + rrs + ")", phasic: "the R-R drifts gradually (" + rrs + ")",
        pause: "there's a pause with no P wave", early: "early beats interrupt a regular rhythm",
        dropped: plural(m.dropped, "P wave has", "P waves have") + " no QRS after it",
        irregular: "the R-R varies (" + rrs + ")", none: "there are no QRS complexes"
      }[v];
      case "atrial": return {
        sinus: "every QRS has an upright P in front of it", more: "there are more P waves than QRS complexes",
        none: "there are no P waves", fib: "the baseline is fibrillating with no P waves",
        flutter: "the baseline is a sawtooth of flutter waves", retro: "the P waves are inverted and sit right next to the QRS"
      }[v];
      case "pr": return {
        normal: m.pr != null ? "the PR is about " + s2(m.pr) + " every beat" : "the PR is normal",
        long: "the PR is about " + s2(m.pr) + " every beat", lengthens: "the PR grows from " + s2(m.prFirst) + " to " + s2(m.prLast),
        variable: "the P waves don't relate to the QRS", short: "the PR is short (" + s2(m.pr) + ")", none: "there's no PR to measure"
      }[v];
      case "qrs": return { narrow: "the QRS is about " + s2(m.qrs) + ", narrow", wide: "the QRS is about " + s2(m.qrs) + ", wide", none: "there are no QRS complexes" }[v];
      case "ectopy": return {
        none: "there are no early beats", pac: "the early beats have a P wave and a narrow QRS",
        "pvc-uni": "the early wide beats all look the same", "pvc-multi": "the early wide beats have different shapes",
        bigeminy: "every other beat is a PVC", couplet: "two PVCs come back to back"
      }[v];
      case "shape": return {
        organized: "the complexes are organized", mono: "every complex has the same shape",
        twist: "the complexes twist and change", chaotic: "it's chaotic with no QRS", flat: "it's a flat line"
      }[v];
    }
    return "";
  }

  // Plain wording when a rhythm allows more than one value.
  const COMBOS = {
    "pr:long|normal": "a PR that stays the same in every conducted beat",
    "qrs:narrow|wide": "QRS complexes",
    "atrial:none|retro": "no P waves, or inverted P waves right next to the QRS",
    "pr:none|short": "no PR, or a short PR under 0.12 s",
    "reg:irregular|regular": "QRS complexes coming steadily or unevenly"
  };

  const ORDER = ["shape", "qrs", "atrial", "pr", "ectopy", "reg"];

  function mismatches(candidateId, strip) {
    const c = RH().byId[candidateId];
    const k = c.criteria;
    const m = strip.measures;
    const out = [];
    ORDER.forEach(function (f) {
      if (k[f].indexOf(m.feat[f]) >= 0) return;
      const combo = COMBOS[f + ":" + k[f].slice().sort().join("|")];
      const want = combo || k[f].map(function (v) { return expect[f][v]; }).join(" or ");
      const t = here(f, strip);
      out.push(c.short + " needs " + want + ". Here " + t + ".");
    });
    if (k.rate && m.feat.qrs !== "none") {
      const rate = readRate(m);
      if (rate < k.rate[0] || rate > k.rate[1]) out.push(c.short + " is " + rangeText(k.rate) + ". This strip is about " + rate + "/min.");
    }
    return out;
  }

  // What the borderline strip was close to, in plain words.
  function edgeNote(strip) {
    if (!strip.edge) return null;
    const m = strip.measures;
    if (strip.edge === "rate") return "Near a cutoff: the rate is " + readRate(m) + "/min, close to a rate boundary. Measure it, don't eyeball it.";
    if (strip.edge === "pr") return "Near a cutoff: the PR is about " + s2(m.pr) + ", close to the 0.20 s line.";
    if (strip.edge === "qrs") return "Near a cutoff: the QRS is about " + s2(m.qrs) + " (" + boxes(m.qrs) + " small boxes), close to the 0.12 s line.";
    return null;
  }

  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Correct answer plus meaningful distractors: the rhythm's lookalikes first, then its
  // own group, rarely anything else. pool (optional) limits choices to a rhythm set;
  // must (optional) lists rhythms that have to be among the choices (contrast drills).
  function choices(correctId, rand, n, pool, must) {
    n = n || 4;
    rand = rand || Math.random;
    const all = (pool && pool.length >= n ? pool : RH().list.map(function (r) { return r.id; }));
    const inPool = function (id) { return all.indexOf(id) >= 0; };
    const R = RH().byId[correctId];
    const picked = [correctId];
    (must || []).forEach(function (id) { if (picked.length < n && picked.indexOf(id) < 0) picked.push(id); });
    const add = function (ids, p) {
      shuffle(ids, rand).forEach(function (id) {
        if (picked.length < n && picked.indexOf(id) < 0 && inPool(id) && rand() < p) picked.push(id);
      });
    };
    add(R.lookalikes || [], 0.9);
    add(RH().list.filter(function (x) { return x.group === R.group; }).map(function (x) { return x.id; }), 0.8);
    add(all, 1);
    return shuffle(picked, rand);
  }

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

  // Exam question list from a set of rhythm ids: every lethal rhythm in the set at least
  // once (VT twice in the core set), then as many different rhythms as fit, spread over
  // the groups, then random. No rhythm twice in a row if avoidable.
  function examPlan(count, rand, ids) {
    rand = rand || Math.random;
    ids = ids || RH().list.map(function (r) { return r.id; });
    const list = ids.map(function (id) { return RH().byId[id]; });
    const plan = [];
    list.forEach(function (r) { if (r.lethal && plan.length < count) plan.push(r.id); });
    if (list.length <= 6) list.forEach(function (r) { if (r.lethal && count >= 10 && plan.length < count) plan.push(r.id); });
    // Round-robin across groups so a short exam still covers sinus, atrial, junctional, ventricular, blocks.
    const byGroup = {};
    shuffle(list.filter(function (r) { return !r.lethal; }), rand).forEach(function (r) { (byGroup[r.group] = byGroup[r.group] || []).push(r.id); });
    const gs = shuffle(Object.keys(byGroup), rand);
    let added = true;
    while (plan.length < count && added) {
      added = false;
      gs.forEach(function (g) { if (plan.length < count && byGroup[g].length) { plan.push(byGroup[g].shift()); added = true; } });
    }
    while (plan.length < count) plan.push(list[Math.floor(rand() * list.length)].id);
    let best = shuffle(plan, rand);
    for (let tries = 0; tries < 80; tries++) {
      let repeats = 0;
      for (let i = 1; i < best.length; i++) if (best[i] === best[i - 1]) repeats++;
      if (!repeats) break;
      best = shuffle(plan, rand);
    }
    return best;
  }

  function scoreExam(results, passMark, lethalRule) {
    const total = results.length;
    const correct = results.filter(function (r) { return r.ok; }).length;
    const lethal = results.filter(function (r) { return RH().byId[r.rhythm].lethal; });
    const lethalMissed = lethal.filter(function (r) { return !r.ok; }).length;
    const pct = total ? Math.round((correct / total) * 1000) / 10 : 0;
    const passScore = pct >= passMark;
    const passLethal = !lethalRule || lethalMissed === 0;
    const groups = RH().groups.map(function (g) {
      const rs = results.filter(function (r) { return RH().byId[r.rhythm].group === g.id; });
      return { id: g.id, name: g.name, total: rs.length, correct: rs.filter(function (r) { return r.ok; }).length };
    }).filter(function (g) { return g.total; });
    return {
      total: total, correct: correct, pct: pct,
      lethalTotal: lethal.length, lethalMissed: lethalMissed,
      passScore: passScore, passLethal: passLethal, passed: passScore && passLethal,
      groups: groups
    };
  }

  root.EKG = root.EKG || {};
  root.EKG.quiz = {
    findings: findings, mismatches: mismatches, choices: choices, pickRhythm: pickRhythm,
    examPlan: examPlan, scoreExam: scoreExam, readRate: readRate, shuffle: shuffle, edgeNote: edgeNote, boxes: boxes
  };
})(typeof window !== "undefined" ? window : globalThis);
