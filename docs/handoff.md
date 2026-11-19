# Handoff

Updated 2026-11-19. Read CLAUDE.md, then docs/plan.md, then this.

## Done
- Phase 1 trainer live at https://chromedigi.github.io/ekg-trainer/. Owner tested it on a
  real iPhone: nothing to fix.
- Phase 2 (difficult rhythms) built and committed: 26 rhythms, lookalike distractors,
  near-cutoff strips, exam with all lethal rhythms and a group breakdown. Spec and status
  in `docs/phases/2-difficult-rhythms.md`. `node tests/run.js` passes about 3 million checks.
- Future modules documented in `docs/future/`. Roadmap in docs/plan.md.

## In progress
- Phase 2 waits for the owner's push. After the push: verify the live site (files 200,
  click-through at iPhone width, offline reload; service worker cache is now `ekg-v2`).

## Next
- Nurse review of the 26 rhythm cards (all `review: "pending"`).
- Step 3 (adaptive learning, FSRS). Prompt in docs/prompts.md.

## Environment notes
- litfl.com fetches work with plain curl. Use the exact slugs from `docs/sources.md`;
  wrong slugs return 403, not 404.
- NCBI Bookshelf, PMC and AHA Journals answered with reCAPTCHA / Cloudflare checks on
  2026-11-19 (curl and the web-fetch agent). StatPearls asystole (S29) is cited from a
  search excerpt only; re-read it in a browser during the nurse review.
- GitHub's Pages API is blocked by the session proxy; Pages settings are changed by the owner.
- Owner approves every push (send a phone notification naming the change).

## Open questions
- Which exam HUMC uses, its format and pass mark.
- After phase 2: which rhythms feel wrong or too easy on the real monitor.
- Campus: is "the Pavilion" Schlesinger Pavilion; St. John height; real fountain location.
