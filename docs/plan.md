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

## Long-term goal
A serious ECG learning app with scientifically grounded mastery tracking, a faithful 3D
miniature of the real HUMC campus that lights up with demonstrated mastery, and a
cinematic intro. Worth using regularly, not a tech demo. The core trainer stays fast,
offline and usable without any of the heavy modules.

## Delivery sequence (owner, 2026-11-19)

| # | Step | Spec | Status |
|---|---|---|---|
| 0 | Foundation docs | this folder | done |
| 1 | Core trainer, 5 rhythms | `docs/phases/1-core-trainer.md` | done |
| 1b | GitHub Pages deploy + verify | live at https://chromedigi.github.io/ekg-trainer/ | done; owner tested on a real iPhone, nothing to fix |
| 2 | Difficult rhythms: clinically accurate advanced rhythms, meaningful lookalikes, borderline strips, stronger exam prep | `docs/phases/2-difficult-rhythms.md` | done and live; nurse review pending |
| 2b | Premium UI: app icon, icon system, design language, home dashboard, first-launch onboarding (replaces old step 8) | `docs/phases/3-premium-ui.md` | done and live; owner checked it on a real iPhone: "looks perfect" |
| 3 | Adaptive learning: FSRS spaced repetition, mastery, contrast and boundary practice, practice vs exam tracking | `docs/phases/4-adaptive-learning.md` | done and live (merged 2026-11-19, live site checked in Chromium); real-iPhone check pending |
| 4 | Photo import (optional): educational images, on-device, privacy-first | `docs/future/photo-import.md` | when rules can be met |
| 5 | Campus research and blockout: reference boards, ambiguity log, accurate massing | `docs/future/3d-campus.md` | |
| 6 | Campus mastery visualization: detailed models, lighting, mastery-driven illumination | `docs/future/3d-campus.md` | |
| 7 | Cinematic intro video from real, finished features | `docs/future/cinematic-intro.md` | |
| 8 | iPhone install and usage walkthrough | `docs/future/iphone-onboarding.md` | moved into 2b (owner, 2026-11-19) |
| 9 | Final QA: accessibility, iPhone performance, clinical-content verification | | |

Clinical side-tracks to fit in after step 3, once the core is solid:
stepdown "what now" scenarios (strip + vitals, stable vs unstable, sourced, nurse-reviewed)
and post-op heart surgery strips (epicardial pacing modes, failure to capture or sense,
post-op AFib).

Rules for the roadmap: don't rebuild or replace the working trainer; heavy modules (3D,
video) load separately and only when opened; any new dependency gets an owner decision
first (logged in `docs/decisions.md`).

## Basic rhythm set (phase 2, final list checked against sources)
Sinus: normal sinus, sinus brady, sinus tach, sinus arrhythmia, sinus pause/arrest.
Atrial: PACs, atrial flutter, atrial fibrillation (controlled and RVR), SVT.
Junctional: junctional, accelerated junctional, junctional tach.
Ventricular: PVCs (unifocal, multifocal, bigeminy, couplets), idioventricular,
accelerated idioventricular, monomorphic VT, torsades, VF (coarse, fine), asystole.
Blocks: 1st degree, 2nd degree type I, 2nd degree type II, 3rd degree.
Paced: atrial paced, ventricular paced, AV paced, failure to capture, failure to sense
(moved to the post-op side-track; not in phase 2).
Lethal set for the exam rule: VT, VF, asystole, torsades.
Phase 2 built all of the above except paced (26 rhythms).

## Open questions for the nurse
- Which exam does HUMC use (Relias, HealthStream, internal), format and pass mark?
- What does the CTICU quiz him on most?
- After real-iPhone testing and phase 2: what's missing, wrong or annoying.
- Campus: is "the Pavilion" Schlesinger Pavilion? St. John height? Real fountain?
