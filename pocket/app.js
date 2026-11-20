// StudyHub Pocket (20 Nov 2026): StudyHub on an iPhone or iPad. It reads the file StudyHub on the laptop writes into its owner's
// OneDrive (app/pocket.py), picked in Files, and keeps it in this phone's own storage, so it opens without a connection. This page is
// code only: nothing it reads is sent anywhere, and the page's own rules (index.html) let nothing but this file's code run.
"use strict";
(() => {
  const VERSION = 1;  // the file's format this app reads (app/pocket.py)
  const NEW_PER_DAY = 20;  // new cards a day, as StudyHub's flip cards take them (practice.NEW_CARDS)
  const OLD_HOURS = 24;  // a file older than this says so
  const RULES = { steps: [1, 3, 7, 14, 30, 60], gap_share: 0.25, grades: { again: 20, hard: 60, good: 85, easy: 100 }, good: 70 };
  const WATCH = /^https:\/\/[a-z0-9-]+\.sharepoint\.com\//i;  // a recording plays on OneDrive's own page, behind the owner's login
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
    book: '<path d="M12 6C10 4 7 4 4 5.5V19c3-1.5 6-1.5 8 .5"/><path d="M12 6c2-2 5-2 8-.5V19c-3-1.5-6-1.5-8 .5M12 6v13.5"/>',
    cards: '<path d="M8 4h11a2 2 0 0 1 2 2v11"/><rect x="3" y="6.5" width="13" height="13" rx="2"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4M16 3v4"/>',
    chevL: '<path d="m14.5 6-6 6 6 6"/>',
    chevR: '<path d="m9.5 6 6 6-6 6"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    search: '<circle cx="11" cy="11" r="6.500"/><path d="m20 20-4.200-4.200"/>',
    file: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M14 3.5v5h5M9 13h6M9 16.5h6"/>',
    external: '<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>',
    exam: '<path d="M12 3.5 2.5 8.5 12 13.5l9.5-5z"/><path d="M6.5 10.6V15c1.5 1.5 3.5 2.3 5.5 2.3s4-.8 5.5-2.3v-4.4M21.5 8.5v5"/>',
    tasks: '<path d="M4 6.500 5.500 8 8 5M4 12.500 5.500 14 8 11M4 18.500 5.500 20 8 17M12 6.500h8M12 12.500h8M12 18.500h8"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.3"/>',
  };
  const KIND_ICON = { read: "book", rewatch: "video", review: "cards", cards: "cards", recall: "cards", test: "cards", weak: "cards", check: "cards",
    task: "tasks", work: "tasks", todo: "tasks", exam: "exam", mock: "exam" };
  const PRACTICE_KINDS = new Set(["review", "cards", "recall", "test", "weak", "check"]);
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const S = { data: null, answers: {}, problem: "", scroll: {}, stack: [], session: null, lectureTab: {}, query: "", searchText: null };
  const $app = document.getElementById("app"), $tabs = document.getElementById("tabs"), $toasts = document.getElementById("toasts");

  // ---------- small helpers ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style") for (const [p, val] of Object.entries(v)) el.style.setProperty(p.startsWith("--") ? p : p.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), val);
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    add(el, kids);
    return el;
  }
  function add(el, kids) {
    for (const k of kids.flat(Infinity)) {
      if (k == null || k === false) continue;
      el.append(k instanceof Node ? k : document.createTextNode(String(k)));
    }
  }
  function icon(name, size = 22) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", "stroke-width": 1.8,
      "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) s.setAttribute(k, v);
    s.innerHTML = ICONS[name] || "";  // the constants above, never data
    return s;
  }
  function toast(text) {
    const t = h("div", { class: "toast", role: "status" }, text);
    $toasts.append(t);
    setTimeout(() => t.remove(), 3600);
  }
  const plural = (n, word, words = `${word}s`) => `${n} ${n === 1 ? word : words}`;

  // ---------- days ----------
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => iso(new Date());
  const parseDay = (s) => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return iso(d); };
  const daysFrom = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 864e5);
  function dayName(s) {
    const n = daysFrom(today(), s), d = parseDay(s);
    if (n === 0) return "Today";
    if (n === 1) return "Tomorrow";
    if (n === -1) return "Yesterday";
    return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  const dateShort = (s) => { const d = parseDay(s); return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const inDays = (n) => (n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);
  function madeText(made) {
    const at = new Date(made || "");
    if (Number.isNaN(at.getTime())) return "";
    const mins = Math.round((Date.now() - at) / 6e4), clock = `${pad(at.getHours())}:${pad(at.getMinutes())}`, n = daysFrom(iso(at), today());
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins} min ago`;
    if (n === 0) return `today at ${clock}`;
    if (n === 1) return `yesterday at ${clock}`;
    return `on ${dateShort(iso(at))} at ${clock}`;
  }

  // ---------- this phone's storage ----------
  const DB = (() => {
    let db = null;
    const open = () => db ? Promise.resolve(db) : new Promise((ok, no) => {
      const r = indexedDB.open("studyhub-pocket", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => { db = r.result; ok(db); };
      r.onerror = () => no(r.error);
    });
    const run = (mode, act) => open().then((d) => new Promise((ok, no) => {
      const t = d.transaction("kv", mode), req = act(t.objectStore("kv"));
      t.oncomplete = () => ok(req.result);
      t.onerror = () => no(t.error);
      t.onabort = () => no(t.error || new Error("The phone stopped the write."));
    }));
    return { get: (k) => run("readonly", (s) => s.get(k)), set: (k, v) => run("readwrite", (s) => s.put(v, k)) };
  })();

  // ---------- the file ----------
  function pickFile() {
    const input = h("input", { type: "file", class: "sr", tabindex: "-1" });  // no accept: iOS greys out a kind of file it does not know
    input.addEventListener("change", async () => {
      const f = input.files && input.files[0];
      input.remove();
      if (!f) return;
      try {
        await useData(await readFile(f));
      } catch (e) {
        S.problem = e.message;
        toast(e.message);
        draw();
      }
    });
    input.addEventListener("cancel", () => input.remove());
    document.body.append(input);
    input.click();
  }
  async function readFile(f) {
    const head = new Uint8Array(await f.slice(0, 2).arrayBuffer());
    let text;
    if (head[0] === 0x1f && head[1] === 0x8b) {
      if (!("DecompressionStream" in window)) throw new Error("This phone's Safari cannot open the file: it needs iOS 16.4 or later.");
      text = await new Response(f.stream().pipeThrough(new DecompressionStream("gzip"))).text();
    } else {
      text = await f.text();
    }
    let data = null;
    try { data = JSON.parse(text); } catch { data = null; }
    if (!data || data.kind !== "studyhub-pocket") throw new Error(`${f.name} is not the file StudyHub writes for your phone. Pick StudyHub Pocket.shpocket in your StudyHub folder in OneDrive.`);
    if (data.version > VERSION) throw new Error("This file comes from a newer StudyHub. Open this app once with a connection, so it can update itself, then open the file again.");
    return data;
  }
  function tidy(d) {
    const list = (x) => (Array.isArray(x) ? x : []);
    return { ...d, courses: list(d.courses), lectures: list(d.lectures), cards: list(d.cards), plan: list(d.plan), dates: list(d.dates), rules: { ...RULES, ...(d.rules || {}) } };
  }
  async function useData(data) {
    if (S.data && S.data.made && data.made && data.made < S.data.made
      && !confirm(`This file is older than the one already on this phone: from your laptop ${madeText(data.made)}, against ${madeText(S.data.made)}. Use the older one?`)) return;
    S.data = tidy(data);
    S.problem = "";
    S.searchText = null;
    try {
      await DB.set("data", S.data);
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch (e) {
      toast(`Opened, but this phone did not let StudyHub keep it: ${e.message}`);
    }
    toast(`Opened. From your laptop${madeText(S.data.made) ? ` ${madeText(S.data.made)}` : ""}.`);
    if (!location.hash || location.hash === "#/") location.hash = "#/today"; else draw();
  }

  // ---------- what the file holds ----------
  const courseOf = (id) => S.data.courses.find((c) => c.id === id) || null;
  const lectureOf = (key) => S.data.lectures.find((l) => l.key === key) || null;
  const colour = (c) => ({ "--c": c && c.colour != null ? `var(--c${Number(c.colour) % 8})` : "var(--faint)" });
  const chip = (id, bare = false) => { const c = courseOf(id); return c ? h("span", { class: `chip${bare ? " bare" : ""}`, style: colour(c) }, c.short) : null; };
  function examIn(id) {
    const c = courseOf(id);
    return c && c.exam ? daysFrom(today(), c.exam) : null;
  }
  // A slide named by its deck: "slide 2:40" read as a time (refWords in StudyHub's own page)
  function refWords(text, lecture) {
    const names = (lecture && lecture.decks) || [];
    if (names.length < 2) return text;
    return String(text).replace(/\b(slides?)\s+(\d+):(\d+)(?:\s+to\s+(\d+):(\d+))?/gi, (m, word, d1, p1, d2, p2) => {
      const a = names[d1 - 1], b = d2 ? names[d2 - 1] : null;
      if (!a || (d2 && !b)) return m;
      if (!d2) return `${a}, slide ${p1}`;
      return d1 === d2 ? `${a}, slides ${p1} to ${p2}` : `${a}, slide ${p1} to ${b}, slide ${p2}`;
    });
  }
  // An answer numbered 1), 2) or 1., 2. as a list, as StudyHub shows it (listParts)
  const LIST_MARKS = [/(^|\s)(\d{1,2})\)\s+/g, /(^|[:;.,]\s+|\n\s*)(\d{1,2})\.\s+/g, /(^|\s)\(([a-h])\)\s+/g, /(^|\s)([a-h])\)\s+/g];
  function listParts(text) {
    for (const marks of LIST_MARKS) {
      const found = [...text.matchAll(marks)];
      if (found.length < 2) continue;
      const seq = found.map((m) => m[2]), number = /\d/.test(seq[0]);
      if (!(number ? seq[0] === "1" : seq[0] === "a") || !seq.every((v, i) => (number ? Number(v) === i + 1 : v.charCodeAt(0) === 97 + i))) continue;
      const at = (m) => m.index + m[1].length;
      const lead = text.slice(0, at(found[0])).trim();
      const items = found.map((m, i) => text.slice(m.index + m[0].length, i + 1 < found.length ? at(found[i + 1]) : undefined).trim().replace(/[;,]\s*(?:and|or)?$/, "").trim());
      if (items.every(Boolean)) return { lead, items, ordered: number };
    }
    const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean), bullet = /^[-*•]\s+/;
    if (lines.filter((x) => bullet.test(x)).length >= 2 && lines.slice(1).every((x) => bullet.test(x))) {
      return { lead: bullet.test(lines[0]) ? "" : lines[0], items: lines.filter((x) => bullet.test(x)).map((x) => x.replace(bullet, "")), ordered: false };
    }
    return null;
  }
  function answerBody(text, lecture) {
    const s = refWords(String(text || ""), lecture), list = listParts(s);
    if (!list) return h("p", {}, s);
    return h("div", { class: "answer-list" }, list.lead ? h("p", {}, list.lead) : null, h(list.ordered ? "ol" : "ul", {}, list.items.map((x) => h("li", {}, x))));
  }

  // A note as Notes keeps it, built again from what Notes allows (app/pages.py): the file is cleaned on the laptop already, and this is the
  // second lock. Links go to the web only, pictures are the file's own small copies, and nothing else of the markup is kept.
  const TAGS = new Set(["P", "H1", "H2", "H3", "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "HR", "FIGURE", "FIGCAPTION", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "DIV",
    "BR", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "CODE", "MARK", "A", "SPAN", "IMG", "SUB", "SUP"]);
  const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "NOSCRIPT", "SVG", "MATH", "TEXTAREA", "SELECT", "BUTTON", "INPUT", "FORM", "LINK", "META"]);
  const KEEP = { A: ["href"], IMG: ["src", "alt"], LI: ["data-done"], UL: ["class"], BLOCKQUOTE: ["class", "data-tone"], MARK: ["data-c"], TD: ["colspan", "data-c"], TH: ["colspan", "data-c"],
    FIGURE: ["class"], PRE: ["data-lang"], DIV: ["class"] };
  const PICTURE = /^data:image\/(?:jpeg|png|gif|webp);base64,[A-Za-z0-9+/=]+$/;
  function noteBody(html) {
    const doc = new DOMParser().parseFromString(`<!doctype html><body>${String(html || "")}</body>`, "text/html");  // inert: nothing in it loads or runs
    const out = document.createDocumentFragment();
    const walk = (from, to) => {
      for (const n of from.childNodes) {
        if (n.nodeType === 3) { to.append(n.textContent); continue; }
        if (n.nodeType !== 1) continue;
        const tag = n.tagName;
        if (DROP.has(tag)) continue;
        if (!TAGS.has(tag)) { walk(n, to); continue; }
        const el = document.createElement(tag.toLowerCase());
        for (const name of KEEP[tag] || []) {
          const v = n.getAttribute(name);
          if (v == null) continue;
          if (name === "href" && !/^https:\/\//i.test(v.trim())) continue;
          if (name === "src" && !PICTURE.test(v)) continue;
          if (name === "colspan" && !/^\d{1,2}$/.test(v)) continue;
          el.setAttribute(name, v);
        }
        if (tag === "A") {
          if (!el.hasAttribute("href")) { walk(n, to); continue; }
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }
        if (tag === "IMG" && !el.hasAttribute("src")) continue;
        if (tag === "IMG") el.setAttribute("loading", "lazy");
        walk(n, el);
        if (tag === "TABLE") { to.append(h("div", { class: "table-wrap" }, el)); continue; }
        to.append(el);
      }
    };
    walk(doc.body, out);
    return out;
  }
  const plainOf = (html) => String(html || "").replace(/<img[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

  // ---------- practice: StudyHub's own spacing, so a card marked here comes back when it would on the laptop ----------
  // Each question's state is the later of the laptop's (in the file) and this phone's own answer.
  function seenOf(q) {
    const mine = S.answers[q.id], theirs = q.due ? { due: q.due, score: q.score || 0, streak: q.streak || 0, t: q.t || 0 } : null;
    return mine && (!theirs || mine.t > (theirs.t || 0)) ? mine : theirs;
  }
  function gap(streak, exam) {
    const R = S.data.rules, days = R.steps[Math.min(Math.max(streak, 0), R.steps.length - 1)];
    return exam == null || exam <= 0 ? days : Math.max(1, Math.min(days, Math.ceil(exam * R.gap_share)));
  }
  function intervals(seen, exam) {
    const k = (seen && seen.streak) || 0;
    return { again: 0, hard: gap(Math.max(k - 1, 0), exam), good: gap(k + 1, exam), easy: gap(k + 2, exam) };
  }
  function queue(course, lecture) {
    const t = today(), due = [], fresh = [];
    for (const q of S.data.cards) {
      if ((course && q.course !== course) || (lecture && q.lecture !== lecture)) continue;
      const s = seenOf(q);
      if (!s) fresh.push(q); else if (s.due <= t) due.push(q);
    }
    due.sort((a, b) => seenOf(a).due.localeCompare(seenOf(b).due) || (b.exam - a.exam));
    const soon = (q) => { const n = examIn(q.course); return n == null || n < 0 ? 9999 : n; };
    fresh.sort((a, b) => (b.exam - a.exam) || (soon(a) - soon(b)));
    const newToday = Object.values(S.answers).filter((a) => a.first === t).length;
    const room = lecture ? fresh.length : Math.max(0, NEW_PER_DAY - newToday);
    return { due, fresh: fresh.slice(0, room), waiting: fresh.length };
  }
  function nextDue(course) {
    const t = today();
    let first = "";
    for (const q of S.data.cards) {
      if (course && q.course !== course) continue;
      const s = seenOf(q);
      if (s && s.due > t && (!first || s.due < first)) first = s.due;
    }
    return first;
  }
  function startSession(course = "", lecture = "") {
    const { due, fresh } = queue(course, lecture);
    S.session = { course, lecture, ids: [...due, ...fresh].map((q) => q.id), total: due.length + fresh.length, answered: 0, shown: false };
    go("#/practice/go");
  }
  function grade(q, g) {
    const R = S.data.rules, t = today(), before = seenOf(q) || { streak: 0 }, mine = S.answers[q.id];
    const days = intervals(before, examIn(q.course))[g];
    const k = before.streak || 0, streak = { again: 0, hard: Math.max(k - 1, 0), good: k + 1, easy: k + 2 }[g];
    S.answers[q.id] = { score: R.grades[g], streak, due: addDays(t, days), t: Date.now(), first: mine ? mine.first : (before.due ? "" : t), grade: g };
    DB.set("answers", S.answers).catch((e) => toast(`This phone did not keep the answer: ${e.message}`));
    const s = S.session;
    s.ids.shift();
    s.answered += 1;
    s.shown = false;
    if (g === "again") s.ids.splice(Math.min(3, s.ids.length), 0, q.id);  // again: it comes back after a few others
  }

  // ---------- where the app is ----------
  function go(route) {
    S.scroll[route] = 0;
    location.hash = route;
  }
  function parse(hash) {
    const parts = String(hash || "").replace(/^#\/?/, "").split("/").map(decodeURIComponent);
    const [a = "today", b = "", c = ""] = parts;
    if (a === "course" && b) return { name: c === "notes" ? "courseNotes" : "course", id: b, tab: "courses" };
    if (a === "lecture" && b) return { name: "lecture", key: parts.slice(1).join("/"), tab: "courses" };
    if (a === "practice") return { name: b === "go" ? "session" : "practice", tab: "practice" };
    if (a === "courses") return { name: "courses", tab: "courses" };
    if (a === "calendar") return { name: "calendar", tab: "calendar" };
    return { name: "today", tab: "today" };
  }
  function onRoute() {
    const route = location.hash || "#/today", st = S.stack;
    if (st.length > 1 && st[st.length - 2] === route) st.pop(); else if (st[st.length - 1] !== route) st.push(route);
    if (st.length > 30) st.splice(0, st.length - 30);
    draw(true);
  }
  function back(parent) {
    if (S.stack.length > 1) history.back();
    else { S.stack = []; location.replace(parent); }  // opened here directly: what came before is not this app's
  }
  let shown = "";
  function draw(moved = false) {
    const route = location.hash || "#/today";
    if (shown) S.scroll[shown] = window.scrollY;
    const r = parse(route);
    let page;
    if (!S.data) page = viewHello();
    else page = ({ today: viewToday, courses: viewCourses, course: viewCourse, courseNotes: viewCourseNotes, lecture: viewLecture, practice: viewPractice,
      session: viewSession, calendar: viewCalendar })[r.name](r);
    $app.replaceChildren(page);
    drawTabs(S.data ? r.tab : "");
    if (moved || route !== shown) window.scrollTo(0, S.scroll[route] || 0);
    shown = route;
    onScroll();
  }
  function onScroll() {
    const bar = $app.querySelector(".bar");
    if (bar) bar.classList.toggle("scrolled", window.scrollY > 56);
  }
  function drawTabs(on) {
    $tabs.hidden = !on;
    if (!on) return;
    const due = queue("", "").due.length;
    const tab = (id, label, ic, route, badge) => h("button", { type: "button", class: `tab${on === id ? " on" : ""}`, "aria-current": on === id ? "page" : null,
      onclick: () => { if (on === id && location.hash !== route) go(route); else if (on !== id) go(route); else window.scrollTo({ top: 0, behavior: "smooth" }); } },
      h("span", { class: "tab-icon" }, icon(ic, 24), badge ? h("span", { class: "badge num", "aria-label": `${badge} due` }, badge > 99 ? "99+" : badge) : null), label);
    $tabs.replaceChildren(tab("today", "Today", "sun", "#/today"), tab("courses", "Courses", "book", "#/courses"), tab("practice", "Practice", "cards", "#/practice", due),
      tab("calendar", "Calendar", "calendar", "#/calendar"));
  }
  function bar(label, parent, title) {
    return h("header", { class: "bar" }, h("button", { type: "button", class: "back", "aria-label": `Back to ${label}`, onclick: () => back(parent) }, icon("chevL", 26), h("span", {}, label)),
      h("div", { class: "bar-title", "aria-hidden": "true" }, title || ""));
  }
  const row = (attrs, ...kids) => h(attrs.onclick || attrs.href ? (attrs.href ? "a" : "button") : "div", { type: attrs.onclick && !attrs.href ? "button" : null, ...attrs, class: `row ${attrs.class || ""}` }, ...kids);
  const rowText = (title, sub) => h("div", { class: "row-text" }, h("span", { class: "row-title" }, title), sub ? h("span", { class: "row-sub" }, sub) : null);
  const label = (text, end) => h("div", { class: "label" }, h("span", {}, text), end ? h("span", { class: "end" }, end) : null);

  // ---------- the first start ----------
  function viewHello() {
    const home = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
    return h("main", { class: "page" }, h("div", { class: "hello enter" },
      h("img", { class: "hello-logo", src: "icon-192.png", alt: "" }),
      h("div", { class: "page-head" }, h("h1", {}, "StudyHub on your phone"),
        h("p", { class: "sub" }, "Your lectures' summaries, your own notes, your cards and today's plan, from the file StudyHub on your laptop keeps in your OneDrive.")),
      h("div", { class: "panel" }, h("ol", { class: "steps", style: { padding: "4px 16px" } },
        h("li", {}, "On your laptop, open StudyHub's Settings. Under OneDrive, in StudyHub on your phone, turn on ", h("b", {}, "Keep it up to date"), "."),
        h("li", {}, "Here, tap ", h("b", {}, "Open the file"), " and pick ", h("b", {}, "StudyHub Pocket.shpocket"), " in your OneDrive, in the StudyHub folder."))),
      home ? null : h("p", { class: "notice" }, "To open StudyHub like an app: tap Share in Safari, then Add to Home Screen."),
      S.problem ? h("p", { class: "problem", role: "alert" }, S.problem) : null,
      h("button", { type: "button", class: "btn primary block", onclick: pickFile }, icon("file", 20), "Open the file"),
      h("p", { class: "small faint" }, "The file is read on this phone and kept here. Nothing of it is sent anywhere.")));
  }
  function freshness() {
    const made = new Date(S.data.made), old = !Number.isNaN(made.getTime()) && Date.now() - made > OLD_HOURS * 36e5;
    return h("div", { class: `fresh${old ? " old" : ""}` },
      h("div", { class: "fresh-text" }, h("span", { class: "fresh-when" }, `From your laptop${madeText(S.data.made) ? ` ${madeText(S.data.made)}` : ""}`),
        h("span", { class: "small muted" }, old ? "Open StudyHub on your laptop to bring it up to date, then open the file here again." : "To bring it up to date, open the file again.")),
      h("button", { type: "button", class: "btn small", onclick: pickFile }, icon("refresh", 18), "Open again"));
  }

  // ---------- Today ----------
  function viewToday() {
    const d = S.data, t = today(), now = new Date();
    const blocks = d.plan, planDay = d.today && d.today !== t ? d.today : "";
    const { due, fresh } = queue("", "");
    const soon = d.dates.filter((x) => x.date >= t && x.date <= addDays(t, 13)).slice(0, 8);
    const open = (b) => {
      if (b.lecture && lectureOf(b.lecture)) return () => go(`#/lecture/${encodeURIComponent(b.lecture)}`);
      if (PRACTICE_KINDS.has(b.kind)) return () => startSession(b.course || "");
      return null;
    };
    return h("main", { class: "page enter" },
      h("div", { class: "page-head" }, h("h1", {}, "Today"), h("p", { class: "sub" }, `${WEEKDAYS_LONG[now.getDay()]}, ${now.getDate()} ${MONTHS_LONG[now.getMonth()]}`)),
      freshness(),
      label(planDay ? `Your plan for ${dateShort(planDay)}` : "Today's plan", blocks.length ? `${Math.round(blocks.reduce((n, b) => n + (b.done ? 0 : b.minutes || 0), 0))} min left` : ""),
      h("div", { class: "panel" }, blocks.length ? blocks.map((b) => {
        const act = open(b);
        return row({ class: b.done ? "done" : "", onclick: act },
          h("span", { class: "lead-icon" }, icon(b.done ? "check" : KIND_ICON[b.kind] || "tasks", 19)),
          rowText(b.what || "A block of the plan", h("span", { class: "metas" }, chip(b.course), b.minutes ? `${b.minutes} min` : null)),
          act ? icon("chevR", 20) : null);
      }) : h("p", { class: "empty" }, "Nothing planned for today.")),
      planDay ? h("p", { class: "small faint", style: { margin: "8px 6px 0" } }, "The plan is the one your laptop made that day. What you did since shows once the file is newer.") : null,
      label("Cards and questions"),
      h("div", { class: "panel" }, row({ onclick: () => go("#/practice") },
        h("span", { class: "lead-icon" }, icon("cards", 19)),
        rowText(due.length ? (due.length === 1 ? "1 card or question is due" : `${due.length} cards and questions are due`) : "Nothing is due now",
          fresh.length ? `and ${plural(fresh.length, "new one")} to learn today` : null),
        icon("chevR", 20))),
      label("Coming up", soon.length ? "next two weeks" : ""),
      h("div", { class: "panel" }, soon.length ? soon.map(dateRow) : h("p", { class: "empty" }, "Nothing in the next two weeks.")),
      soon.length ? h("p", { style: { margin: "10px 6px 0" } }, h("a", { href: "#/calendar", class: "small muted" }, "All dates in Calendar")) : null);
  }
  function dateRow(x) {
    const c = courseOf(x.course), kind = x.kind === "exam" ? "exam" : x.kind === "deadline" ? "hand-in" : x.kind === "session" ? "lecture" : "event";
    const d = parseDay(x.date);
    return row({ style: colour(c) },
      h("div", { class: "when" }, h("span", { class: "when-day" }, WEEKDAYS[d.getDay()]), h("span", { class: "when-num num" }, d.getDate())),
      h("span", { class: `mark ${kind}`, "aria-hidden": "true" }),
      rowText(x.title || (kind === "lecture" ? "Lecture" : "A date"),
        h("span", { class: "metas" }, chip(x.course, true), x.time ? h("span", { class: "num" }, x.time) : null, kind === "exam" ? h("span", { class: "pill exam" }, "Exam") : kind === "hand-in" ? "Hand-in" : null,
          x.outside ? h("span", { class: "pill signal" }, "Not the course") : null)));
  }

  // ---------- Courses ----------
  function searchText() {
    if (S.searchText) return S.searchText;
    S.searchText = S.data.lectures.map((l) => {
      const s = l.summary || {};
      const said = (list) => (list || []).map((x) => (typeof x === "string" ? x : x && x.text));  // a point is its words and where they come from
      const words = [l.title, l.label, ...said(s.takeaways), ...(s.sections || []).flatMap((x) => [x.title, x.lead, ...said(x.points), ...said(x.added)]),
        ...(s.terms || []).flatMap((x) => [x.term, x.means]), ...(s.exam || []), ...(l.notes || []).map((n) => `${n.title || ""} ${plainOf(n.html)}`)];
      const text = words.filter(Boolean).join(" · ");
      return { l, text, low: text.toLowerCase() };
    });
    return S.searchText;
  }
  function snippet(text, low, word) {
    const at = low.indexOf(word), from = Math.max(0, at - 50), part = text.slice(from, at + word.length + 90);
    const i = part.toLowerCase().indexOf(word);
    return h("span", { class: "hit-text" }, from ? "…" : "", part.slice(0, i), h("b", {}, part.slice(i, i + word.length)), part.slice(i + word.length), "…");
  }
  function hits(box) {
    const words = S.query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    if (!words.length) return box.replaceChildren();
    const found = searchText().filter((x) => words.every((w) => x.low.includes(w))).slice(0, 30);
    box.replaceChildren(label(found.length ? plural(found.length, "lecture") : "Nothing found"),
      found.length ? h("div", { class: "panel" }, found.map(({ l, text, low }) => row({ onclick: () => go(`#/lecture/${encodeURIComponent(l.key)}`), style: colour(courseOf(l.course)) },
        h("div", { class: "row-text" }, h("span", { class: "row-title" }, `${l.label}${l.title ? `: ${l.title}` : ""}`), h("span", { class: "metas" }, chip(l.course)), snippet(text, low, words[0])),
        icon("chevR", 20)))) : h("p", { class: "small muted", style: { margin: "0 6px" } }, "Search looks in your lectures' summaries and your own notes."));
  }
  function viewCourses() {
    const results = h("div", {});
    const field = h("input", { type: "search", placeholder: "Search lectures and your notes", "aria-label": "Search lectures and your notes", value: S.query, enterkeyhint: "search",
      autocomplete: "off", autocorrect: "off", spellcheck: "false" });
    field.addEventListener("input", () => { S.query = field.value; hits(results); list.hidden = !!S.query.trim(); });
    const t = today();
    const list = h("div", {}, label("Your courses"), h("div", { class: "panel" }, S.data.courses.map((c) => {
      const n = c.exam ? daysFrom(t, c.exam) : null, count = S.data.lectures.filter((l) => l.course === c.id).length;
      return row({ onclick: () => go(`#/course/${encodeURIComponent(c.id)}`), style: colour(c) }, h("span", { class: "dot" }),
        rowText(c.short, c.name !== c.short ? c.name : null),
        n != null && n >= 0 ? h("span", { class: "pill exam num" }, n === 0 ? "Exam today" : `Exam ${inDays(n)}`) : h("span", { class: "small faint num" }, plural(count, "lecture")),
        icon("chevR", 20));
    })));
    list.hidden = !!S.query.trim();
    const page = h("main", { class: "page enter" }, h("div", { class: "page-head" }, h("h1", {}, "Courses")),
      h("div", { class: "search" }, icon("search", 18), field), results, list);
    if (S.query.trim()) hits(results);
    return page;
  }
  function viewCourse(r) {
    const c = courseOf(r.id);
    if (!c) return gone("This course is not in the file any more.", "#/courses", "Courses");
    const lectures = S.data.lectures.filter((l) => l.course === c.id).sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.label.localeCompare(a.label));
    const { due, fresh } = queue(c.id, ""), n = c.exam ? daysFrom(today(), c.exam) : null;
    return h("div", { style: colour(c) }, bar("Courses", "#/courses", c.short), h("main", { class: "page has-bar enter" },
      h("div", { class: "page-head" }, h("span", { class: "chip" }, c.short), h("h1", {}, c.name)),
      h("div", { class: "metas", style: { margin: "12px 4px 0" } },
        n != null && n >= 0 ? h("span", { class: "pill exam" }, icon("exam", 15), `Exam ${dateShort(c.exam)}, ${inDays(n)}`) : null,
        h("span", {}, plural(lectures.length, "lecture"))),
      h("div", { class: "btns", style: { marginTop: "16px" } },
        h("button", { type: "button", class: `btn${due.length ? " primary" : ""}`, onclick: () => startSession(c.id), disabled: due.length + fresh.length ? null : true },
          icon("cards", 19), due.length ? `Practice ${due.length} due` : fresh.length ? `Learn ${fresh.length} new` : "Nothing due")),
      c.notes && c.notes.length ? [label("Your notes"), h("div", { class: "panel" }, row({ onclick: () => go(`#/course/${encodeURIComponent(c.id)}/notes`) },
        h("span", { class: "lead-icon" }, icon("file", 19)), rowText(plural(c.notes.length, "note"), c.notes.map((x) => x.title).filter(Boolean).join(", ") || null), icon("chevR", 20)))] : null,
      label("Lectures", "newest first"),
      h("div", { class: "panel" }, lectures.length ? lectures.map((l) => row({ onclick: () => go(`#/lecture/${encodeURIComponent(l.key)}`) },
        rowText(l.title || l.label, h("span", { class: "metas" }, l.title ? h("span", {}, l.label) : null, l.date ? h("span", { class: "num" }, dateShort(l.date)) : null,
          l.notes && l.notes.length ? h("span", { class: "metas" }, icon("file", 15), "Your notes") : null, l.read ? h("span", { class: "metas" }, icon("check", 15), "Read") : null)),
        icon("chevR", 20))) : h("p", { class: "empty" }, "No lecture with a summary or your notes yet."))));
  }
  function viewCourseNotes(r) {
    const c = courseOf(r.id);
    if (!c) return gone("This course is not in the file any more.", "#/courses", "Courses");
    return h("div", { style: colour(c) }, bar(c.short, `#/course/${encodeURIComponent(c.id)}`, "Your notes"), h("main", { class: "page has-bar enter" },
      h("div", { class: "page-head" }, h("span", { class: "chip" }, c.short), h("h1", {}, "Your notes")),
      h("div", { class: "panel", style: { marginTop: "18px" } }, (c.notes || []).map(noteDoc))));
  }
  function noteDoc(n) {
    return h("article", { class: "doc" }, n.title ? h("div", { class: "doc-title" }, n.title) : null, noteBody(n.html));
  }
  function gone(text, parent, name) {
    return h("div", {}, bar(name, parent, ""), h("main", { class: "page has-bar" }, h("p", { class: "empty" }, text)));
  }

  // ---------- a lecture ----------
  function viewLecture(r) {
    const l = lectureOf(r.key);
    if (!l) return gone("This lecture is not in the file any more.", "#/courses", "Courses");
    const c = courseOf(l.course), notes = l.notes || [], s = l.summary;
    const tab = S.lectureTab[l.key] || (s ? "summary" : "notes");
    const cards = S.data.cards.filter((q) => q.lecture === l.key).length;
    const watch = (l.watch || []).filter((w) => WATCH.test(w.url || ""));
    const pick = (id) => { S.lectureTab[l.key] = id; draw(); };
    return h("div", { style: colour(c) }, bar(c ? c.short : "Courses", c ? `#/course/${encodeURIComponent(c.id)}` : "#/courses", l.title || l.label),
      h("main", { class: "page has-bar enter" },
        h("div", { class: "lecture-head" },
          h("div", { class: "metas" }, chip(l.course), l.title ? h("span", {}, l.label) : null, l.date ? h("span", { class: "num" }, dateShort(l.date)) : null, l.minutes ? h("span", { class: "num" }, `${l.minutes} min read`) : null),
          h("h1", {}, l.title || l.label),
          watch.length || cards ? h("div", { class: "btns", style: { marginTop: "6px" } },
            watch.map((w) => h("a", { class: "btn small", href: w.url, target: "_blank", rel: "noopener noreferrer" }, icon("video", 18), watch.length === 1 ? "Watch in OneDrive" : `Watch ${w.label}`)),
            cards ? h("button", { type: "button", class: "btn small", onclick: () => startSession(l.course, l.key) }, icon("cards", 18), `Practice ${cards}`) : null) : null),
        s && notes.length ? h("div", { class: "seg", role: "tablist" },
          h("button", { type: "button", role: "tab", class: tab === "summary" ? "on" : "", "aria-selected": String(tab === "summary"), onclick: () => pick("summary") }, "Summary"),
          h("button", { type: "button", role: "tab", class: tab === "notes" ? "on" : "", "aria-selected": String(tab === "notes"), onclick: () => pick("notes") }, `Your notes (${notes.length})`)) : null,
        tab === "notes" || !s ? h("div", { class: "panel", style: { marginTop: s && notes.length ? "10px" : "20px" } },
          notes.length ? notes.map(noteDoc) : h("p", { class: "empty" }, "You have no notes on this lecture."))
          : summary(l, s)));
  }
  function summary(l, s) {
    const parts = [];
    if (s.takeaways && s.takeaways.length) parts.push(h("section", { class: "sum-part" }, h("h2", {}, "What to take away"), points(s.takeaways, l)));
    for (const x of s.sections || []) {
      parts.push(h("section", { class: "sum-part" }, h("h2", {}, x.title), x.lead ? h("p", { class: "lead" }, refWords(x.lead, l)) : null, points(x.points, l),
        x.added && x.added.length ? h("div", { class: "said-box" }, h("span", { class: "box-label" }, "Not on the slides: what the lecturer added"), points(x.added, l)) : null));
    }
    if (s.exam && s.exam.length) parts.push(h("section", { class: "sum-part" }, h("div", { class: "exam-box", style: { marginTop: 0 } }, h("span", { class: "box-label" }, icon("exam", 16), "About the exam"), points(s.exam, l))));
    if (s.terms && s.terms.length) parts.push(h("section", { class: "sum-part" }, h("h2", {}, "Key terms"), h("dl", { class: "terms" }, s.terms.map((x) => h("div", {}, h("dt", {}, x.term), h("dd", {}, refWords(x.means, l), x.ref ? h("span", { class: "ref" }, refLabel(x.ref, l)) : null))))));
    return h("div", { class: "panel sum", style: { marginTop: "16px" } }, parts.length ? parts : h("p", { class: "empty" }, "This summary is empty."));
  }
  // Where a point comes from, as the reader names it: a slide by its deck, a moment of the recording by its time
  function refLabel(ref, l) {
    return String(ref || "").split(/\s*\u00b7\s*/).filter(Boolean).map((part) => (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(part) ? `at ${part}` : refWords(part, l))).join(", ");
  }
  const points = (list, l) => (list && list.length ? h("ul", { class: "points" }, list.map((x) => (typeof x === "string" ? h("li", {}, refWords(x, l))
    : h("li", {}, refWords(x.text, l), x.ref ? h("span", { class: "ref" }, refLabel(x.ref, l)) : null)))) : null);

  // ---------- Practice ----------
  function viewPractice() {
    const all = queue("", ""), t = today();
    const courses = S.data.courses.map((c) => ({ c, ...queue(c.id, "") })).filter((x) => x.due.length || x.fresh.length || S.data.cards.some((q) => q.course === x.c.id));
    const next = all.due.length || all.fresh.length ? "" : nextDue("");
    const counts = (x) => h("span", { class: "counts" }, x.due.length ? h("span", { class: "pill num" }, `${x.due.length} due`) : null,
      x.fresh.length ? h("span", { class: "pill num", style: { background: "transparent", border: "1px solid var(--line-strong)" } }, `${x.fresh.length} new`) : null);
    return h("main", { class: "page enter" },
      h("div", { class: "page-head" }, h("h1", {}, "Practice"),
        h("p", { class: "sub" }, all.due.length ? `${plural(all.due.length, "card or question", "cards and questions")} due now` : next ? `Nothing due now. The next ones come ${inDays(daysFrom(t, next))}.` : "Nothing due now.")),
      all.due.length || all.fresh.length ? h("button", { type: "button", class: "btn primary block", style: { marginTop: "18px" }, onclick: () => startSession("") }, icon("cards", 19),
        all.due.length ? `Start with ${all.due.length} due${all.fresh.length ? ` and ${all.fresh.length} new` : ""}` : `Learn ${all.fresh.length} new`) : null,
      label("By course"),
      h("div", { class: "panel course-pick" }, courses.length ? courses.map((x) => row({ onclick: x.due.length + x.fresh.length ? () => startSession(x.c.id) : null, style: colour(x.c) },
        h("span", { class: "dot" }), rowText(x.c.short, x.due.length + x.fresh.length ? null : "Nothing due"), counts(x), x.due.length + x.fresh.length ? icon("chevR", 20) : null))
        : h("p", { class: "empty" }, "No cards yet. They come with the lectures' summaries.")),
      h("p", { class: "small faint", style: { margin: "14px 6px 0" } },
        "Your answers here are kept on this phone and set when each card comes back, by StudyHub's own rule. StudyHub on your laptop does not see them yet."));
  }
  function viewSession() {
    const s = S.session;
    if (!s) { setTimeout(() => location.replace("#/practice")); return h("main", { class: "page" }); }
    const q = S.data.cards.find((x) => x.id === s.ids[0]);
    const head = bar("Practice", "#/practice", s.course ? (courseOf(s.course) || {}).short : "All courses");
    if (!q) {
      return h("div", {}, head, h("main", { class: "page has-bar enter" }, h("div", { class: "hello", style: { paddingTop: "8vh" } },
        h("span", { class: "lead-icon", style: { width: "56px", height: "56px", borderRadius: "16px", display: "grid", placeItems: "center", background: "var(--raise-2)", color: "var(--ok)" } }, icon("check", 30)),
        h("div", { class: "page-head" }, h("h1", {}, s.answered ? "That's all for now" : "Nothing to practise"),
          h("p", { class: "sub" }, s.answered ? `${plural(s.answered, "answer")} on this phone. They come back when StudyHub's spacing says so.` : "Nothing is due here now.")),
        h("button", { type: "button", class: "btn primary block", onclick: () => { S.session = null; back("#/practice"); } }, "Back to Practice"))));
    }
    const l = lectureOf(q.lecture), seen = seenOf(q), days = intervals(seen, examIn(q.course));
    const left = s.ids.length, done = Math.max(0, s.total - left);
    const when = (n) => (n === 0 ? "now" : n === 1 ? "1 day" : `${n} days`);
    const show = () => { s.shown = true; draw(); };
    const mark = (g) => { grade(q, g); draw(); };
    return h("div", { style: colour(courseOf(q.course)) }, head, h("main", { class: "page has-bar" },
      h("div", { class: "deck-top" }, h("span", { class: "num" }, `${left} left`),
        h("div", { class: "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(s.total), "aria-valuenow": String(done) }, h("i", { style: { width: `${s.total ? (100 * done) / s.total : 0}%` } }))),
      h("article", { class: "flash enter" },
        h("div", { class: "flash-meta" }, chip(q.course), h("span", {}, q.label || (l && l.label) || ""), q.exam ? h("span", { class: "pill exam" }, "Exam topic") : null,
          seen ? null : h("span", { class: "pill" }, "New")),
        h("p", { class: "flash-q" }, refWords(q.q, l)),
        s.shown ? h("div", { class: "flash-a" }, h("span", { class: "flash-a-label" }, "Answer"), answerBody(q.a, l)) : null),
      s.shown ? h("div", { class: "grades", role: "group", "aria-label": "How well did you know it?" },
        [["again", "Again"], ["hard", "Hard"], ["good", "Good"], ["easy", "Easy"]].map(([g, name]) => h("button", { type: "button", class: "grade", onclick: () => mark(g) },
          name, h("small", { class: "num" }, when(days[g])))))
        : h("button", { type: "button", class: "btn primary block reveal", onclick: show }, "Show the answer")));
  }

  // ---------- Calendar ----------
  function viewCalendar() {
    const t = today(), days = new Map();
    for (const x of S.data.dates) if (x.date >= t) (days.get(x.date) || days.set(x.date, []).get(x.date)).push(x);
    const out = [];
    for (const [day, list] of days) {
      const n = daysFrom(t, day);
      out.push(h("div", { class: "day-head" }, h("span", {}, dayName(day)), n <= 1 ? h("span", { class: "faint num" }, dateShort(day)) : n < 7 ? null : h("span", { class: "faint num" }, inDays(n))),
        h("div", { class: "panel" }, list.map(calRow)));
    }
    return h("main", { class: "page enter" },
      h("div", { class: "page-head" }, h("h1", {}, "Calendar"), h("p", { class: "sub" }, "Lectures, hand-ins and exams of the next four months.")),
      out.length ? out : h("p", { class: "empty" }, "No dates in the next four months."));
  }
  function calRow(x) {
    const c = courseOf(x.course), kind = x.kind === "exam" ? "exam" : x.kind === "deadline" ? "hand-in" : x.kind === "session" ? "lecture" : "event";
    return row({ style: colour(c) },
      h("span", { class: "num small", style: { width: "44px", flex: "none", color: x.time ? "var(--ink)" : "var(--faint)" } }, x.time || "All day"),
      h("span", { class: `mark ${kind}`, "aria-hidden": "true" }),
      rowText(x.title || (kind === "lecture" ? "Lecture" : "A date"), h("span", { class: "metas" }, chip(x.course, true), kind === "exam" ? h("span", { class: "pill exam" }, "Exam") : kind === "hand-in" ? "Hand-in" : null,
        x.outside ? h("span", { class: "pill signal" }, "Not the course") : null)));
  }

  // ---------- start ----------
  async function boot() {
    try {
      const data = await DB.get("data");
      S.data = data ? tidy(data) : null;
      S.answers = (await DB.get("answers")) || {};
    } catch (e) {
      S.problem = `This phone did not let StudyHub read what it kept: ${e.message}`;
    }
    window.addEventListener("hashchange", onRoute);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && S.data) draw(); });  // a new day: what is due moves on
    onRoute();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  boot();
})();
