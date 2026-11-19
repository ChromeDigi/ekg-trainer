/* Draws strips on <canvas>: ECG paper grid (25 mm/s, 10 mm/mV), 1 mV calibration
   pulse, 1-second time marks, the trace, calipers, and a live monitor sweep. */
(function (root) {
  "use strict";
  const SPEED = 25;        // mm per second
  const GAIN = 10;         // mm per mV
  const LEAD = 0.4;        // seconds of paper before the trace (calibration pulse)
  const HEIGHT_MM = 40;    // 4 mV tall
  const LABEL_PX = 18;     // room for time labels under the grid

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // Usable width inside the wrapper (clientWidth includes padding).
  function innerWidth(box) {
    const cs = getComputedStyle(box);
    return Math.max(280, Math.floor(box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)));
  }

  function setup(canvas, cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, dpr: dpr };
  }

  function grid(ctx, w, h, pxmm, dpr) {
    ctx.fillStyle = css("--strip-bg");
    ctx.fillRect(0, 0, w, h);
    const lines = function (step, color, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let x = 0; x <= w + 0.5; x += step) { const X = Math.round(x * dpr) / dpr + 0.5 / dpr; ctx.moveTo(X, 0); ctx.lineTo(X, h); }
      for (let y = 0; y <= h + 0.5; y += step) { const Y = Math.round(y * dpr) / dpr + 0.5 / dpr; ctx.moveTo(0, Y); ctx.lineTo(w, Y); }
      ctx.stroke();
    };
    lines(pxmm, css("--strip-minor"), 1 / dpr);
    lines(pxmm * 5, css("--strip-major"), Math.max(1, 1.5 / dpr * 1.5));
  }

  // Vertical placement: center the strip's range in the 4 mV window.
  function topMv(samples) {
    let lo = Infinity, hi = -Infinity;
    for (const v of samples) { if (v < lo) lo = v; if (v > hi) hi = v; }
    return (hi + lo) / 2 + HEIGHT_MM / GAIN / 2;
  }

  function draw(canvas, strip, opts) {
    opts = opts || {};
    const zoom = opts.zoom || 1;
    const box = canvas.parentElement;
    const cssW = innerWidth(box) * zoom;
    const paperS = strip.seconds + LEAD;
    const pxmm = cssW / (paperS * SPEED);
    const gridH = HEIGHT_MM * pxmm;
    const cssH = Math.round(gridH + LABEL_PX);
    const s = setup(canvas, cssW, cssH);
    const ctx = s.ctx;
    grid(ctx, cssW, gridH, pxmm, s.dpr);

    const top = topMv(strip.samples);
    const y = function (mv) { return (top - mv) * GAIN * pxmm; };
    const x = function (sec) { return (LEAD + sec) * SPEED * pxmm; };

    // Calibration pulse: 1 mV tall, 0.2 s wide.
    ctx.strokeStyle = css("--strip-trace");
    ctx.lineWidth = Math.max(1.5, 2 * Math.min(1, pxmm / 2.2));
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x(-LEAD), y(0));
    ctx.lineTo(x(-0.32), y(0)); ctx.lineTo(x(-0.32), y(1));
    ctx.lineTo(x(-0.12), y(1)); ctx.lineTo(x(-0.12), y(0));
    ctx.lineTo(x(0), y(0));
    ctx.stroke();

    // Trace
    ctx.beginPath();
    const n = strip.samples.length;
    for (let i = 0; i < n; i++) {
      const X = x(i / strip.fs), Y = y(strip.samples[i]);
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.stroke();

    // Time marks every second (ticks at top, labels underneath).
    ctx.fillStyle = css("--strip-label");
    ctx.strokeStyle = css("--strip-label");
    ctx.lineWidth = 1;
    ctx.font = "12px " + css("--font-mono");
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let sec = 0; sec <= strip.seconds; sec++) {
      const X = x(sec);
      ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, 3 * pxmm); ctx.stroke();
      ctx.textAlign = sec === 0 ? "left" : sec === strip.seconds ? "right" : "center";
      ctx.fillText(sec + "s", sec === strip.seconds ? Math.min(X, cssW) : X, gridH + 4);
    }

    // Calipers
    const cal = canvas._cal;
    if (cal && cal.on) {
      ctx.strokeStyle = css("--strip-cal");
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      [cal.a, cal.b].forEach(function (t) {
        if (t == null) return;
        ctx.beginPath(); ctx.moveTo(x(t), 0); ctx.lineTo(x(t), gridH); ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    canvas._geo = { pxmm: pxmm, seconds: strip.seconds, redraw: function () { draw(canvas, strip, opts); } };
  }

  // Calipers: tap to drop two lines, drag to adjust, tap again to move the nearest one.
  // onChange receives { a, b } in seconds (b may be null).
  function calipers(canvas, onChange) {
    canvas._cal = { on: false, a: null, b: null, active: null };
    const secAt = function (ev) {
      const g = canvas._geo;
      const rect = canvas.getBoundingClientRect();
      const px = ev.clientX - rect.left;
      return Math.max(0, Math.min(g.seconds, px / (SPEED * g.pxmm) - LEAD));
    };
    const update = function () { canvas._geo.redraw(); onChange(canvas._cal); };
    canvas.addEventListener("pointerdown", function (ev) {
      const c = canvas._cal;
      if (!c.on || !canvas._geo) return;
      ev.preventDefault();
      const t = secAt(ev);
      if (c.a == null) { c.a = t; c.active = "a"; }
      else if (c.b == null) { c.b = t; c.active = "b"; }
      else { c.active = Math.abs(t - c.a) < Math.abs(t - c.b) ? "a" : "b"; c[c.active] = t; }
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      update();
    });
    canvas.addEventListener("pointermove", function (ev) {
      const c = canvas._cal;
      if (!c.on || !c.active || !(ev.buttons & 1 || ev.pointerType === "touch")) return;
      c[c.active] = secAt(ev);
      update();
    });
    const end = function () { canvas._cal.active = null; };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    return {
      set: function (on) { const c = canvas._cal; c.on = on; c.a = c.b = null; c.active = null; canvas.classList.toggle("measuring", on); if (canvas._geo) update(); },
      clear: function () { const c = canvas._cal; c.a = c.b = null; if (canvas._geo) update(); }
    };
  }

  // Live monitor: black screen, sweeping trace with an erase gap. Returns stop().
  function live(canvas, strip) {
    const box = canvas.parentElement;
    const cssW = innerWidth(box);
    const win = 6;                                  // seconds across the screen
    const pxmm = cssW / (win * SPEED);
    const cssH = Math.round(HEIGHT_MM * pxmm + LABEL_PX);
    const s = setup(canvas, cssW, cssH);
    const ctx = s.ctx;
    const bg = css("--mon-bg"), trace = css("--mon-trace");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cssW, cssH);
    const top = topMv(strip.samples);
    const y = function (mv) { return (top - mv) * GAIN * pxmm + LABEL_PX / 2; };
    const fs = strip.fs, total = strip.samples.length;
    const pxPerSec = cssW / win;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      ctx.strokeStyle = trace; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let i = 0; i < win * fs; i++) { const X = (i / fs) * pxPerSec; if (i) ctx.lineTo(X, y(strip.samples[i])); else ctx.moveTo(X, y(strip.samples[i])); }
      ctx.stroke();
      return function () {};
    }

    let raf = 0, startT = null, lastIdx = 0;
    function frame(now) {
      if (startT == null) startT = now;
      const elapsed = (now - startT) / 1000;
      const idx = Math.floor(elapsed * fs);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = trace;
      ctx.shadowColor = trace;
      ctx.shadowBlur = 4;
      for (let i = lastIdx; i < idx; i++) {
        const si = i % total, sj = (i + 1) % total;
        const t1 = (i / fs) % win, t2 = ((i + 1) / fs) % win;
        if (t2 < t1) continue; // wrapped to the left edge
        const X1 = t1 * pxPerSec, X2 = t2 * pxPerSec;
        // erase gap ahead of the pen
        ctx.shadowBlur = 0;
        ctx.fillStyle = bg;
        ctx.fillRect(X2, 0, 0.25 * pxPerSec, cssH);
        ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.moveTo(X1, y(strip.samples[si])); ctx.lineTo(X2, y(strip.samples[sj])); ctx.stroke();
      }
      lastIdx = idx;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return function () { cancelAnimationFrame(raf); };
  }

  root.EKG = root.EKG || {};
  root.EKG.strip = { draw: draw, calipers: calipers, live: live, SPEED: SPEED };
})(typeof window !== "undefined" ? window : globalThis);
