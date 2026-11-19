# Build prompts

Paste one to start a phase. Each assumes Claude reads CLAUDE.md and docs first.

## Phase 1: Strip engine
"Start phase 1 of docs/plan.md. Write docs/phases/1-strip-engine.md first. Build the
waveform generator and canvas strip from docs/spec.md: 6-second lead II, real scale grid,
live sweep, 5 starter rhythms (normal sinus, sinus brady, sinus tach, atrial fib, VT),
and a simple browse screen. Add sources for those 5 to docs/sources.md. Run it at
360 px wide and show me screenshots."

## Phase 2: Full rhythm set
"Start phase 2. Phase doc first. Add the rest of the basic rhythm set in docs/plan.md,
lookalikes first (SVT, atrial flutter, junctional, PVCs, heart blocks, VF, asystole,
torsades), each with sources in docs/sources.md, generator tests, and the nurse's feedback
from phase 1. Screenshot at phone width."

## Phase 3: Exam mode
"Start phase 3. Phase doc first. Timed exam with a set count, selectable pass mark
(80/85/90%), 100% lethal rule, and review of misses."

## Phase 4: Weak spots
"Start phase 4. Phase doc first. Track results per rhythm in ekg.progress.v1, bring
missed rhythms back more often, add a short daily set and a Progress screen."

## Phase 5: Stepdown "what now"
"Start phase 5. Phase doc first. Scenarios: strip + vitals + one line of context, then
stable vs unstable and next action. Every answer sourced and tagged review pending."

## Phase 6: Post-op heart surgery
"Start phase 6. Phase doc first. Epicardial pacing modes, failure to capture / sense,
oversensing, post-op AFib. Sourced, review pending."

## Phase 7: Polish + share
"Start phase 7. Phase doc first. Icon from the ChatGPT prompt, final name, GitHub Pages,
and a feedback checklist for the nurse."
