# Spec: look and feel

Inspiration: a bedside cardiac monitor at night. Black screen, glowing trace, bright
numbers, nothing else competing. Calm until something is wrong.

## Colors (CSS variables on `:root`)

| Variable | Value | Use |
|---|---|---|
| `--bg` | `#07090a` | page background, near black |
| `--surface` | `#11161a` | cards, panels |
| `--surface-2` | `#1a2127` | pressed buttons, inputs |
| `--line` | `#26313a` | borders, dividers |
| `--text` | `#d7e0e5` | main text (not pure white, less glare) |
| `--muted` | `#8796a1` | secondary text |
| `--trace` | `#3cf08c` | EKG line, HR numbers (monitor green) |
| `--grid-major` | `#3a1c22` | 5 mm grid lines (dim red, like strip paper in the dark) |
| `--grid-minor` | `#21121a` | 1 mm grid lines |
| `--spo2` | `#4cc9f0` | SpO2 in scenarios (monitor cyan) |
| `--bp` | `#f2f2f2` | BP in scenarios |
| `--ok` | `#3cf08c` | correct answer |
| `--warn` | `#ffc53d` | warning, "not yet reviewed" tag |
| `--danger` | `#ff4d5e` | wrong answer, lethal rhythm |
| `--accent` | `#7cc4ff` | links, focus ring, selected state |

Never use color alone: correct / wrong also get an icon and a word. Text contrast at
least 4.5:1 on its background.

Dark only in v1. A light "paper" theme (pink grid on white, for printing) is a maybe for
phase 7.

## Type
- System fonts only (offline, no downloads): `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Numbers on strips and vitals: `ui-monospace, "SF Mono", Menlo, Consolas, monospace`,
  with `font-variant-numeric: tabular-nums`.
- Sizes: body 17 px, small 14 px, button 17 px semibold, screen title 22 px semibold,
  big vitals 40 px. Line height 1.45 for text.

## Strip
- Real scale: 25 mm/s, 10 mm/mV. 1 small box = 0.04 s, 1 big box = 0.20 s.
- Default view: 6-second lead II strip, full phone width, about 180 px tall.
- Trace 2 px, `--trace`, slight glow (shadow blur 4 px) only on the live sweep.
- Live mode: sweep left to right with a small erase gap, like a monitor.
- Calipers: two draggable vertical lines with the gap shown in seconds and small boxes.
- HR readout top right in `--trace`, monospace. Hidden during quizzes.

## Layout
- One column, 16 px side padding, max width 560 px centered on bigger screens.
- Bottom tab bar (thumb reach): Learn, Drill, Exam, Progress. 56 px tall.
- Answer buttons: full width, at least 48 px tall, 10 px gap, big enough for gloves.
- Feedback slides up from the bottom: verdict, the rhythm's 5 criteria, why the other
  choices were wrong, source tag.
- No horizontal scroll at 360 px. Respect the iPhone safe areas.

## Motion
- Short and quiet: 150 to 200 ms fades and slides. No confetti.
- Respect `prefers-reduced-motion` (live sweep becomes a static strip).

## Sound
- Off by default. Optional soft beep per QRS in live mode, phase 7.

## Icon prompt for ChatGPT (phase 7)
"App icon, 1024x1024, flat and minimal. Near-black background (#07090a). A single glowing
monitor-green (#3cf08c) EKG heartbeat line running across the middle, one clean P-QRS-T
complex, with a soft glow. A faint dark red grid behind it. No text, no hearts, no
stethoscopes, no gradients except the glow. Must read clearly at 60x60 px. Rounded-square
safe area."
