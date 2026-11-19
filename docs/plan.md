# Plan

## What it is
A phone web app that drills rhythm strips for a telemetry / stepdown night-shift nurse:
read the strip, measure it, name it, then decide what to do. Works offline, installs to
the Home Screen, no login.

## Who it's for
One nurse on 5 St. John (tele/stepdown, HUMC), cross-training in CTICU. If it's good,
his coworkers. Details in `docs/research.md`.

## What v1 will NOT do
- No accounts, backend, sync between devices, or leaderboards.
- No 12-lead EKGs (v2).
- No hemodynamics, IABP or Impella waveforms, art line or PA tracings (v2 at the earliest).
- No hospital-specific policies or protocols, and nothing framed as HUMC policy.
- No real patient strips, no copied strip images.
- No drug dosing calculators.
- No CE credit or certification.

## Phases

| # | Phase | What ships | Status |
|---|---|---|---|
| 0 | Foundation | CLAUDE.md, plan, spec, research, decisions, sources | done |
| 1 | Core trainer (5 rhythms) | Strip engine, Learn, untimed Practice with measured explanations, Missed review, timed Exam, Progress, calipers, offline. Widened on owner request; see `docs/phases/1-core-trainer.md` | done |
| 2 | Full rhythm set | Rest of the basic set below, lookalike pairs (SVT vs sinus tach, flutter vs AFib), borderline strips, nurse feedback round | next |
| 3 | Exam realism | Exam formats once the HUMC test is known (fill-in vs multiple choice, interval questions), optional 5-choice mode | |
| 4 | Weak spots + | Short daily set, streaks, speed targets per rhythm | |
| 5 | Stepdown "what now" | Strip + vitals + one line of context, then stable vs unstable and next action; every answer sourced, reviewed by the nurse | |
| 6 | Post-op heart surgery | Epicardial pacing modes (AAI, VVI, DDD), failure to capture / sense, oversensing, post-op AFib | |
| 7 | Polish + share | Icon (ChatGPT prompt in spec), name, GitHub Pages link, feedback round with the nurse | |

v1 = phases 1 to 4. He tests after phase 2.

## Basic rhythm set (phase 2, final list checked against sources)
Sinus: normal sinus, sinus brady, sinus tach, sinus arrhythmia, sinus pause/arrest.
Atrial: PACs, atrial flutter, atrial fibrillation (controlled and RVR), SVT.
Junctional: junctional, accelerated junctional, junctional tach.
Ventricular: PVCs (unifocal, multifocal, bigeminy, couplets), idioventricular,
accelerated idioventricular, monomorphic VT, torsades, VF (coarse, fine), asystole.
Blocks: 1st degree, 2nd degree type I, 2nd degree type II, 3rd degree.
Paced: atrial paced, ventricular paced, AV paced, failure to capture, failure to sense.
Lethal set for the exam rule: VT, VF, asystole, torsades.

## Open questions for the nurse
- Which exam does HUMC use (Relias or internal), and the pass mark?
- What does the CTICU quiz him on most?
- After phase 2: what's missing, what's wrong, what's annoying.
