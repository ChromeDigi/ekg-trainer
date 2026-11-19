# Future module: adaptive learning and mastery

Status: **documented, next after phase 2.** Extends the phase 1 missed-rhythm system
(`js/progress.js`, `ekg.progress.v1`). Must be real learning data: the 3D campus reads it.

## Requirements (owner, 2026-11-19)
- Missed rhythms come back sooner; correct ones at growing intervals.
- Hard concepts get more practice; lookalikes are deliberately contrasted.
- Extra practice near diagnostic boundaries (rate cutoffs, PR 0.20 s, QRS 0.12 s).
- Accuracy, speed and repeated mistakes set review priority.
- Mastery needs repeated successful recall over time, not one lucky answer.
- Mastered material returns periodically so it isn't forgotten.
- Timed exam and untimed practice performance tracked separately.
- Show rhythm mastery, category mastery, retention trend, improvement over time.
- Short sessions: weakest rhythms; likely to forget; compare confusable rhythms; timed exam;
  review past exam errors.
- Material awaiting professional review stays clearly marked.

## Algorithm choice: FSRS (recommended) vs SM-2
| | SM-2 | FSRS |
|---|---|---|
| What it is | SuperMemo 2 (1987): ease factor and growing intervals | Free Spaced Repetition Scheduler: models each item's difficulty, stability and current recall probability; Anki's optional scheduler since 2023 |
| Strength | Tiny, simple | Gives a recall probability per item, which directly powers "likely to forget" and honest mastery |
| Weakness | No recall probability; ease drifts | More math; best with per-user parameter fitting (default parameters are fine to start) |

Pick FSRS with default parameters, implemented in a small vanilla JS file (formulas are
published; an MIT-licensed reference implementation, ts-fsrs, exists to check against).
Verify the current FSRS version and formulas at implementation time.

## What is an "item"
Strips are generated, so items are skills, not fixed cards:
- One item per rhythm (for example "sinus brady").
- Boundary items per rhythm (strips generated near a cutoff).
- Contrast items per confusable pair (for example "flutter vs AFib"), built from the
  confusion matrix of past answers.

## Grading each answer
- Wrong: Again. Correct but slow: Hard. Correct: Good. Correct and fast: Easy.
- "Slow" and "fast" are per rhythm, from the learner's own history (for example slower
  than their 75th percentile, faster than their 25th).
- Exam answers update scheduling too but are stored and reported separately.

## Mastery definition (draft, tune with the nurse)
A rhythm is mastered when:
1. Recall probability is 0.90 or higher today, and
2. Stability is at least 21 days, and
3. At least 3 correct recalls on different days, the last one under the speed target, and
4. No miss in the last 5 attempts.
Category mastery = share of its rhythms mastered, weighted by recall probability.
Campus illumination uses these numbers only.

## Data
- New key `ekg.progress.v2` with per-item state and a review log; migrate from v1 by
  replaying the stored answers (they have timestamps). Keep v1 untouched.
- Still local only.

## Screens
- Today: due reviews count, a 5-minute session button, weakest 3 rhythms.
- Mastery: per rhythm and per category, recall probability, next review date.
- Trends: weekly accuracy and speed, practice vs exam shown separately.
- Exam history with "review my errors from this exam".

## Not in this module
Photo import, 3D, video.
