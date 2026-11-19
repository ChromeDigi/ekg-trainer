# Phase 3: Premium UI, app icon, dashboard, onboarding

Owner request 2026-11-19, after testing phase 2 live on a real iPhone: "functionality is
promising, elevate the experience substantially." Goal: a visually extraordinary,
sophisticated iPhone app, not a functioning quiz website. Preserve everything that works
(26 rhythms, exam, sources, future-feature docs). Don't restart the project.

## New delivery order (owner)
1. Custom app icon and cohesive icon system.
2. Premium interface and home dashboard.
3. Short, polished, skippable first-launch onboarding (iPhone only, with Replay).
4. Adaptive learning and mastery visualization (`docs/future/adaptive-learning.md`).
5. Accurate 3D HUMC campus (`docs/future/3d-campus.md`), optional lazy module.
6. Cinematic intro video, 30 to 45 s (`docs/future/cinematic-intro.md`).
7. Final integrated iPhone QA.
Substantial features go on their own branches. Keep improving clinical accuracy throughout.

## 3a. App icon
- Starting point: the icon concept in `docs/spec.md` (near-black, luminous monitor-green
  trace, faint dark red grid). Refine it professionally.
- Real P-QRS-T morphology, readable at Home Screen size, no lettering, no HMH branding.
- Assets: apple-touch-icon 180, PWA 192 and 512 (plus maskable 512 with safe zone),
  favicon (SVG + 32 PNG). Manifest and `<head>` updated. Verify standalone launch, icon
  resolution and safe cropping. Never a screenshot of the site.
- Plan: draw it as an SVG master in code (exact waveform, crisp, versioned), render PNGs
  with the installed Chromium. AI image tools give inconsistent, uneditable raster art.

## 3b. Icon system and design language
- One custom SVG icon set, same stroke width, grid and corner style, inline sprite (no
  icon libraries, no emojis, works offline): Learn, Practice, Exam, Progress, Campus,
  each rhythm group (sinus, atrial, junctional, ventricular, AV blocks), measure, zoom,
  timer, review/missed, mastery, achievement, lethal, sources, settings/about, monitor.
- Design tokens extended in `docs/spec.md`: type scale, spacing, radii, elevation, motion
  durations and easings. Monitor-inspired, not an outdated device.
- Buttons, cards, menus, segmented controls, progress rings and bars restyled.
- Micro-animations: tab and view transitions, answer feedback (correct pulse, wrong
  shake), progress ring fill, haptic-style press states. All respect reduced motion.
- iPhone: 44 px targets, safe areas, one-handed bottom nav, contrast 4.5:1, Dynamic-ish
  type sizes, VoiceOver labels on every icon button.

## 3c. Home dashboard (new first tab)
- Animated monitor-style waveform header.
- Continue studying (big primary action), today's recommended practice, recently missed
  rhythms, per-group progress rings, shortcuts to Learn / Practice / Exam.
- Honest data only: until step 4 exists, show accuracy from real answers and label it
  "accuracy", never "mastery". Unseen rhythms read "not tried yet", not 0%.
- Campus preview slot appears only when the campus exists.

## 3d. Onboarding
- 6 to 8 swipeable cards using real screenshots of this app: purpose, Learn / Practice /
  Exam / Progress, the 5-step method, timed exam and "why not" explanations, Measure and
  Zoom, missed-rhythm review, accuracy now vs mastery later, Add to Home Screen in Safari.
- Skip on every card, Replay from About. iPhone only.
- Credibility, honestly: source-referenced criteria, randomized strips, explanations from
  the strip itself, structured practice. Say clearly: not clinically validated, not
  endorsed, not a copy of any exam, content pending nurse review.
- Replaces the current welcome dialog; keeps its disclaimer.

## What this phase will NOT do
- Adaptive learning, campus, video (later steps above).
- Any framework, build step or web font (system fonts stay; SF Pro on iPhone).
- HMH logos or branding.

## Status
Spec written 2026-11-19. Not started.
