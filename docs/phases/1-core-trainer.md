# Phase 1: Core trainer (5 rhythms)

Owner request 2026-11-19 widened phase 1: a working app, not just the strip engine.
New context: he understands rhythms but has test anxiety, and is retaking a hospital
dysrhythmia exam during orientation. Exam provider unknown (HUMC internal, HealthStream,
Relias/Prophecy or other), so the app teaches general interpretation and never claims to
copy a specific exam.

## Scope
- Rhythms: normal sinus, sinus brady, sinus tach, atrial fibrillation, monomorphic VT.
- Strip engine: code-generated lead II, 25 mm/s, 10 mm/mV, 1 mV calibration pulse,
  1 s time marks, 6-second strip. Waveform = sum of Gaussian P, Q, R, S, T waves per beat
  (the morphology approach of McSharry et al. 2003, ECGSYN), with rate, PR, QRS, QT,
  amplitude, f-waves, baseline wander and noise randomized inside each rhythm's criteria.
- Learn: systematic approach, one card per rhythm (criteria, lookalikes, sources, live or
  static example, new example button).
- Practice (untimed): 4 choices, instant feedback with the measured findings from that
  exact strip and why each wrong choice is wrong. Calipers, 2x zoom.
- Review misses: missed rhythms queue until answered right twice in a row; practice also
  weights weak rhythms.
- Exam (timed): 10/20/25 strips, 30/45/60 s per strip, pass mark 80/85/90%, lethal rule
  (100% on VT), optional countdown, review of every strip after.
- Progress: overall and per-rhythm accuracy and speed, exam history, last-7-days vs before.
- Offline + Add to Home Screen (service worker, manifest).
- Disclaimer on first open and in About: educational simulation only.

## Not in phase 1
More rhythms, 12-lead, scenarios, post-op pacing, app icon, light theme.

## Where this beats the 3 compared apps
Explanations use the measured values of the strip on screen (not a canned paragraph),
every wrong choice gets its own reason, and misses come back until fixed.

## Tests (`node tests/run.js`)
Thousands of seeded strips per rhythm: generated features inside the rhythm's criteria,
R peaks detected from the signal match the beat list, amplitude fits the window, correct
answer has zero criteria mismatches and every distractor has at least one, exam scoring.

## Status
Done 2026-11-19.
- `node tests/run.js`: 259,866 checks pass (1,500 seeded strips per rhythm).
- Driven in Chromium emulating iPhone 13: welcome, practice + feedback, calipers, learn,
  monitor view, 10-strip exam, results review, progress. No console errors, no horizontal
  scroll at 360 px, service worker registers, progress saved to `ekg.progress.v1`.
- Deployed 2026-11-19 to https://chromedigi.github.io/ekg-trainer/ (Pages, branch main).
  Live checks in Chromium: all 10 files serve 200 with correct types; full click-through
  as iPhone 13 with no errors; no horizontal scroll on iPhone 13, iPhone SE, landscape and
  360 px; offline reload after first visit still renders strips and choices.
- Not verified: real iPhone Safari (WebKit isn't installed in the build environment) (layout, Add to Home Screen, offline after install),
  clinical review by the nurse.
