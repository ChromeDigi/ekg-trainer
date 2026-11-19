// Dev-only: writes the app icon SVGs and renders the PNGs with the local Chromium.
// Run: node tools/make-icons.js   (needs Playwright; not shipped, not loaded by the app)
// One source of truth for the waveform: 1 unit = 1 ms at 25 mm/s, so the complex has
// textbook proportions (P 108 ms, PR 164 ms, QRS 84 ms, QT 380 ms). Lead II shape.
"use strict";
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "icons");

const BG = "#07090a", TRACE = "#3cf08c", CORE = "#d6ffe9";
const MINOR = "#24121a", MAJOR = "#4a1d27";
const B = 640; // baseline y
// Real P-QRS-T: rounded P, small q, tall R, s below baseline, short ST, asymmetric T.
const TRACE_D = [
  "M -900 " + B, "H 236",
  "C 254 " + B + " 262 " + (B - 50) + " 290 " + (B - 50), "C 318 " + (B - 50) + " 326 " + B + " 344 " + B, // P
  "H 400", "L 414 " + (B + 26), "L 447 " + (B - 418), "L 471 " + (B + 64), "L 484 " + B,              // QRS
  "H 586", "C 628 " + B + " 652 " + (B - 92) + " 698 " + (B - 92), "C 738 " + (B - 92) + " 754 " + B + " 782 " + B, // T
  "H 1924"
].join(" ");

function grid(minor) {
  let d1 = "", d2 = "";
  for (let v = 32; v < 1024; v += 32) {
    const major = (v - 32) % 160 === 0;
    const seg = "M" + v + " 0V1024M0 " + v + "H1024";
    if (major) d2 += seg; else d1 += seg;
  }
  return (minor ? '<path d="' + d1 + '" stroke="' + MINOR + '" stroke-width="3"/>' : "") +
    '<path d="' + d2 + '" stroke="' + MAJOR + '" stroke-width="' + (minor ? 5 : 10) + '"/>';
}

// scale: shrink the trace toward the center (maskable safe zone). minor: draw 1 mm lines.
function icon(opts) {
  const s = opts.scale || 1, w = opts.stroke || 30;
  const tf = 'transform="translate(512 512) scale(' + s + ') translate(-512 -512)"';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">' +
    "<defs>" +
    '<radialGradient id="v" cx="50%" cy="46%" r="70%"><stop offset="0" stop-color="#0d1513"/><stop offset="1" stop-color="' + BG + '"/></radialGradient>' +
    '<filter id="g1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="' + (opts.blur || 22) + '"/></filter>' +
    '<filter id="g2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="' + (opts.blur || 22) * 2.6 + '"/></filter>' +
    "</defs>" +
    (opts.round ? '<clipPath id="c"><rect width="1024" height="1024" rx="' + opts.round + '"/></clipPath><g clip-path="url(#c)">' : "<g>") +
    '<rect width="1024" height="1024" fill="url(#v)"/>' +
    '<g fill="none" opacity="' + (opts.gridOpacity || 1) + '">' + grid(opts.minor !== false) + "</g>" +
    '<g fill="none" stroke-linecap="round" stroke-linejoin="round" ' + tf + ">" +
    '<path d="' + TRACE_D + '" stroke="' + TRACE + '" stroke-width="' + w * 3.2 + '" opacity="0.22" filter="url(#g2)"/>' +
    '<path d="' + TRACE_D + '" stroke="' + TRACE + '" stroke-width="' + w * 1.6 + '" opacity="0.55" filter="url(#g1)"/>' +
    '<path d="' + TRACE_D + '" stroke="' + TRACE + '" stroke-width="' + w + '"/>' +
    '<path d="' + TRACE_D + '" stroke="' + CORE + '" stroke-width="' + w * 0.28 + '" opacity="0.85"/>' +
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
