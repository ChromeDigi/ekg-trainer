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
- Step 2b (premium UI) built on branch `step-2b-premium-ui`, committed, not pushed. Coded app
  icon, 30-icon sprite, tokens, restyle and micro-animations, Home dashboard, 8-card intro
  with real screenshots. Revised the same day: light default plus dark mode (System
  default), separate strip themes (paper, green, amber), blue-teal icon with orange accent. Verified in Chromium at iPhone 13 and SE (details and what was not
  verified in `docs/phases/3-premium-ui.md`). Service worker cache `ekg-v3`.
- Waiting for the owner's "push", then a real-iPhone check (Add to Home Screen icon,
  intro, full-screen strip, safe areas).

## Next
- After the push: merge to main so GitHub Pages serves it, check on the iPhone.
- Then step 3 (adaptive learning), campus, video, final QA. Prompt in docs/prompts.md.
- Regenerate icons with `node tools/make-icons.js` and intro screenshots with
  `python3 -m http.server 8765 & node tools/capture-tour.js` after UI changes.
- Nurse review of the 26 rhythm cards (all `review: "pending"`) is still open.

## Notes for step 2b
- Local Playwright + Chromium render the icon PNGs and screenshots (see how phase 2
  drove the app: python3 -m http.server, devices['iPhone 13']).
- Video later: the HyperFrames compose tool is disabled from Claude Code; Remotion needs
  npm and stays outside the app (dev-only), owner approves first.

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
