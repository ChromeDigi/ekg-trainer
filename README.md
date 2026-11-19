# EKG Trainer

Phone-first, offline rhythm strip practice for telemetry / stepdown nurses. Plain HTML,
CSS and JavaScript, no dependencies.

**Educational simulation only.** Strips are computer-generated. Not for patient
monitoring, diagnosis or treatment decisions. Not affiliated with any hospital or exam
provider.

## What's in it (phase 1)
- 5 rhythms: normal sinus, sinus brady, sinus tach, atrial fibrillation, monomorphic VT
- Learn: the 5-step approach and one card per rhythm, with paper or live monitor view
- Practice: untimed, explanations built from the strip on screen, "why not" for each wrong choice
- Missed: rhythms you miss stay here until you get them right twice in a row
- Exam: timed, 10/20/25 strips, pass mark 80/85/90%, lethal rule, full review after
- Progress: accuracy and speed per rhythm, this week vs before, exam history
- Calipers and 2x zoom on every strip; works offline

## Run it
Serve the folder with any static server, for example `python3 -m http.server 8000`,
then open http://localhost:8000. (Opening `index.html` directly works too, minus offline mode.)

## Test it
`node tests/run.js` generates 1,500 strips per rhythm and checks each against its criteria
and the answer key.

## Docs
`docs/plan.md` (roadmap), `docs/spec.md` (look), `docs/sources.md` (clinical references),
`docs/phases/` (per-phase status).
