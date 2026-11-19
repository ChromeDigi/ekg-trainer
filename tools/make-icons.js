// Dev-only: writes the app icon SVGs and renders the PNGs with the local Chromium.
// Run: node tools/make-icons.js   (needs Playwright; not shipped, not loaded by the app)
// One source of truth for the waveform: 1 unit = 1 ms at 25 mm/s, so the complex has
// textbook proportions (P 108 ms, PR 164 ms, QRS 84 ms, QT 380 ms). Lead II shape.
"use strict";
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "icons");

// Identity (step 2b, revised): blue-to-teal tile, faint white grid, white trace with a
// cool glow, and an orange "pen" dot where the monitor sweep is writing. Right of the
// erase gap, the previous sweep shows dimmed, so the line still runs edge to edge.
const TOP = "#0b5cb5", BOTTOM = "#078a92", TRACE = "#ffffff", GLOW = "#8ff7ef", PEN = "#ff8a3d";
const B = 640; // baseline y
const HEAD = 842, GAP = 70; // pen position and erase gap (x, in ms units)
// Real P-QRS-T: rounded P, small q, tall R, s below baseline, short ST, asymmetric T.
function complex(dx) {
  const X = function (x) { return x + dx; };
  return [
    "C " + X(254) + " " + B + " " + X(262) + " " + (B - 50) + " " + X(290) + " " + (B - 50), "C " + X(318) + " " + (B - 50) + " " + X(326) + " " + B + " " + X(344) + " " + B, // P
    "H " + X(400), "L " + X(414) + " " + (B + 26), "L " + X(447) + " " + (B - 418), "L " + X(471) + " " + (B + 64), "L " + X(484) + " " + B, // QRS
    "H " + X(586), "C " + X(628) + " " + B + " " + X(652) + " " + (B - 92) + " " + X(698) + " " + (B - 92), "C " + X(738) + " " + (B - 92) + " " + X(754) + " " + B + " " + X(782) + " " + B // T
  ].join(" ");
}
const LIVE_D = "M -900 " + B + " H " + (236 - 1000) + " " + complex(-1000) + " H 236 " + complex(0) + " H " + HEAD;
const OLD_D = "M " + (HEAD + GAP) + " " + B + " H " + (236 + 1000) + " " + complex(1000) + " H 2400";

function grid(minor) {
  let d1 = "", d2 = "";
  for (let v = 32; v < 1024; v += 32) {
    const major = (v - 32) % 160 === 0;
    const seg = "M" + v + " 0V1024M0 " + v + "H1024";
    if (major) d2 += seg; else d1 += seg;
  }
  return (minor ? '<path d="' + d1 + '" stroke="#ffffff" stroke-opacity="0.06" stroke-width="3"/>' : "") +
    '<path d="' + d2 + '" stroke="#ffffff" stroke-opacity="' + (minor ? 0.12 : 0.14) + '" stroke-width="' + (minor ? 4 : 10) + '"/>';
}

// scale: shrink the trace toward the center (maskable safe zone). minor: draw 1 mm lines.
function icon(opts) {
  const s = opts.scale || 1, w = opts.stroke || 30, bl = opts.blur || 22;
  const tf = 'transform="translate(512 512) scale(' + s + ') translate(-512 -512)"';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">' +
    "<defs>" +
    '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + TOP + '"/><stop offset="1" stop-color="' + BOTTOM + '"/></linearGradient>' +
    '<radialGradient id="hl" cx="30%" cy="18%" r="75%"><stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="vg" cx="50%" cy="50%" r="72%"><stop offset="0.6" stop-color="#021a33" stop-opacity="0"/><stop offset="1" stop-color="#021a33" stop-opacity="0.35"/></radialGradient>' +
    '<filter id="g1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="' + bl + '"/></filter>' +
    '<filter id="g2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="' + bl * 2.4 + '"/></filter>' +
    "</defs>" +
    (opts.round ? '<clipPath id="c"><rect width="1024" height="1024" rx="' + opts.round + '"/></clipPath><g clip-path="url(#c)">' : "<g>") +
    '<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#hl)"/>' +
    '<g fill="none">' + grid(opts.minor !== false) + "</g>" +
    '<rect width="1024" height="1024" fill="url(#vg)"/>' +
    '<g fill="none" stroke-linecap="round" stroke-linejoin="round" ' + tf + ">" +
    '<path d="' + OLD_D + '" stroke="' + TRACE + '" stroke-width="' + w * 0.8 + '" opacity="0.28"/>' +
    '<path d="' + LIVE_D + '" stroke="' + GLOW + '" stroke-width="' + w * 3 + '" opacity="0.35" filter="url(#g2)"/>' +
    '<path d="' + LIVE_D + '" stroke="' + GLOW + '" stroke-width="' + w * 1.5 + '" opacity="0.6" filter="url(#g1)"/>' +
    '<path d="' + LIVE_D + '" stroke="' + TRACE + '" stroke-width="' + w + '"/>' +
    '<circle cx="' + HEAD + '" cy="' + B + '" r="' + w * 2.2 + '" fill="' + PEN + '" opacity="0.45" filter="url(#g1)"/>' +
    '<circle cx="' + HEAD + '" cy="' + B + '" r="' + w * 0.95 + '" fill="' + PEN + '"/>' +
    "</g></g></svg>";
}

const files = {
  "icon.svg": icon({}),
  "icon-maskable.svg": icon({ scale: 0.74 }),
  "favicon.svg": icon({ round: 224, minor: false, stroke: 64, blur: 18, scale: 1.04 })
};
Object.keys(files).forEach(function (f) { fs.writeFileSync(path.join(OUT, f), files[f] + "\n"); });

const renders = [
  ["icon.svg", "apple-touch-icon.png", 180],
  ["icon.svg", "icon-192.png", 192],
  ["icon.svg", "icon-512.png", 512],
  ["icon-maskable.svg", "icon-maskable-512.png", 512],
  ["favicon.svg", "favicon-32.png", 32]
];
(async function () {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const r of renders) {
    const svg = fs.readFileSync(path.join(OUT, r[0]), "utf8");
    await page.setViewportSize({ width: r[2], height: r[2] });
    await page.setContent('<html><body style="margin:0;background:transparent">' +
      svg.replace("<svg ", '<svg width="' + r[2] + '" height="' + r[2] + '" ') + "</body></html>");
    await page.screenshot({ path: path.join(OUT, r[1]), omitBackground: r[1].startsWith("favicon") });
    console.log("wrote icons/" + r[1]);
  }
  await browser.close();
})();
