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
- Phase 2 is live and verified in Chromium (service worker cache `ekg-v2`).
- Owner tested phase 2 on the real iPhone and asked for a premium redesign (2026-11-19).
  Full request captured in `docs/phases/3-premium-ui.md`; new delivery order in
  docs/plan.md (step 2b first). Nothing built yet.

## Next
- Step 2b on a new branch, in this order: SVG app icon + all icon assets; custom icon
  sprite + design tokens; restyled components and micro-animations; Home dashboard with
  honest data; skippable onboarding with real screenshots. Prompt in docs/prompts.md.
- Then step 3 (adaptive learning), campus, video, final QA.
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
