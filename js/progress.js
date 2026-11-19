/* Progress and prefs in localStorage. Versioned keys; bump + migrate if shapes change.
   ekg.progress.v1 = { answers: [{ r, ok, ms, mode, at }], sessions: [...], review: { id: n } }
   ekg.prefs.v1    = { ack, tour, exam: { count, seconds, passMark, lethal, showTimer, set, edge } }
   (tour = version of the intro last seen; additive field, defaults to 0, no key bump) */
(function (root) {
  "use strict";
  const PKEY = "ekg.progress.v1", FKEY = "ekg.prefs.v1";
  const MAX_ANSWERS = 2000, MAX_SESSIONS = 200;

  function read(key, fallback) {
    try {
      const raw = root.localStorage && root.localStorage.getItem(key);
      return raw ? Object.assign({}, fallback, JSON.parse(raw)) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { root.localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }

  const emptyProgress = function () { return { answers: [], sessions: [], review: {} }; };
  let P = read(PKEY, emptyProgress());
  let F = read(FKEY, { ack: false, exam: { count: 20, seconds: 45, passMark: 85, lethal: true, showTimer: true } });

  function save() {
    if (P.answers.length > MAX_ANSWERS) P.answers = P.answers.slice(-MAX_ANSWERS);
    if (P.sessions.length > MAX_SESSIONS) P.sessions = P.sessions.slice(-MAX_SESSIONS);
    write(PKEY, P);
  }

  // A miss puts the rhythm in review until it's answered right twice in a row.
  function record(rhythm, ok, ms, mode) {
    P.answers.push({ r: rhythm, ok: ok, ms: Math.round(ms), mode: mode, at: Date.now() });
    if (!ok) P.review[rhythm] = 2;
    else if (P.review[rhythm]) {
      P.review[rhythm] -= 1;
      if (P.review[rhythm] <= 0) delete P.review[rhythm];
    }
    save();
  }

  function addSession(s) { P.sessions.push(Object.assign({ at: Date.now() }, s)); save(); }

  function reviewIds() { return Object.keys(P.review); }

  // Practice weights: weak and unseen rhythms come up more often.
  function weights(ids) {
    const w = {};
    ids.forEach(function (id) {
      const recent = P.answers.filter(function (a) { return a.r === id; }).slice(-10);
      const missRate = recent.length ? recent.filter(function (a) { return !a.ok; }).length / recent.length : 0.5;
      w[id] = 1 + 4 * missRate + (P.review[id] ? 2 : 0);
    });
    return w;
  }

  function stats(ids) {
    const per = ids.map(function (id) {
      const all = P.answers.filter(function (a) { return a.r === id; });
      const recent = all.slice(-20);
      const right = recent.filter(function (a) { return a.ok; });
      return {
        id: id,
        attempts: all.length,
        pct: recent.length ? Math.round((right.length / recent.length) * 100) : null,
        avgMs: right.length ? right.reduce(function (s, a) { return s + a.ms; }, 0) / right.length : null,
        inReview: !!P.review[id]
      };
    });
    const weekAgo = Date.now() - 7 * 864e5;
    const pct = function (arr) { return arr.length ? Math.round((arr.filter(function (a) { return a.ok; }).length / arr.length) * 100) : null; };
    const thisWeek = P.answers.filter(function (a) { return a.at >= weekAgo; });
    const before = P.answers.filter(function (a) { return a.at < weekAgo; });
    const okTimes = thisWeek.filter(function (a) { return a.ok; });
    return {
      per: per,
      total: P.answers.length,
      overall: pct(P.answers),
      week: pct(thisWeek),
      weekCount: thisWeek.length,
      before: pct(before),
      beforeCount: before.length,
      weekAvgMs: okTimes.length ? okTimes.reduce(function (s, a) { return s + a.ms; }, 0) / okTimes.length : null,
      exams: P.sessions.filter(function (s) { return s.mode === "exam"; }).slice(-10).reverse()
    };
  }

  // Accuracy over the most recent `last` answers for any of `ids` (practice and exam).
  // pct is null when nothing has been answered yet ("not tried yet", never 0%).
  function accuracy(ids, last) {
    const set = {};
    ids.forEach(function (id) { set[id] = true; });
    const mine = P.answers.filter(function (a) { return set[a.r]; });
    const recent = mine.slice(-(last || 20));
    const right = recent.filter(function (a) { return a.ok; }).length;
    return { n: recent.length, attempts: mine.length, right: right, pct: recent.length ? Math.round((right / recent.length) * 100) : null };
  }

  // Distinct rhythms missed most recently, newest first.
  function recentMisses(n) {
    const out = [];
    for (let i = P.answers.length - 1; i >= 0 && out.length < n; i--) {
      const a = P.answers[i];
      if (!a.ok && out.indexOf(a.r) < 0) out.push(a.r);
    }
    return out;
  }

  function reset() { P = emptyProgress(); save(); }

  root.EKG = root.EKG || {};
  root.EKG.progress = {
    record: record, addSession: addSession, accuracy: accuracy, recentMisses: recentMisses, reviewIds: reviewIds, weights: weights, stats: stats, reset: reset,
    prefs: function () { return F; },
    savePrefs: function (f) { F = f; write(FKEY, F); }
  };
})(typeof window !== "undefined" ? window : globalThis);
