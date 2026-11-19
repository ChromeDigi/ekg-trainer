/* FSRS-6 spaced-repetition scheduler. A straight port of the reference py-fsrs 6.3.3
   (open-spaced-repetition, MIT) with its default parameters, desired retention 0.90,
   learning steps 1 and 10 min, relearning step 10 min, and no interval fuzz.
   tests/fsrs-vectors.json holds numbers produced by py-fsrs itself; tests/run.js checks
   this file against them. Pure math, no DOM, no storage. Times are ms since epoch. */
(function (root) {
  "use strict";
  const W = [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796,
    1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542];
  const DECAY = -W[20], FACTOR = Math.pow(0.9, 1 / DECAY) - 1;
  const RETENTION = 0.9, MAX_IVL = 36500;
  const MIN = 60e3, DAY = 864e5;
  const LEARN = [1 * MIN, 10 * MIN], RELEARN = [10 * MIN];
  const S_MIN = 0.001;
  const LEARNING = 1, REVIEW = 2, RELEARNING = 3;
  const AGAIN = 1, HARD = 2, GOOD = 3, EASY = 4;

  const clampD = function (d) { return Math.min(Math.max(d, 1), 10); };
  const clampS = function (s) { return Math.max(s, S_MIN); };
  const days = function (from, to) { return Math.max(0, Math.floor((to - from) / DAY)); };

  function newCard() { return { state: LEARNING, step: 0, s: null, d: null, due: null, last: null }; }

  // Probability of recalling the item at time `now` (0 for a card never reviewed).
  function retrievability(c, now) {
    if (c.last == null || c.s == null) return 0;
    return Math.pow(1 + FACTOR * days(c.last, now) / c.s, DECAY);
  }
  function initD(g) { return W[4] - Math.exp(W[5] * (g - 1)) + 1; }
  function nextD(d, g) {
    const delta = -(W[6] * (g - 3));
    const damped = d + (10 - d) * delta / 9;
    return clampD(W[7] * initD(EASY) + (1 - W[7]) * damped);
  }
  function shortS(s, g) {
    let inc = Math.exp(W[17] * (g - 3 + W[18])) * Math.pow(s, -W[19]);
    if (g >= HARD) inc = Math.max(inc, 1);
    return clampS(s * inc);
  }
  function nextS(d, s, r, g) {
    if (g === AGAIN) {
      const lt = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]);
      return clampS(Math.min(lt, s / Math.exp(W[17] * W[18])));
    }
    const hard = g === HARD ? W[15] : 1, easy = g === EASY ? W[16] : 1;
    return clampS(s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hard * easy));
  }
  // Python round() is round-half-to-even; match it so intervals agree exactly.
  function pyRound(x) {
    const f = Math.floor(x), diff = x - f;
    if (Math.abs(diff - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
    return Math.round(x);
  }
  function interval(s) {
    const ivl = pyRound((s / FACTOR) * (Math.pow(RETENTION, 1 / DECAY) - 1));
    return Math.min(Math.max(ivl, 1), MAX_IVL);
  }

  // Review card `c` with grade g (1 Again, 2 Hard, 3 Good, 4 Easy) at time `now`.
  // Returns a new card; `c` is not changed.
  function review(c, g, now) {
    c = Object.assign({}, c);
    const gap = c.last != null ? days(c.last, now) : null;
    let next; // ms until due
    const updateSD = function () {
      if (c.s == null || c.d == null) { c.s = clampS(W[g - 1]); c.d = clampD(initD(g)); }
      else if (gap != null && gap < 1) { c.s = shortS(c.s, g); c.d = nextD(c.d, g); }
      else { c.s = nextS(c.d, c.s, retrievability(c, now), g); c.d = nextD(c.d, g); }
    };
    const toReview = function () { c.state = REVIEW; c.step = null; next = interval(c.s) * DAY; };
    const stepped = function (steps) {
      if (!steps.length || (c.step >= steps.length && g >= HARD)) return toReview();
      if (g === AGAIN) { c.step = 0; next = steps[0]; }
      else if (g === HARD) {
        next = c.step === 0 && steps.length === 1 ? steps[0] * 1.5
          : c.step === 0 && steps.length >= 2 ? (steps[0] + steps[1]) / 2 : steps[c.step];
      } else if (g === GOOD) {
        if (c.step + 1 === steps.length) toReview();
        else { c.step += 1; next = steps[c.step]; }
      } else toReview();
    };
    if (c.state === LEARNING) { updateSD(); stepped(LEARN); }
    else if (c.state === REVIEW) {
      if (gap != null && gap < 1) c.s = shortS(c.s, g);
      else c.s = nextS(c.d, c.s, retrievability(c, now), g);
      c.d = nextD(c.d, g);
      if (g === AGAIN && RELEARN.length) { c.state = RELEARNING; c.step = 0; next = RELEARN[0]; }
      else next = interval(c.s) * DAY;
    } else { updateSD(); stepped(RELEARN); }
    c.due = now + next;
    c.last = now;
    return c;
  }

  root.EKG = root.EKG || {};
  root.EKG.fsrs = {
    newCard: newCard, review: review, retrievability: retrievability,
    AGAIN: AGAIN, HARD: HARD, GOOD: GOOD, EASY: EASY, LEARNING: LEARNING, REVIEW: REVIEW, RELEARNING: RELEARNING, DAY: DAY
  };
})(typeof window !== "undefined" ? window : globalThis);
