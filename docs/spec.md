# Spec: look and feel

Inspiration: a bedside cardiac monitor at night. Black screen, glowing trace, bright
numbers, nothing else competing. Calm until something is wrong.

## Colors (CSS variables on `:root`)

| Variable | Value | Use |
|---|---|---|
| `--bg` | `#07090a` | page background, near black |
| `--surface` | `#11161a` | cards, panels |
| `--surface-2` | `#1a2127` | pressed buttons, inputs |
| `--surface-3` | `#222b32` | selected segment, ring track |
| `--line-soft` | `#1b2329` | card borders, dividers inside cards |
| `--line` | `#26313a` | borders, dividers |
| `--text` | `#d7e0e5` | main text (not pure white, less glare) |
| `--muted` | `#8f9eaa` | secondary text (5.2:1 or better on every surface) |
| `--trace` | `#3cf08c` | EKG line, HR numbers (monitor green) |
| `--grid-major` | `#3a1c22` | 5 mm grid lines (dim red, like strip paper in the dark) |
| `--grid-minor` | `#21121a` | 1 mm grid lines |
| `--spo2` | `#4cc9f0` | SpO2 in scenarios (monitor cyan) |
| `--bp` | `#f2f2f2` | BP in scenarios |
| `--ok` | `#3cf08c` | correct answer |
| `--warn` | `#ffc53d` | warning, "not yet reviewed" tag |
| `--danger` | `#ff5a69` | wrong answer, lethal rhythm |
| `--accent` | `#7cc4ff` | links, focus ring, selected state |
| `--trace-dim` / `--accent-dim` | 12 to 14% tints | icon chips, active tab pill, toggles |

Never use color alone: correct / wrong also get an icon and a word. Text contrast at
least 4.5:1 on its background.

Dark only in v1. A light "paper" theme (pink grid on white, for printing) is a maybe for
phase 7.

## Type
- System fonts only (offline, no downloads): `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Numbers on strips and vitals: `ui-monospace, "SF Mono", Menlo, Consolas, monospace`,
  with `font-variant-numeric: tabular-nums`.
- Scale (`--fs-*`): xs 12, sm 14, base 17 (body, buttons), md 19 (verdict, group names),
  lg 22 (screen titles), xl 28 (hero, intro titles), 2xl 34, display 48 (exam score).
  Line height 1.45 for text, 1.2 for headings. SF Pro on iPhone via `system-ui`.

## Tokens (step 2b)
- Space, 4 px grid: `--sp-1` 4, `--sp-2` 8, `--sp-3` 12, `--sp-4` 16, `--sp-5` 20, `--sp-6` 24, `--sp-8` 32.
- Radius: `--r-sm` 10, `--r-md` 14 (buttons, choices), `--r-lg` 20 (cards), `--r-xl` 28 (sheets), `--r-pill`.
- Elevation: `--hairline` (1 px top highlight), `--elev-1` (cards), `--elev-2` (sheets, intro
  screenshots), `--glow-trace` (primary button only).
- Motion: `--dur-1` 120 ms (press), `--dur-2` 200 ms (color, tab pill), `--dur-3` 320 ms
  (view and feedback entrance), `--dur-4` 700 ms (bars); rings fill in 900 ms.
  Easing `--ease-out` cubic-bezier(.2,.8,.2,1); `--ease-spring` cubic-bezier(.34,1.4,.64,1) for
  the tab icon press.

## Icons
- One inline SVG sprite in `index.html` (`<symbol id="i-…">`), 24 px grid, 1.75 stroke,
  round caps and joins, `currentColor`. No icon libraries, no emoji. Use
  `<svg class="ic"><use href="#i-name"/></svg>`; decorative icons are `aria-hidden`, icon-only
  buttons carry `aria-label`.
- Set: home, learn, practice, exam, progress, sinus, atrial, junctional, ventricular, blocks,
  measure, zoom, expand, timer, review, mastery, achievement, lethal, sources, about,
  settings, monitor, campus, check, x, chevron, play, share, addhome, more.
- Group icons are tiny waveforms (sinus P-QRS-T, flutter sawtooth, junctional inverted P,
  wide ventricular complex, P waves with a dropped beat).

## Strip
- Real scale: 25 mm/s, 10 mm/mV. 1 small box = 0.04 s, 1 big box = 0.20 s.
- Default view: 6-second lead II strip, full phone width, about 180 px tall.
- Trace 2 px, `--trace`, slight glow (shadow blur 4 px) only on the live sweep.
- Live mode: sweep left to right with a small erase gap, like a monitor.
- Calipers: two draggable vertical lines with the gap shown in seconds and small boxes.
- HR readout top right in `--trace`, monospace. Hidden during quizzes.

## Layout
- One column, 16 px side padding, max width 560 px centered on bigger screens.
- Bottom tab bar (thumb reach): Home, Learn, Practice, Exam, Progress. 60 px tall plus the
  safe area; the active tab gets a green pill behind its icon.
- Answer buttons: full width, at least 48 px tall, 10 px gap, big enough for gloves.
- Feedback slides up from the bottom: verdict, the rhythm's 5 criteria, why the other
  choices were wrong, source tag.
- No horizontal scroll at 360 px. Respect the iPhone safe areas.

## Motion
- Short and quiet. View change: 320 ms fade and 8 px rise. Correct answer: one green pulse
  ring. Wrong answer: a 380 ms shake. Press: scale to 0.97. Progress rings and bars fill once.
  No confetti, no streak pressure.
- `prefers-reduced-motion` turns every animation and transition off; live sweeps (Home
  header, Monitor view) become static strips.

## Sound
- Off by default. Optional soft beep per QRS in live mode, phase 7.

## App icon (step 2b)
Drawn in code by `tools/make-icons.js` (one SVG master, PNGs rendered with the local
Chromium): near-black with a faint vignette, dark red 1 mm / 5 mm grid, one luminous
monitor-green lead II P-QRS-T with textbook proportions (1 unit = 1 ms: P 108, PR 164,
QRS 84, QT 380), soft glow and a pale hot core. No text, no hearts, no branding.
Files in `icons/`: `icon.svg`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`,
`icon-maskable.svg` / `icon-maskable-512.png` (complex scaled to 74% so it sits inside the
80% safe circle, baseline still runs edge to edge), `favicon.svg` (rounded, thicker
stroke) and `favicon-32.png`. Re-run the script after any change.

## Old icon prompt for ChatGPT (superseded by the coded icon, kept for reference)
"App icon, 1024x1024, flat and minimal. Near-black background (#07090a). A single glowing
monitor-green (#3cf08c) EKG heartbeat line running across the middle, one clean P-QRS-T
complex, with a soft glow. A faint dark red grid behind it. No text, no hearts, no
stethoscopes, no gradients except the glow. Must read clearly at 60x60 px. Rounded-square
safe area."
