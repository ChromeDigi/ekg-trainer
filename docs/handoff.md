# Handoff

Updated 2026-11-19. Read CLAUDE.md, then docs/plan.md, then this.

## Done
- Phase 1 trainer (5 rhythms) built, tested (`node tests/run.js`, ~260k checks) and live:
  https://chromedigi.github.io/ekg-trainer/ (GitHub Pages, branch main, root).
- Live site verified in Chromium as iPhone 13 / SE / landscape: all files 200, no errors,
  no horizontal scroll, offline reload works. WebKit isn't installed in the cloud box.
- Future modules documented in `docs/future/` (3D campus with corrected priorities and
  the official map checked, adaptive learning with FSRS, photo import, cinematic intro,
  iPhone onboarding). Roadmap in docs/plan.md.

## In progress
- Owner testing on a real iPhone (checklist: install via Add to Home Screen, airplane
  mode, Measure drag doesn't scroll the page, Zoom swipe, exam timer, grid readable).

## Next
- Fix anything from the iPhone test, then step 2 (difficult rhythms). Prompt in
  docs/prompts.md.

## Environment notes
- Cloud environment "ChromeDigi apps" allows chromedigi.github.io, litfl.com, NCBI, PMC,
  AHA Journals and the HMH site, so clinical sources can be read directly now.
- GitHub's Pages API is blocked by the session proxy; Pages settings are changed by the owner.
- Owner approves every push (send a phone notification naming the change).

## Open questions
- Which exam HUMC uses, its format and pass mark.
- Campus: is "the Pavilion" Schlesinger Pavilion; St. John height; real fountain location.
