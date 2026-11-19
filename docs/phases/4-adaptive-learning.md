# Step 3: Adaptive learning and mastery

Spec source: `docs/future/adaptive-learning.md` (owner requirements, 2026-11-19).
Branch: `step-3-adaptive-learning`. Status: see the bottom of this file.

## What it does
The app remembers how well the nurse knows each rhythm and decides what to show next.
Missed rhythms come back within minutes, then at growing gaps once they're right.
Confused pairs (flutter vs AFib) get head-to-head drills. Near-cutoff strips get their
own practice. Mastery is only claimed after repeated correct recall spread over weeks.

## Who it's for
The one telemetry / stepdown nurse using this on night shift: short sessions on a
break, no setup, no buttons for grading yourself.

## Not in this version
- No per-user FSRS parameter fitting (default FSRS-6 parameters only).
- No interval fuzz (keeps tests exact; one learner, so no review pile-ups to spread out).
- No notifications or reminders (no backend, and iOS web push needs extra setup).
- No sync between phones, no accounts.
- No 3D campus, photo import or video.
- Mastery rules are a draft to tune with the nurse, not a validated standard.

## How similar tools do it, and where this can be better
| Tool | How it schedules | Weak spot | What we do instead |
|---|---|---|---|
| Anki with FSRS (scheduler option since Anki 23.10) | FSRS from the learner's own Again/Hard/Good/Easy button | Self-grading: tired learners press Good on a guess | Grade automatically: wrong = Again, then Hard/Good/Easy from the learner's own speed history |
| Question banks (UWorld/AMBOSS style) | Percent correct per topic, learner picks what to redo | Accuracy, no forgetting model; "80%" can be from last month | Recall probability decays with time, so "likely to forget" is real |
| Typical ECG quiz apps | Random strips from a fixed image set | Same pictures memorized; no notion of confusable pairs | New generated strip every time; contrast items built from the learner's own mistakes |
Each strip is new, so the item being learned is the skill (recognize sinus brady), not a card.

## Design
**Algorithm.** `js/fsrs.js` is a straight port of the reference py-fsrs 6.3.3
(open-spaced-repetition, MIT): FSRS-6, 21 default parameters, desired retention 0.90,
learning steps 1 and 10 minutes, relearning step 10 minutes, no fuzz. Tests compare it
with numbers produced by py-fsrs itself.

**Items.**
- `r:<rhythm>`: recognizing the rhythm (26).
- `b:<rhythm>`: recognizing it on a near-cutoff strip (rhythms with a cutoff).
- `c:<a>|<b>`: telling a confused pair apart. Created the first time b is picked for a
  (or a for b). Graded whenever a strip of a or b shows both as choices.

**Grading.** Wrong or timed out = Again. Correct: compared with the last correct times on
that rhythm in the same mode (practice untimed, exam timed). With at least 5 earlier
times: slower than their 75th percentile = Hard, faster than their 25th = Easy, else Good.
Fewer than 5 = Good.

**Mastery (draft).** A rhythm is mastered when: recall probability today 0.90 or more,
stability 21 days or more, 3 or more correct answers on different days, the last correct
one not graded Hard, and no miss in its last 5 attempts. Category mastery = average over
its rhythms of (recall probability if mastered, else 0). The campus will read these.

**Data.** `ekg.progress.v2` = `{ v: 2, answers, sessions, items }`. Answers gain `pick`
and `edge`. Items hold FSRS state plus the small history mastery needs. First load
replays the `ekg.progress.v1` answers in time order through the scheduler; v1 is left
untouched. The old "right twice in a row" review list is replaced by FSRS due items.

**Screens.**
- Home, Today card: due now, due later today, new; "Start a 5-minute review"
  (10 strips, due first); weakest 3 rhythms; mastered count.
- Practice sessions (10 strips, summary at the end): Due review, Weakest, Likely to
  forget, Confused pairs, Near the cutoffs, Exam errors. Free practice by rhythm set
  stays, now weighted by recall probability.
- Progress: Mastery (per group and rhythm, recall probability, next review), Trends
  (weekly accuracy and speed, practice and exam apart, mastered count per week),
  Exams (history with "review my errors from this exam").
- Rhythm cards stay marked "Pending nurse review"; the Mastery screen says the rules are
  a draft.

## Status (2026-11-19)
Built on branch `step-3-adaptive-learning`, committed, not pushed.

Verified:
- `node tests/run.js`: about 3.07 million checks pass, including 362 FSRS reviews matching
  py-fsrs exactly, v1 to v2 migration (v1 untouched, replay in time order), grading,
  due times, contrast and boundary items, mastery gained over weeks and lost on a miss or
  with time, and weekly trends.
- Chromium at iPhone 13 (light) and iPhone SE (dark) with a month of seeded v1 answers:
  migration ran, a full 10-strip review session, session summary, Mastery, Trends and
  Exams views. No console errors, no horizontal scroll, no visible tap target under 44 px.
- Intro screenshots regenerated (`tools/capture-tour.js`); intro text updated, intro
  version not bumped (no need to show it again).
- Service worker cache `ekg-v4` (adds `js/fsrs.js`).

Not verified:
- Real iPhone: Today card, sessions and Progress views at real size, VoiceOver on the new
  tables and buttons.
- Behavior over real weeks of use (tests simulate time; the scheduler's long gaps can't be
  felt in one day).

Changes from the spec:
- "Review past exam errors" works for exams taken after this update; older exam records
  didn't store which rhythms were missed.
- Trends replays the stored answers (up to 5000) to count mastered rhythms per week.
