/* UI: tabs, Learn, Practice, Exam, Progress. All user-visible text set via textContent. */
(function () {
  "use strict";
  const { rhythms, ecg, quiz, strip: S, progress } = window.EKG;
  const ALL = rhythms.list.map(function (r) { return r.id; });

  // ---------- helpers ----------
  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.append(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function secs(ms) { return (ms / 1000).toFixed(1) + " s"; }
  function name(id) { return rhythms.byId[id].name; }
  function seg(options, value, onPick, label) {
    const box = h("div", { class: "seg", role: "group", "aria-label": label });
    options.forEach(function (o) {
      box.append(h("button", {
        type: "button", "aria-pressed": String(o.value === value), text: o.label,
        onclick: function () {
          box.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
          this.setAttribute("aria-pressed", "true");
          onPick(o.value);
        }
      }));
    });
    return box;
  }
  function toggleBtn(label, on, onChange) {
    const b = h("button", { type: "button", class: "btn small toggle", "aria-pressed": String(!!on), text: label });
    b.addEventListener("click", function () {
      const now = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(now));
      onChange(now);
    });
    return b;
  }
  function reviewTag() { return h("span", { class: "tag warn", title: "Not yet checked by a nurse", text: "Pending nurse review" }); }

  // ---------- strip widget ----------
  const widgets = new Set();
  function stripCard(strip, opts) {
    opts = opts || {};
    const canvas = h("canvas", { role: "img", "aria-label": "Rhythm strip, lead II, 6 seconds" });
    const wrap = h("div", { class: "strip-wrap" }, canvas);
    const readout = h("div", { class: "cal-readout", "aria-live": "polite" });
    let zoom = 1;
    readout.hidden = true;
    const cal = S.calipers(canvas, function (c) {
      readout.hidden = !c.on;
      if (!c.on) { readout.textContent = ""; return; }
      if (c.a == null) readout.textContent = "Tap two points to measure.";
      else if (c.b == null) readout.textContent = "Tap a second point.";
      else {
        const d = Math.abs(c.b - c.a);
        readout.textContent = d.toFixed(2) + " s · " + Math.round(d / 0.04) + " small boxes" +
          (d > 0.2 ? " · as R-R: " + Math.round(60 / d) + "/min" : "");
      }
    });
    const tools = opts.tools === false ? null : h("div", { class: "row" },
      toggleBtn("Measure", false, function (on) { cal.set(on); }),
      toggleBtn("Zoom", false, function (on) { zoom = on ? 2 : 1; w.redraw(); })
    );
    const card = h("div", { class: "card flush" },
      wrap,
      h("div", { class: "strip-meta" }, h("span", { class: "caption", text: "II · 25 mm/s · 10 mm/mV" }), tools),
      opts.tools === false ? null : readout
    );
    const w = {
      el: card, canvas: canvas, strip: strip,
      redraw: function () { if (card.isConnected && w.strip) S.draw(canvas, w.strip, { zoom: zoom }); },
      set: function (st) { w.strip = st; cal.clear(); w.redraw(); }
    };
    widgets.add(w);
    requestAnimationFrame(w.redraw);
    return w;
  }
  let resizeT = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      widgets.forEach(function (w) { if (!w.el.isConnected) widgets.delete(w); else w.redraw(); });
    }, 150);
  });

  // ---------- feedback (shared by practice and exam review) ----------
  function feedback(strip, chosen, shown, ms) {
    const R = rhythms.byId[strip.rhythm];
    const right = chosen === strip.rhythm;
    const box = h("div", { class: "card feedback", "aria-live": "polite" });
    box.append(h("div", { class: "verdict " + (right ? "ok" : "no") },
      h("span", { text: right ? "✓ Correct: " + R.name : (chosen ? "✗ It's " + R.name : "✗ Time ran out: " + R.name) }),
      ms != null ? h("span", { class: "time", text: secs(ms) }) : null
    ));
    if (R.lethal) box.append(h("p", { class: "small", style: "margin:6px 0 0" }, h("span", { class: "tag danger", text: "Lethal rhythm" })));

    box.append(h("div", { class: "section-title", text: "This strip" }));
    const dl = h("dl", { class: "findings" });
    quiz.findings(strip).forEach(function (f) { dl.append(h("dt", { text: f[0] }), h("dd", { text: f[1] })); });
    box.append(dl);

    const wrong = (shown || []).filter(function (id) { return id !== strip.rhythm; });
    if (chosen && chosen !== strip.rhythm) {
      wrong.sort(function (a, b) { return (b === chosen) - (a === chosen); });
    }
    if (wrong.length) {
      box.append(h("div", { class: "section-title", text: "Why not" }));
      const ul = h("ul", { class: "whynot" });
      wrong.forEach(function (id) {
        const why = quiz.mismatches(id, strip);
        ul.append(h("li", null, h("strong", { text: rhythms.byId[id].short + (id === chosen ? " (your pick): " : ": ") }), why[0] + (why[1] ? " " + why[1] : "")));
      });
      box.append(ul);
    }
    box.append(h("div", { class: "section-title", text: "Tell it apart" }), h("p", { class: "small", text: R.tellApart }));
    if (R.note) box.append(h("p", { class: "note", text: R.note }));
    box.append(h("div", { class: "row", style: "margin-top:8px" }, reviewTag(),
      R.sources.map(function (sid) {
        const s = rhythms.sources[sid];
        return h("a", { class: "small", href: s.url, target: "_blank", rel: "noopener", text: sid });
      })));
    return box;
  }

  // ---------- tabs ----------
  const views = {};
  ["learn", "practice", "exam", "progress"].forEach(function (v) { views[v] = document.getElementById("view-" + v); });
  let current = "practice", stopLive = null;
  function show(v) {
    if (stopLive) stopLive();
    current = v;
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== v; });
    document.querySelectorAll(".tabs button").forEach(function (b) {
      if (b.dataset.view === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (v === "learn") renderLearn();
    if (v === "practice") { if (!pr.strip) nextPractice(); else renderPracticeHeader(); }
    if (v === "exam" && exam.state === "setup") renderExamSetup();
    if (v === "progress") renderProgress();
    window.scrollTo(0, 0);
    requestAnimationFrame(function () { widgets.forEach(function (w) { w.redraw(); }); });
  }
  document.querySelectorAll(".tabs button").forEach(function (b) {
    b.addEventListener("click", function () { show(b.dataset.view); });
  });

  // ---------- Learn ----------
  function renderLearn() {
    const v = views.learn;
    clear(v);
    const steps = h("ol", { class: "steps" });
    rhythms.approach.forEach(function (s) { steps.append(h("li", null, h("b", { text: s[0] + ". " }), s[1])); });
    v.append(h("div", { class: "card" }, h("h2", { text: "Same 5 steps, every strip" }), steps,
      h("p", { class: "small muted", style: "margin:10px 0 0", text: "Paper at 25 mm/s: 1 small box = 0.04 s, 1 big box = 0.20 s, a 6-second strip = 30 big boxes. Height: 10 small boxes = 1 mV (the square calibration pulse at the start)." })));

    rhythms.list.forEach(function (R) {
      const w = stripCard(ecg.generate(R.id), { tools: true });
      let liveOn = false, liveStop = null;
      const liveCanvas = h("canvas", { role: "img", "aria-label": "Live monitor view" });
      const liveWrap = h("div", { class: "strip-wrap", hidden: true }, liveCanvas);
      w.el.insertBefore(liveWrap, w.el.firstChild);
      const paperWrap = w.canvas.parentElement;
      const liveBtn = toggleBtn("Monitor view", false, function (on) {
        if (on) {
          if (stopLive) stopLive();
          liveOn = true;
          liveWrap.hidden = false;
          paperWrap.hidden = true;
          liveStop = S.live(liveCanvas, ecg.generate(R.id, { seconds: 60 }));
          stopLive = function () {
            if (liveStop) liveStop();
            liveStop = null; liveOn = false; stopLive = null;
            liveWrap.hidden = true; paperWrap.hidden = false;
            liveBtn.setAttribute("aria-pressed", "false");
            w.redraw();
          };
        } else if (liveOn && stopLive) stopLive();
      });
      const table = h("table", { class: "criteria" });
      [["Rate", R.teach.rate], ["Regularity", R.teach.regularity], ["P waves", R.teach.p], ["PR", R.teach.pr], ["QRS", R.teach.qrs]]
        .forEach(function (r) { table.append(h("tr", null, h("th", { text: r[0] }), h("td", { text: r[1] }))); });
      const card = h("div", { class: "card" },
        h("div", { class: "row-between" }, h("h2", { text: R.name }), R.lethal ? h("span", { class: "tag danger", text: "Lethal" }) : null),
        h("div", { style: "margin:12px -14px 0" }, w.el),
        h("div", { class: "row", style: "margin-top:10px" },
          h("button", { type: "button", class: "btn small", text: "New example", onclick: function () { if (liveOn && stopLive) stopLive(); w.set(ecg.generate(R.id)); } }),
          liveBtn),
        table,
        h("p", { class: "small", style: "margin:10px 0 0", text: R.tellApart }),
        R.note ? h("p", { class: "note", text: R.note }) : null,
        h("div", { class: "row", style: "margin-top:10px" }, reviewTag()),
        h("ul", { class: "sources" }, R.sources.map(function (sid) {
          const s = rhythms.sources[sid];
          return h("li", null, h("a", { href: s.url, target: "_blank", rel: "noopener", text: s.label }));
        }))
      );
      w.el.style.border = "0"; w.el.style.background = "transparent";
      v.append(card);
    });
  }

  // ---------- Practice ----------
  const pr = { mode: "all", strip: null, shown: [], at: 0, answered: false, n: 0, ok: 0, last: null, widget: null };
  let practiceHeader = null;
  function renderPracticeHeader() {
    if (!practiceHeader) return;
    const n = progress.reviewIds().length;
    const sc = practiceHeader.querySelector(".mono");
    if (sc) sc.textContent = pr.n ? pr.ok + "/" + pr.n : "";
    const btn = practiceHeader.querySelectorAll(".seg button")[1];
    if (btn) btn.textContent = "Missed" + (n ? " (" + n + ")" : "");
  }
  function nextPractice() {
    const v = views.practice;
    clear(v);
    practiceHeader = h("div", { class: "stack" },
      h("div", { class: "row-between" },
        h("h2", { text: "Practice" }),
        h("span", { class: "mono muted small", "aria-label": "Session score" })),
      seg([{ value: "all", label: "All rhythms" }, { value: "review", label: "Missed" }], pr.mode, function (m) { pr.mode = m; pr.last = null; nextPractice(); }, "Practice set")
    );
    v.append(practiceHeader);
    renderPracticeHeader();

    const ids = pr.mode === "review" ? progress.reviewIds() : ALL;
    if (!ids.length) {
      pr.strip = { empty: true };
      v.append(h("div", { class: "card empty" },
        h("div", { class: "big", text: "✓" }),
        h("p", { text: "Nothing to review." }),
        h("p", { class: "small muted", text: "Missed rhythms land here and stay until you get them right twice in a row." }),
        h("button", { type: "button", class: "btn primary", text: "Practice all rhythms", onclick: function () { pr.mode = "all"; nextPractice(); } })));
      return;
    }
    const id = quiz.pickRhythm(progress.weights(ids), Math.random, pr.last);
    pr.last = id;
    pr.strip = ecg.generate(id);
    pr.shown = quiz.choices(id);
    pr.answered = false;
    pr.widget = stripCard(pr.strip);
    v.append(pr.widget.el);
    v.append(h("p", { class: "prompt", text: "What's the rhythm? Take your time." }));
    const box = h("div", { class: "choices" });
    pr.shown.forEach(function (cid, i) {
      box.append(h("button", { type: "button", class: "choice", "data-id": cid, onclick: function () { answerPractice(cid, box); } },
        h("span", { text: name(cid) }), h("span", { class: "mark" })));
    });
    v.append(box);
    pr.at = performance.now();
  }
  function markChoices(box, correct, chosen) {
    box.querySelectorAll(".choice").forEach(function (b) {
      b.disabled = true;
      const id = b.getAttribute("data-id");
      if (id === correct) { b.classList.add("right"); b.querySelector(".mark").textContent = "✓ answer"; }
      else if (id === chosen) { b.classList.add("wrong"); b.querySelector(".mark").textContent = "✗ your pick"; }
    });
  }
  function answerPractice(cid, box) {
    if (pr.answered) return;
    pr.answered = true;
    const ms = performance.now() - pr.at;
    const ok = cid === pr.strip.rhythm;
    progress.record(pr.strip.rhythm, ok, ms, "practice");
    pr.n++; if (ok) pr.ok++;
    renderPracticeHeader();
    markChoices(box, pr.strip.rhythm, cid);
    const fb = feedback(pr.strip, cid, pr.shown, ms);
    views.practice.append(fb);
    views.practice.append(h("button", { type: "button", class: "btn primary block sticky-next", text: "Next strip", onclick: nextPractice }));
    if (!ok) fb.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- Exam ----------
  const exam = { state: "setup" };
  function renderExamSetup() {
    const v = views.exam;
    clear(v);
    const f = progress.prefs();
    const e = Object.assign({}, f.exam);
    const save = function () { f.exam = e; progress.savePrefs(f); };
    const last = progress.stats(ALL).exams[0];
    v.append(h("div", { class: "card stack" },
      h("h2", { text: "Exam simulation" }),
      h("p", { class: "small muted", text: "Timed, no feedback until the end, like a hospital rhythm test. Not a copy of any specific exam." }),
      h("div", { class: "setting" }, h("span", { class: "lbl", text: "Strips" }),
        seg([10, 20, 25].map(function (n) { return { value: n, label: String(n) }; }), e.count, function (x) { e.count = x; save(); }, "Number of strips")),
      h("div", { class: "setting" }, h("span", { class: "lbl", text: "Time per strip" }),
        seg([30, 45, 60].map(function (n) { return { value: n, label: n + " s" }; }), e.seconds, function (x) { e.seconds = x; save(); }, "Time per strip")),
      h("div", { class: "setting" }, h("span", { class: "lbl", text: "Pass mark" }),
        seg([80, 85, 90].map(function (n) { return { value: n, label: n + "%" }; }), e.passMark, function (x) { e.passMark = x; save(); }, "Pass mark")),
      h("div", { class: "setting" }, h("span", { class: "lbl", text: "Lethal rule: must get every lethal rhythm (VT) right to pass" }),
        seg([{ value: true, label: "On" }, { value: false, label: "Off" }], e.lethal, function (x) { e.lethal = x; save(); }, "Lethal rule")),
      h("div", { class: "setting" }, h("span", { class: "lbl", text: "Countdown (the timer still runs when hidden)" }),
        seg([{ value: true, label: "Show" }, { value: false, label: "Hide" }], e.showTimer, function (x) { e.showTimer = x; save(); }, "Show countdown")),
      h("button", { type: "button", class: "btn primary block", text: "Start exam", onclick: function () { startExam(e); } })
    ));
    const tips = h("ol", { class: "steps" });
    ["Breathe out slowly once before the first strip.", "Same order every time: rate, regularity, P, PR, QRS.", "Wide and fast? Say VT to yourself first, then prove it wrong.", "Stuck? Pick your best answer and move on. One strip won't sink you."]
      .forEach(function (t) { tips.append(h("li", { text: t })); });
    v.append(h("div", { class: "card" }, h("h3", { text: "Steady under the clock" }), tips));
    if (last) v.append(h("p", { class: "small muted", text: "Last exam: " + last.pct + "% (" + (last.passed ? "pass" : "not yet") + "), " + new Date(last.at).toLocaleDateString() }));
  }
  function startExam(cfg) {
    Object.assign(exam, { state: "run", cfg: Object.assign({}, cfg), plan: quiz.examPlan(cfg.count), i: 0, results: [], startedAt: Date.now() });
    examQuestion();
  }
  function stopTimer() { if (exam.timer) { clearInterval(exam.timer); exam.timer = 0; } }
  function examQuestion() {
    stopTimer();
    const v = views.exam;
    clear(v);
    const id = exam.plan[exam.i];
    exam.strip = ecg.generate(id);
    exam.shown = quiz.choices(id);
    exam.answered = false;
    const total = exam.cfg.seconds * 1000;
    const bar = h("i");
    const barBox = h("div", { class: "timerbar", hidden: !exam.cfg.showTimer }, bar);
    const left = h("span", { class: "mono small muted", hidden: !exam.cfg.showTimer });
    v.append(h("div", { class: "row-between" },
      h("h2", { text: "Strip " + (exam.i + 1) + " of " + exam.plan.length }),
      h("div", { class: "row" }, left,
        h("button", { type: "button", class: "btn small ghost", text: "Quit", onclick: function () {
          if (confirm("Quit this exam? It won't be scored.")) { stopTimer(); exam.state = "setup"; renderExamSetup(); }
        } }))));
    v.append(barBox);
    v.append(stripCard(exam.strip).el);
    const box = h("div", { class: "choices" });
    exam.shown.forEach(function (cid) {
      box.append(h("button", { type: "button", class: "choice", "data-id": cid, onclick: function () { answerExam(cid); } },
        h("span", { text: name(cid) }), h("span", { class: "mark" })));
    });
    v.append(box);
    window.scrollTo(0, 0);
    exam.qAt = performance.now();
    const tick = function () {
      const rem = Math.max(0, total - (performance.now() - exam.qAt));
      bar.style.transform = "scaleX(" + (rem / total) + ")";
      barBox.classList.toggle("low", rem < 10000);
      left.textContent = Math.ceil(rem / 1000) + " s";
      if (rem <= 0) answerExam(null);
    };
    tick();
    exam.timer = setInterval(tick, 100);
  }
  function answerExam(cid) {
    if (exam.answered || exam.state !== "run") return;
    exam.answered = true;
    stopTimer();
    const ms = Math.min(performance.now() - exam.qAt, exam.cfg.seconds * 1000);
    const ok = cid === exam.strip.rhythm;
    exam.results.push({ rhythm: exam.strip.rhythm, chosen: cid, ok: ok, ms: ms, strip: exam.strip, shown: exam.shown });
    progress.record(exam.strip.rhythm, ok, ms, "exam");
    exam.i++;
    if (exam.i < exam.plan.length) setTimeout(examQuestion, 120);
    else finishExam();
  }
  function finishExam() {
    exam.state = "done";
    const c = exam.cfg;
    const sc = quiz.scoreExam(exam.results, c.passMark, c.lethal);
    const avg = exam.results.reduce(function (s, r) { return s + r.ms; }, 0) / exam.results.length;
    progress.addSession({ mode: "exam", total: sc.total, correct: sc.correct, pct: sc.pct, passed: sc.passed,
      passMark: c.passMark, lethal: c.lethal, seconds: c.seconds, avgMs: Math.round(avg) });
    const v = views.exam;
    clear(v);
    const reasons = [];
    if (!sc.passScore) reasons.push("Score is under the " + c.passMark + "% pass mark.");
    if (!sc.passLethal) reasons.push("Missed " + sc.lethalMissed + " of " + sc.lethalTotal + " lethal strips (lethal rule).");
    v.append(h("div", { class: "card stack" },
      h("div", { class: "row-between" },
        h("div", null, h("div", { class: "score-big", text: sc.pct + "%" }), h("div", { class: "small muted", text: sc.correct + " of " + sc.total + " · avg " + secs(avg) + " per strip" })),
        h("span", { class: "tag " + (sc.passed ? "accent" : "warn"), text: sc.passed ? "Pass" : "Not yet" })),
      reasons.length ? h("ul", { class: "whynot" }, reasons.map(function (r) { return h("li", { text: r }); })) : h("p", { class: "small", text: "Pass mark " + c.passMark + "%" + (c.lethal ? ", every lethal strip correct." : ".") }),
      h("div", { class: "row" },
        h("button", { type: "button", class: "btn primary", text: "New exam", onclick: function () { exam.state = "setup"; renderExamSetup(); } }),
        progress.reviewIds().length ? h("button", { type: "button", class: "btn", text: "Practice my misses", onclick: function () { pr.mode = "review"; pr.strip = null; show("practice"); } }) : null)
    ));
    const list = h("div", { class: "card" }, h("h3", { text: "Every strip" }));
    exam.results.forEach(function (r, i) {
      const d = h("details", { class: "result-item" });
      d.append(h("summary", null,
        h("span", { text: (i + 1) + ". " + (r.ok ? name(r.rhythm) : "Answer: " + rhythms.byId[r.rhythm].short + " · you: " + (r.chosen ? rhythms.byId[r.chosen].short : "no answer")) }),
        h("span", { class: "tag " + (r.ok ? "accent" : "danger"), text: r.ok ? "✓" : "✗" })));
      let built = false;
      d.addEventListener("toggle", function () {
        if (!d.open || built) return;
        built = true;
        const w = stripCard(r.strip);
        d.append(h("div", { style: "margin:8px -14px 10px" }, w.el), feedback(r.strip, r.chosen, r.shown, r.ms));
        requestAnimationFrame(w.redraw);
      });
      list.append(d);
    });
    v.append(list);
    window.scrollTo(0, 0);
  }

  // ---------- Progress ----------
  function renderProgress() {
    const v = views.progress;
    clear(v);
    const st = progress.stats(ALL);
    const fmt = function (x) { return x == null ? "–" : x + "%"; };
    v.append(h("h2", { text: "Progress" }));
    if (!st.total) {
      v.append(h("div", { class: "card empty" }, h("p", { text: "No answers yet." }), h("p", { class: "small muted", text: "Practice or take an exam and your accuracy and speed show up here." })));
      return;
    }
    const tile = function (k, val, s) { return h("div", { class: "tile" }, h("div", { class: "k", text: k }), h("div", { class: "v", text: val }), h("div", { class: "s", text: s })); };
    v.append(h("div", { class: "tiles" },
      tile("All time", fmt(st.overall), st.total + " strips"),
      tile("Last 7 days", fmt(st.week), st.weekCount + " strips"),
      tile("Before that", fmt(st.before), st.beforeCount + " strips"),
      tile("Avg time, correct", st.weekAvgMs ? secs(st.weekAvgMs) : "–", "last 7 days")));
    const t = h("table", { class: "table" },
      h("tr", null, h("th", { text: "Rhythm" }), h("th", { class: "num", text: "Last 20" }), h("th", { class: "num", text: "Speed" }), h("th", { class: "num", text: "Seen" })));
    st.per.forEach(function (p) {
      t.append(h("tr", null,
        h("td", null, rhythms.byId[p.id].short, p.inReview ? h("span", { class: "tag warn", style: "margin-left:6px", text: "review" }) : null),
        h("td", { class: "num", text: fmt(p.pct) }),
        h("td", { class: "num", text: p.avgMs ? secs(p.avgMs) : "–" }),
        h("td", { class: "num", text: String(p.attempts) })));
    });
    v.append(h("div", { class: "card" }, h("h3", { style: "margin-bottom:10px", text: "By rhythm" }), t,
      h("p", { class: "small muted", style: "margin:10px 0 0", text: "Speed = average time on correct answers. Missed rhythms show more often in Practice." })));
    if (st.exams.length) {
      const et = h("table", { class: "table" }, h("tr", null, h("th", { text: "Exam" }), h("th", { class: "num", text: "Score" }), h("th", { class: "num", text: "Result" })));
      st.exams.forEach(function (e) {
        et.append(h("tr", null,
          h("td", { text: new Date(e.at).toLocaleDateString() + " · " + e.total + " strips" }),
          h("td", { class: "num", text: e.pct + "%" }),
          h("td", { class: "num", text: e.passed ? "Pass" : "Not yet" })));
      });
      v.append(h("div", { class: "card" }, h("h3", { style: "margin-bottom:10px", text: "Recent exams" }), et));
    }
  }

  // ---------- dialogs ----------
  const about = document.getElementById("aboutDlg");
  const srcList = document.getElementById("sourceList");
  Object.keys(rhythms.sources).forEach(function (k) {
    const s = rhythms.sources[k];
    srcList.append(h("li", null, h("span", { class: "muted", text: k + " " }), h("a", { href: s.url, target: "_blank", rel: "noopener", text: s.label })));
  });
  document.getElementById("aboutBtn").addEventListener("click", function () { about.showModal(); });
  about.querySelector("[data-close]").addEventListener("click", function () { about.close(); });
  document.getElementById("resetBtn").addEventListener("click", function () {
    if (confirm("Erase all progress on this phone?")) { progress.reset(); about.close(); show(current); }
  });
  const welcome = document.getElementById("welcomeDlg");
  document.getElementById("ackBtn").addEventListener("click", function () {
    const f = progress.prefs(); f.ack = true; progress.savePrefs(f); welcome.close();
  });

  // Number keys 1 to 4 pick a choice (handy on a laptop).
  document.addEventListener("keydown", function (ev) {
    const n = Number(ev.key);
    if (!(n >= 1 && n <= 4)) return;
    const v = views[current];
    const btns = v.querySelectorAll(".choice:not(:disabled)");
    if (btns[n - 1]) btns[n - 1].click();
  });

  // ---------- start ----------
  show("practice");
  if (!progress.prefs().ack && welcome.showModal) welcome.showModal();
  if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(function () { /* offline install is optional */ });
  }
})();
