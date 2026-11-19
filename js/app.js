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
  const SVGNS = "http://www.w3.org/2000/svg";
  function icon(nm, cls) {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "ic" + (cls ? " " + cls : ""));
    svg.setAttribute("aria-hidden", "true");
    const u = document.createElementNS(SVGNS, "use");
    u.setAttribute("href", "#" + nm);
    svg.append(u);
    return svg;
  }
  function groupIcon(gid, cls) { return icon("i-" + gid, cls); }
  function groupName(gid) { return rhythms.groups.find(function (x) { return x.id === gid; }).name; }
  function reduceMotion() { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
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
  function toggleBtn(label, on, onChange, ic) {
    const b = h("button", { type: "button", class: "btn small toggle", "aria-pressed": String(!!on) }, ic ? icon(ic) : null, label);
    b.addEventListener("click", function () {
      const now = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(now));
      onChange(now);
    });
    return b;
  }
  function reviewTag() { return h("span", { class: "tag warn", title: "Not yet checked by a nurse" }, icon("i-review"), "Pending nurse review"); }

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
    const tools = opts.tools === false ? null : h("div", { class: "strip-tools" },
      toggleBtn("Measure", false, function (on) { cal.set(on); }, "i-measure"),
      toggleBtn("Zoom", false, function (on) { zoom = on ? 2 : 1; w.redraw(); }, "i-zoom"),
      h("button", { type: "button", class: "btn small", "aria-label": "Full screen strip", onclick: function () { expandStrip(w.strip); } }, icon("i-expand"))
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
  // Full screen: the strip turned sideways along the long edge of the phone (view only).
  const expandBox = document.getElementById("expandBox");
  const expandCanvas = expandBox.querySelector("canvas");
  let expanded = null, expandReturn = null;
  function expandStrip(strip) {
    expanded = strip;
    expandReturn = document.activeElement;
    expandBox.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(function () { S.draw(expandCanvas, strip, {}); expandBox.querySelector(".expand-close").focus(); });
  }
  function closeExpand() {
    if (!expanded) return;
    expanded = null;
    expandBox.hidden = true;
    document.body.style.overflow = "";
    if (expandReturn && expandReturn.focus) expandReturn.focus();
  }
  expandBox.querySelector(".expand-close").addEventListener("click", closeExpand);
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") closeExpand(); });

  let resizeT = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      widgets.forEach(function (w) { if (!w.el.isConnected) widgets.delete(w); else w.redraw(); });
      if (expanded) S.draw(expandCanvas, expanded, {});
    }, 150);
  });

  // ---------- feedback (shared by practice and exam review) ----------
  function feedback(strip, chosen, shown, ms) {
    const R = rhythms.byId[strip.rhythm];
    const right = chosen === strip.rhythm;
    const box = h("div", { class: "card feedback", "aria-live": "polite" });
    box.append(h("div", { class: "verdict " + (right ? "ok" : "no") },
      icon(right ? "i-check" : "i-x"),
      h("span", { text: right ? "Correct: " + R.name : (chosen ? "It's " + R.name : "Time ran out: " + R.name) }),
      ms != null ? h("span", { class: "time", text: secs(ms) }) : null
    ));
    if (R.lethal) box.append(h("p", { class: "small", style: "margin:6px 0 0" }, h("span", { class: "tag danger" }, icon("i-lethal"), "Lethal rhythm")));
    const edge = quiz.edgeNote(strip);
    if (edge) box.append(h("p", { class: "note", text: edge }));

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
  ["home", "learn", "practice", "exam", "progress"].forEach(function (v) { views[v] = document.getElementById("view-" + v); });
  let current = "home", stopLive = null;
  function show(v) {
    if (stopLive) stopLive();
    current = v;
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== v; });
    document.querySelectorAll(".tabs button").forEach(function (b) {
      if (b.dataset.view === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (v === "home") renderHome();
    if (v === "learn") renderLearn();
    if (v === "practice") { if (!pr.strip) nextPractice(); else renderPracticeHeader(); }
    if (v === "exam" && exam.state === "setup") renderExamSetup();
    if (v === "progress") renderProgress();
    window.scrollTo(0, 0);
    views[v].classList.remove("enter");
    void views[v].offsetWidth;
    views[v].classList.add("enter");
    requestAnimationFrame(function () { widgets.forEach(function (w) { w.redraw(); }); });
  }
  document.querySelectorAll(".tabs button").forEach(function (b) {
    b.addEventListener("click", function () { show(b.dataset.view); });
  });

  // ---------- Home dashboard ----------
  // Honest numbers only: accuracy from real answers; untried groups read "not tried yet".
  function groupIds(gid) { return rhythms.list.filter(function (R) { return R.group === gid; }).map(function (R) { return R.id; }); }
  function goPractice(mode) { pr.mode = mode; pr.last = null; pr.strip = null; show("practice"); }
  function recommend() {
    const rev = progress.reviewIds();
    if (rev.length) return { ic: "i-review", tone: "red", title: "Review " + rev.length + " missed rhythm" + (rev.length > 1 ? "s" : ""),
      why: "Misses stay in review until you get them right twice in a row.", go: function () { goPractice("review"); } };
    const gs = rhythms.groups.map(function (g) { return { g: g, a: progress.accuracy(groupIds(g.id)) }; });
    const untried = gs.find(function (x) { return x.a.attempts === 0; });
    if (untried) return { ic: "i-" + untried.g.id, title: "Try " + untried.g.name + " rhythms",
      why: "You haven't answered any " + untried.g.name.toLowerCase() + " strips yet.", go: function () { goPractice(untried.g.id); } };
    const thin = gs.filter(function (x) { return x.a.n < 5; }).sort(function (a, b) { return a.a.n - b.a.n; })[0];
    if (thin) return { ic: "i-" + thin.g.id, title: "More " + thin.g.name + " practice",
      why: "Only " + thin.a.n + " answer" + (thin.a.n === 1 ? "" : "s") + " so far, too few to judge.", go: function () { goPractice(thin.g.id); } };
    const weak = gs.slice().sort(function (a, b) { return a.a.pct - b.a.pct; })[0];
    if (weak.a.pct < 90) return { ic: "i-" + weak.g.id, tone: "amber", title: "Practice " + weak.g.name,
      why: "Your lowest group: " + weak.a.pct + "% over your last " + weak.a.n + " answers.", go: function () { goPractice(weak.g.id); } };
    return { ic: "i-timer", tone: "blue", title: "Take a timed exam",
      why: "Every group is at 90% or better in your recent answers. Test it under the clock.", go: function () { show("exam"); } };
  }
  function ring(pct) {
    const r = 27, c = 2 * Math.PI * r;
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 64 64");
    svg.setAttribute("aria-hidden", "true");
    const mk = function (cls) {
      const el = document.createElementNS(SVGNS, "circle");
      el.setAttribute("cx", "32"); el.setAttribute("cy", "32"); el.setAttribute("r", String(r));
      el.setAttribute("class", cls);
      svg.append(el);
      return el;
    };
    mk("track" + (pct == null ? " none" : ""));
    if (pct != null) {
      const val = mk("val" + (pct >= 85 ? "" : pct >= 60 ? " mid" : " low"));
      val.style.strokeDasharray = c.toFixed(2);
      val.style.strokeDashoffset = c.toFixed(2);
      requestAnimationFrame(function () { requestAnimationFrame(function () { val.style.strokeDashoffset = (c * (1 - pct / 100)).toFixed(2); }); });
    }
    return svg;
  }
  function greeting() {
    const hr = new Date().getHours();
    return hr < 5 ? "Late shift" : hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  }
  function renderHome() {
    const v = views.home;
    clear(v);
    const st = progress.stats(ALL);
    const overall = progress.accuracy(ALL);

    // Monitor header: a fresh normal sinus strip sweeping like the bedside monitor.
    const demo = ecg.generate("nsr", { seconds: 60 });
    const mCanvas = h("canvas", { role: "img", "aria-label": "Animated monitor: normal sinus rhythm, computer generated" });
    const monitor = h("div", { class: "monitor" },
      h("div", { class: "strip-wrap" }, mCanvas),
      h("span", { class: "lead", text: "II" }),
      h("div", { class: "hr", "aria-hidden": "true" }, h("span", { text: "HR" }), h("b", { text: String(Math.round(demo.measures.rate)) })));
    const cont = pr.mode === "review" && !progress.reviewIds().length ? "all" : pr.mode;
    const setName = cont === "review" ? "Missed rhythms" : (rhythms.sets.find(function (x) { return x.id === cont; }) || {}).name;
    const cta = st.total
      ? h("button", { type: "button", class: "btn primary block hero-cta", onclick: function () { goPractice(cont); } }, icon("i-play"), "Continue studying")
      : h("button", { type: "button", class: "btn primary block hero-cta", onclick: function () { goPractice("core"); } }, icon("i-play"), "Start with Core 5");
    v.append(h("div", { class: "card hero" }, monitor,
      h("div", { class: "hero-body" },
        h("div", null, h("div", { class: "eyebrow warm", text: greeting() }),
          h("h2", { text: st.total ? overall.pct + "% accuracy" : "Ready when you are" }),
          h("p", { class: "small muted", style: "margin:4px 0 0", text: st.total
            ? "Your last " + overall.n + " answers · " + st.total + " strips in all · next: " + setName
            : "Five common rhythms first, then all 26. Every strip is new." })),
        cta)));
    requestAnimationFrame(function () {
      if (current !== "home" || !mCanvas.isConnected) return;
      const stop = S.live(mCanvas, demo);
      stopLive = function () { stop(); stopLive = null; };
    });

    // Today's suggestion, with the reason shown.
    const rc = recommend();
    v.append(h("div", { class: "stack", style: "gap:8px" }, h("div", { class: "eyebrow", text: "Suggested next" }),
      h("button", { type: "button", class: "card rec", onclick: rc.go },
        h("span", { class: "ic-chip" + (rc.tone ? " " + rc.tone : "") }, icon(rc.ic)),
        h("span", { class: "grow" }, h("strong", { text: rc.title }), h("p", { class: "why", text: rc.why })),
        icon("i-chevron", "chev"))));

    // Recently missed rhythms: tap to open the rhythm's Learn card.
    const missed = progress.recentMisses(5);
    if (missed.length) {
      v.append(h("div", { class: "card stack" },
        h("div", { class: "row-between" }, h("h3", { text: "Recently missed" }),
          h("button", { type: "button", class: "btn small ghost", onclick: function () { goPractice("review"); }, hidden: !progress.reviewIds().length }, icon("i-review"), "Review")),
        h("div", { class: "chips" }, missed.map(function (id) {
          return h("button", { type: "button", class: "chip", "aria-label": "Open the Learn card for " + name(id), onclick: function () { openLearn(id); } },
            rhythms.byId[id].lethal ? icon("i-lethal", "danger sm") : null, rhythms.byId[id].short);
        })),
        h("p", { class: "small muted", style: "margin:0", text: "Tap one to open its criteria." })));
    }

    // Accuracy by group (rings). Unseen groups say "not tried yet", never 0%.
    const rings = h("div", { class: "rings" });
    rhythms.groups.forEach(function (g) {
      const a = progress.accuracy(groupIds(g.id));
      rings.append(h("button", { type: "button", class: "ring-btn", onclick: function () { goPractice(g.id); },
        "aria-label": "Practice " + g.name + ": " + (a.pct == null ? "not tried yet" : a.pct + "% accuracy over your last " + a.n + " answers") },
        h("span", { class: "ring" }, ring(a.pct), h("span", { class: "in" }, groupIcon(g.id))),
        h("span", { class: "nm", text: g.name }),
        h("span", { class: "pc" + (a.pct == null ? " none" : ""), text: a.pct == null ? "not tried yet" : a.pct + "%" })));
    });
    v.append(h("div", { class: "card stack" },
      h("div", { class: "row-between" }, h("h3", { text: "Accuracy by group" }), h("span", { class: "small muted", text: "last 20 answers" })),
      rings));

    v.append(h("div", { class: "shortcuts" },
      h("button", { type: "button", class: "tile-btn", onclick: function () { show("learn"); } }, h("span", { class: "ic-chip blue" }, icon("i-learn")), "Learn"),
      h("button", { type: "button", class: "tile-btn", onclick: function () { show("practice"); } }, h("span", { class: "ic-chip" }, icon("i-practice")), "Practice"),
      h("button", { type: "button", class: "tile-btn", onclick: function () { show("exam"); } }, h("span", { class: "ic-chip amber" }, icon("i-timer")), "Exam")));

    const last = st.exams[0];
    if (last) v.append(h("p", { class: "small muted", style: "margin:0", text: "Last exam: " + last.pct + "% (" + (last.passed ? "pass" : "not yet") + "), " + new Date(last.at).toLocaleDateString() }));
    v.append(h("p", { class: "honest" }, icon("i-about"),
      "Accuracy comes from your own answers on this phone. Mastery tracking (spaced repetition) isn't built yet, so nothing here claims mastery."));
  }
  function openLearn(id) {
    show("learn");
    const g = rhythms.byId[id].group;
    const d = views.learn.querySelector('details[data-group="' + g + '"]');
    if (!d) return;
    d._build();
    d.open = true;
    const card = d.querySelector('[data-rhythm="' + id + '"]');
    if (card) requestAnimationFrame(function () { card.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" }); });
  }

  // ---------- Learn ----------
  function renderLearn() {
    const v = views.learn;
    clear(v);
    const steps = h("ol", { class: "steps" });
    rhythms.approach.forEach(function (s) { steps.append(h("li", null, h("b", { text: s[0] + ". " }), s[1])); });
    v.append(h("div", { class: "card" }, h("div", { class: "row" }, h("span", { class: "ic-chip blue" }, icon("i-learn")), h("h2", { text: "Same 5 steps, every strip" })), steps,
      h("p", { class: "small muted", style: "margin:10px 0 0", text: "Paper at 25 mm/s: 1 small box = 0.04 s, 1 big box = 0.20 s, a 6-second strip = 30 big boxes. Height: 10 small boxes = 1 mV (the square calibration pulse at the start)." })));

    v.append(h("p", { class: "small muted", text: "Tap a group to open it. Every card's strip is new each time." }));
    rhythms.groups.forEach(function (g) {
      const members = rhythms.list.filter(function (R) { return R.group === g.id; });
      const acc = progress.accuracy(members.map(function (R) { return R.id; }));
      const d = h("details", { class: "card learn-group", "data-group": g.id },
        h("summary", null, h("span", { class: "ic-chip" }, groupIcon(g.id)),
          h("span", { class: "grow" }, h("span", { class: "h2like", text: g.name }),
            h("span", { class: "small muted", text: members.length + " rhythms · " + (acc.pct == null ? "not tried yet" : acc.pct + "% accuracy") })),
          icon("i-chevron", "chev")));
      let built = false;
      d._build = function () {
        if (built) return;
        built = true;
        members.forEach(function (R) { d.append(learnCard(R)); });
      };
      d.addEventListener("toggle", function () { if (d.open) d._build(); });
      v.append(d);
    });
  }
  function learnCard(R) {
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
    }, "i-monitor");
    const table = h("table", { class: "criteria" });
    [["Rate", R.teach.rate], ["Regularity", R.teach.regularity], ["P waves", R.teach.p], ["PR", R.teach.pr], ["QRS", R.teach.qrs]]
      .forEach(function (r) { table.append(h("tr", null, h("th", { text: r[0] }), h("td", { text: r[1] }))); });
    const card = h("div", { class: "learn-card", "data-rhythm": R.id },
      h("div", { class: "row-between" }, h("h3", { text: R.name }), R.lethal ? h("span", { class: "tag danger" }, icon("i-lethal"), "Lethal") : null),
      h("div", { style: "margin:12px -14px 0" }, w.el),
      h("div", { class: "row", style: "margin-top:10px" },
        h("button", { type: "button", class: "btn small", onclick: function () { if (liveOn && stopLive) stopLive(); w.set(ecg.generate(R.id)); } }, icon("i-review"), "New example"),
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
    return card;
  }

  // ---------- Practice ----------
  const pr = { mode: "all", edge: false, strip: null, shown: [], at: 0, answered: false, n: 0, ok: 0, last: null, widget: null };
  let practiceHeader = null;
  function renderPracticeHeader() {
    if (!practiceHeader) return;
    const n = progress.reviewIds().length;
    const sc = practiceHeader.querySelector(".mono");
    if (sc) sc.textContent = pr.n ? pr.ok + "/" + pr.n : "";
    const opt = practiceHeader.querySelector("option[value=review]");
    if (opt) opt.textContent = "Missed rhythms" + (n ? " (" + n + ")" : "");
  }
  function setIds(id) {
    const st = rhythms.sets.find(function (x) { return x.id === id; });
    return st ? st.ids : ALL;
  }
  function setPicker() {
    const sel = h("select", { class: "select", "aria-label": "Rhythm set", onchange: function () { pr.mode = sel.value; pr.last = null; nextPractice(); } });
    rhythms.sets.forEach(function (st) { sel.append(h("option", { value: st.id, text: st.name })); });
    sel.append(h("option", { value: "review", text: "Missed rhythms" }));
    sel.value = pr.mode;
    return sel;
  }
  function nextPractice() {
    const v = views.practice;
    clear(v);
    practiceHeader = h("div", { class: "stack" },
      h("div", { class: "row-between" },
        h("h2", { text: "Practice" }),
        h("span", { class: "mono muted small", "aria-label": "Session score" })),
      h("div", { class: "row" }, setPicker(), toggleBtn("Near the cutoffs", pr.edge, function (on) { pr.edge = on; nextPractice(); }))
    );
    v.append(practiceHeader);
    renderPracticeHeader();

    const ids = pr.mode === "review" ? progress.reviewIds() : setIds(pr.mode);
    if (!ids.length) {
      pr.strip = { empty: true };
      v.append(h("div", { class: "card empty" },
        h("div", { class: "big ic-chip" }, icon("i-check")),
        h("p", { text: "Nothing to review." }),
        h("p", { class: "small muted", text: "Missed rhythms land here and stay until you get them right twice in a row." }),
        h("button", { type: "button", class: "btn primary", text: "Practice all rhythms", onclick: function () { pr.mode = "all"; nextPractice(); } })));
      return;
    }
    const id = quiz.pickRhythm(progress.weights(ids), Math.random, pr.last);
    pr.last = id;
    pr.strip = ecg.generate(id, { borderline: pr.edge });
    pr.shown = quiz.choices(id, Math.random, 4, pr.mode === "review" ? null : setIds(pr.mode));
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
      const m = b.querySelector(".mark");
      if (id === correct) { b.classList.add("right"); clear(m); m.append(icon("i-check"), "answer"); }
      else if (id === chosen) { b.classList.add("wrong"); clear(m); m.append(icon("i-x"), "your pick"); }
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
    const e = Object.assign({ set: "all", edge: false }, f.exam);
    const save = function () { f.exam = e; progress.savePrefs(f); };
    const last = progress.stats(ALL).exams[0];
    v.append(h("div", { class: "card stack" },
      h("div", { class: "row" }, h("span", { class: "ic-chip blue" }, icon("i-timer")), h("h2", { text: "Exam simulation" })),
      h("p", { class: "small muted", text: "Timed, no feedback until the end, like a hospital rhythm test. Not a copy of any specific exam." }),
      h("div", { class: "setting" }, h("span", { class: "lbl", text: "Rhythms" }),
        seg([{ value: "all", label: "All 26" }, { value: "core", label: "Core 5" }], e.set, function (x) { e.set = x; save(); }, "Rhythm set")),
      h("div", { class: "setting" }, h("span", { class: "lbl", text: "Strips" }),
        seg([10, 20, 25].map(function (n) { return { value: n, label: String(n) }; }), e.count, function (x) { e.count = x; save(); }, "Number of strips")),
      h("div", { class: "setting" }, h("span", { class: "lbl", text: "Time per strip" }),
        seg([30, 45, 60].map(function (n) { return { value: n, label: n + " s" }; }), e.seconds, function (x) { e.seconds = x; save(); }, "Time per strip")),
      h("div", { class: "setting" }, h("span", { class: "lbl", text: "Pass mark" }),
        seg([80, 85, 90].map(function (n) { return { value: n, label: n + "%" }; }), e.passMark, function (x) { e.passMark = x; save(); }, "Pass mark")),
      h("div", { class: "setting" }, h("span", { class: "lbl", text: "Lethal rule: must get every lethal strip (VT, torsades, VF, asystole) right to pass" }),
        seg([{ value: true, label: "On" }, { value: false, label: "Off" }], e.lethal, function (x) { e.lethal = x; save(); }, "Lethal rule")),
      h("div", { class: "setting" }, h("span", { class: "lbl", text: "Near-cutoff strips (about 1 in 4 sits close to a rate, PR or QRS cutoff)" }),
        seg([{ value: false, label: "Off" }, { value: true, label: "Mix in" }], e.edge, function (x) { e.edge = x; save(); }, "Near-cutoff strips")),
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
    Object.assign(exam, { state: "run", cfg: Object.assign({}, cfg), plan: quiz.examPlan(cfg.count, Math.random, setIds(cfg.set || "all")), i: 0, results: [], startedAt: Date.now() });
    examQuestion();
  }
  function stopTimer() { if (exam.timer) { clearInterval(exam.timer); exam.timer = 0; } }
  function examQuestion() {
    stopTimer();
    const v = views.exam;
    clear(v);
    const id = exam.plan[exam.i];
    exam.strip = ecg.generate(id, { borderline: !!exam.cfg.edge && Math.random() < 0.25 });
    exam.shown = quiz.choices(id, Math.random, 4, setIds(exam.cfg.set || "all"));
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
      passMark: c.passMark, lethal: c.lethal, seconds: c.seconds, avgMs: Math.round(avg), set: c.set || "all" });
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
      sc.groups.length > 1 ? h("table", { class: "table" },
        h("tr", null, h("th", { text: "Group" }), h("th", { class: "num", text: "Right" })),
        sc.groups.map(function (g) { return h("tr", null, h("td", { text: g.name }), h("td", { class: "num", text: g.correct + " / " + g.total })); })) : null,
      h("div", { class: "row" },
        h("button", { type: "button", class: "btn primary", text: "New exam", onclick: function () { exam.state = "setup"; renderExamSetup(); } }),
        progress.reviewIds().length ? h("button", { type: "button", class: "btn", text: "Practice my misses", onclick: function () { pr.mode = "review"; pr.strip = null; show("practice"); } }) : null)
    ));
    const list = h("div", { class: "card" }, h("h3", { text: "Every strip" }));
    exam.results.forEach(function (r, i) {
      const d = h("details", { class: "result-item" });
      d.append(h("summary", null,
        h("span", { text: (i + 1) + ". " + (r.ok ? name(r.rhythm) : "Answer: " + rhythms.byId[r.rhythm].short + " · you: " + (r.chosen ? rhythms.byId[r.chosen].short : "no answer")) }),
        h("span", { class: "tag " + (r.ok ? "ok" : "danger"), "aria-label": r.ok ? "right" : "wrong" }, icon(r.ok ? "i-check" : "i-x"))));
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
    v.append(h("div", { class: "row" }, h("span", { class: "ic-chip blue" }, icon("i-progress")), h("h2", { text: "Progress" })));
    if (!st.total) {
      v.append(h("div", { class: "card empty" }, h("p", { text: "No answers yet." }), h("p", { class: "small muted", text: "Practice or take an exam and your accuracy and speed show up here." })));
      return;
    }
    const tile = function (k, val, s) { return h("div", { class: "tile" }, h("div", { class: "k", text: k }), h("div", { class: "v", text: val }), h("div", { class: "s", text: s })); };
    v.append(h("div", { class: "tiles" },
      tile("Accuracy, all time", fmt(st.overall), st.total + " strips"),
      tile("Last 7 days", fmt(st.week), st.weekCount + " strips"),
      tile("Before that", fmt(st.before), st.beforeCount + " strips"),
      tile("Avg time, correct", st.weekAvgMs ? secs(st.weekAvgMs) : "–", "last 7 days")));
    const t = h("table", { class: "table" },
      h("tr", null, h("th", { text: "Rhythm" }), h("th", { class: "num", text: "Last 20" }), h("th", { class: "num", text: "Speed" }), h("th", { class: "num", text: "Seen" })));
    let lastGroup = null;
    st.per.forEach(function (p) {
      const g = rhythms.byId[p.id].group;
      if (g !== lastGroup) { lastGroup = g; t.append(h("tr", { class: "group-row" }, h("th", { colspan: "4" }, groupIcon(g), groupName(g)))); }
      t.append(h("tr", null,
        h("td", null, rhythms.byId[p.id].short, p.inReview ? h("span", { class: "tag warn", style: "margin-left:6px", text: "review" }) : null,
          p.pct != null ? h("div", { class: "bar", "aria-hidden": "true" }, h("i", { style: "width:" + p.pct + "%" })) : null),
        h("td", { class: "num", text: p.pct == null ? "not tried" : p.pct + "%" }),
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
  // Appearance: app theme and strip colors are separate choices.
  const settings = document.getElementById("settingsDlg");
  function renderSettings() {
    const body = document.getElementById("settingsBody");
    clear(body);
    const f = progress.prefs();
    const cur = { theme: f.theme || "system", strip: f.strip || "auto" };
    const preview = stripCard(ecg.generate("nsr"), { tools: false });
    const set = function (k, val) {
      const g = progress.prefs(); g[k] = val; progress.savePrefs(g);
      window.EKG.theme.apply({ theme: g.theme, strip: g.strip });
    };
    body.append(
      h("div", { class: "setting" }, h("span", { class: "lbl", text: "App theme" }),
        seg([{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }], cur.theme, function (x) { set("theme", x); }, "App theme")),
      h("p", { class: "small muted", style: "margin:0", text: "System follows your iPhone: light by day, dark at night if you use automatic Dark Mode." }),
      h("div", { class: "setting" }, h("span", { class: "lbl", text: "Strip colors" }),
        seg([{ value: "auto", label: "Auto" }, { value: "paper", label: "Paper" }, { value: "green", label: "Green" }, { value: "amber", label: "Amber" }], cur.strip, function (x) { set("strip", x); }, "Strip colors")),
      h("p", { class: "small muted", style: "margin:0", text: "Paper: red grid on light ECG paper. Green and Amber: dark monitor screen. Auto uses paper in the light theme and green in the dark theme. Same scale either way: 25 mm/s, 10 mm/mV." }),
      preview.el);
  }
  document.getElementById("settingsBtn").addEventListener("click", function () { renderSettings(); settings.showModal(); });
  settings.querySelector("[data-close]").addEventListener("click", function () { settings.close(); });
  window.EKG.theme.onChange(function () {
    widgets.forEach(function (w) { if (!w.el.isConnected) widgets.delete(w); else w.redraw(); });
    if (expanded) S.draw(expandCanvas, expanded, {});
    if (stopLive) { stopLive(); if (current === "home") renderHome(); }
  });

  function startTour() {
    window.EKG.tour.open(document.getElementById("tourDlg"), {
      standalone: !!(navigator.standalone || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)),
      reduceMotion: reduceMotion(),
      onDone: function () { const f = progress.prefs(); f.ack = true; f.tour = window.EKG.tour.VERSION; progress.savePrefs(f); }
    });
  }
  document.getElementById("replayBtn").addEventListener("click", function () { about.close(); startTour(); });

  // Number keys 1 to 4 pick a choice (handy on a laptop).
  document.addEventListener("keydown", function (ev) {
    const n = Number(ev.key);
    if (!(n >= 1 && n <= 4)) return;
    const v = views[current];
    const btns = v.querySelectorAll(".choice:not(:disabled)");
    if (btns[n - 1]) btns[n - 1].click();
  });

  // ---------- start ----------
  show("home");
  if ((progress.prefs().tour || 0) < window.EKG.tour.VERSION && document.getElementById("tourDlg").showModal) startTour();
  if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(function () { /* offline install is optional */ });
  }
})();
