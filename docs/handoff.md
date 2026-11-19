# Handoff

Updated 2026-11-19. Read CLAUDE.md, then docs/plan.md, then this.

## Done
- Phase 1 and 2 live at https://chromedigi.github.io/ekg-trainer/ (26 rhythms, exam).
- Step 2b (premium UI, icon, light/dark, strip themes, Home dashboard, intro) merged to main
  and live. Owner checked it on a real iPhone: "looks perfect".

## In progress
- Step 3 (adaptive learning) built on branch `step-3-adaptive-learning`, committed, not
  pushed. FSRS-6 scheduler (`js/fsrs.js`), `ekg.progress.v2` with v1 replay, contrast and
  near-cutoff items, mastery, Today card on Home, 10-strip sessions, Progress
  Mastery/Trends/Exams. Details, verification and gaps: `docs/phases/4-adaptive-learning.md`.
- Waiting for the owner's "push", then merge to main and a real-iPhone check.

## Next
- After the push: merge to main, owner checks on the iPhone.
- Then clinical side-tracks ("what now" scenarios, post-op strips) or step 4/5 per
  docs/plan.md. Prompts in docs/prompts.md.
- Nurse review of the 26 rhythm cards (all `review: "pending"`) and of the draft mastery
  rules is still open. Most important open item.
- After UI changes: `python3 -m http.server 8765` then `node tools/capture-tour.js`.
- FSRS vectors: `tools/fsrs-vectors.py` (needs `pip install fsrs==6.3.3` in a venv).

## Environment notes
- litfl.com fetches work with plain curl. Use the exact slugs from `docs/sources.md`.
- NCBI Bookshelf, PMC and AHA Journals answered with reCAPTCHA / Cloudflare checks on
  2026-11-19. StatPearls asystole (S29) is cited from a search excerpt only.
- GitHub's Pages API is blocked by the session proxy; Pages settings are changed by the owner.
- Owner approves every push (send a phone notification naming the change).

## Open questions
- Which exam HUMC uses, its format and pass mark.
- Which rhythms feel wrong or too easy on the real monitor.
- Mastery rules: are 21 days and 3 days the right bar for this nurse's exam timeline?
- Campus: is "the Pavilion" Schlesinger Pavilion; St. John height; real fountain location.
