"use strict";
(() => {
  // src/config.ts
  var FACULTY_LIST_URL = "https://kmahfuz.com/faculty-api/faculty";
  var REQUEST_TIMEOUT_MS = 1e4;
  var profileUrl = (id) => `profile.html?id=${encodeURIComponent(String(id))}`;

  // src/api.ts
  var NotFoundError = class extends Error {
  };
  function isFaculty(x) {
    const o = x;
    return !!o && typeof o === "object" && typeof o.id === "number" && typeof o.name === "string";
  }
  function parse(json) {
    const list2 = Array.isArray(json) ? json : json == null ? void 0 : json.data;
    if (!Array.isArray(list2)) throw new Error("Unexpected response shape");
    return list2.filter(isFaculty).map((f) => {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      return {
        ...f,
        designation: (_a = f.designation) != null ? _a : "",
        school: (_b = f.school) != null ? _b : "",
        department: (_c = f.department) != null ? _c : "",
        photo_url: f.photo_url || null,
        biography: (_d = f.biography) != null ? _d : "",
        education: (_e = f.education) != null ? _e : [],
        research_interests: (_f = f.research_interests) != null ? _f : [],
        publications: (_g = f.publications) != null ? _g : [],
        courses_taught: (_h = f.courses_taught) != null ? _h : []
      };
    });
  }
  function withTimeout(p, ms) {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error(`Request timed out after ${ms} ms`)), ms);
      p.then(
        (v) => {
          window.clearTimeout(timer);
          resolve(v);
        },
        (e) => {
          window.clearTimeout(timer);
          reject(e);
        }
      );
    });
  }
  async function getJson(url) {
    const res = await withTimeout(fetch(url, { headers: { Accept: "application/json" } }), REQUEST_TIMEOUT_MS);
    if (res.status === 404) throw new NotFoundError(`Not found: ${url}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { status: res.status, json: await withTimeout(res.json(), REQUEST_TIMEOUT_MS) };
  }
  async function loadFaculty() {
    return parse((await getJson(FACULTY_LIST_URL)).json);
  }

  // src/dom.ts
  var $ = (sel, root = document) => {
    const el = root.querySelector(sel);
    if (!el) throw new Error(`Missing element: ${sel}`);
    return el;
  };
  var esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // src/shell.ts
  function initShell() {
    setupMenu();
    $(".f-logo img").src = $(".brand img").src;
    $("#yr").textContent = String((/* @__PURE__ */ new Date()).getFullYear());
  }
  function setupMenu() {
    const mega = $("#mega");
    const main = $(".hdr-nav > ul");
    const util = $(".util-nav");
    const m = document.createElement("ul");
    m.className = "m-nav";
    m.append(util.querySelector(".ql").cloneNode(true), ...[...main.children].map((l) => l.cloneNode(true)));
    const mu = document.createElement("ul");
    mu.className = "m-util";
    [...util.children].filter((l) => !l.matches(".ql,.sr")).forEach((l) => mu.append(l.cloneNode(true)));
    mega.prepend(m, mu);
    mega.querySelectorAll("li.has-sub").forEach((li) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tg";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Toggle submenu");
      const a = li.firstElementChild;
      a.after(btn);
      const toggle = (e) => {
        e.preventDefault();
        btn.setAttribute("aria-expanded", String(li.classList.toggle("open")));
      };
      btn.addEventListener("click", toggle);
      if (a.getAttribute("href") === "#") a.addEventListener("click", toggle);
    });
    const burger = $("#burger");
    burger.addEventListener("click", () => {
      burger.setAttribute("aria-expanded", String(document.body.classList.toggle("menu-open")));
    });
  }

  // src/main.ts
  var PAGE_SIZE = 15;
  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var TITLES = /^(dr|prof|professor|mr|mrs|ms|miss|eng|sheikh)\.?$/i;
  function toRow(f) {
    const words = f.name.trim().split(/\s+/);
    while (words.length > 1 && TITLES.test(words[0])) words.shift();
    const last = words.length > 1 ? words[words.length - 1] : words[0];
    const first = words.slice(0, -1).join(" ");
    return {
      ...f,
      last,
      first,
      subtitle: f.department ? `${f.designation} of ${f.department}` : f.designation,
      haystack: [f.name, f.designation, f.department, f.school, ...f.research_interests, ...f.courses_taught, f.biography].join(" ").toLowerCase()
    };
  }
  var byName = (a, b) => a.last.localeCompare(b.last, "en", { sensitivity: "base" }) || a.first.localeCompare(b.first, "en", { sensitivity: "base" });
  var list = $("#list");
  var alpha = $("#alpha");
  var q = $("#q");
  var school = $("#school");
  var area = $("#area");
  var rows = [];
  var letter = "All";
  var page = 1;
  function showSkeleton() {
    list.setAttribute("aria-busy", "true");
    $("#pagerRow").hidden = true;
    list.innerHTML = Array.from(
      { length: 5 },
      () => `<li class="row skel" aria-hidden="true"><div class="photo"></div><div class="info"><div class="l n"></div><div class="l t"></div><div class="l v"></div></div></li>`
    ).join("");
  }
  function showError() {
    list.removeAttribute("aria-busy");
    $("#pagerRow").hidden = true;
    list.innerHTML = `<li class="state" role="alert"><p>We couldn&rsquo;t load the faculty directory. Please check your connection and try again.</p><button type="button" class="retry">Try again</button></li>`;
  }
  function baseRows() {
    const term = q.value.trim().toLowerCase();
    return rows.filter(
      (r) => (!school.value || r.school === school.value) && (!area.value || r.department === area.value) && (!term || r.haystack.includes(term))
    );
  }
  function fillSchools() {
    const schools = [...new Set(rows.map((r) => r.school).filter(Boolean))].sort();
    school.innerHTML = `<option value="">All Schools</option>` + schools.map((s) => `<option>${esc(s)}</option>`).join("");
    fillAreas();
  }
  function fillAreas() {
    const keep = area.value;
    const depts = [...new Set(rows.filter((r) => !school.value || r.school === school.value).map((r) => r.department).filter(Boolean))].sort();
    area.innerHTML = `<option value="">All Teaching Areas</option>` + depts.map((d) => `<option>${esc(d)}</option>`).join("");
    area.value = depts.includes(keep) ? keep : "";
  }
  function pageList(c, n) {
    if (n <= 9) return Array.from({ length: n }, (_, i) => i + 1);
    const keep = [...new Set([1, 2, c - 1, c, c + 1, n - 1, n].filter((p) => p >= 1 && p <= n))].sort((a, b) => a - b);
    const out = [];
    keep.forEach((p, i) => {
      if (i && p - keep[i - 1] > 1) out.push("\u2026");
      out.push(p);
    });
    return out;
  }
  function renderPager(total, pages) {
    const row = $("#pagerRow");
    if (!total) {
      row.hidden = true;
      return;
    }
    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);
    $("#pagerInfo").innerHTML = `Showing <b>${from}</b> to <b>${to}</b> of <b>${total}</b> results`;
    const ul = $("#pager");
    const nav = ul.parentElement;
    nav.hidden = pages < 2;
    if (pages >= 2) {
      const arrow = (ch, label, p, off) => off ? `<li class="page-item disabled" aria-disabled="true"><span class="page-link" aria-hidden="true">${ch}</span></li>` : `<li class="page-item"><button type="button" class="page-link" data-p="${p}" aria-label="${label}">${ch}</button></li>`;
      ul.innerHTML = arrow("&lsaquo;", "Previous page", page - 1, page === 1) + pageList(page, pages).map(
        (p) => p === "\u2026" ? `<li class="page-item dots far" aria-hidden="true"><span class="page-link">&hellip;</span></li>` : p === page ? `<li class="page-item active" aria-current="page"><span class="page-link">${p}</span></li>` : `<li class="page-item${Math.abs(p - page) > 1 ? " far" : ""}"><button type="button" class="page-link" data-p="${p}" aria-label="Page ${p}">${p}</button></li>`
      ).join("") + arrow("&rsaquo;", "Next page", page + 1, page === pages);
    }
    row.hidden = false;
  }
  function render() {
    list.removeAttribute("aria-busy");
    const base = baseRows();
    const available = new Set(base.map((r) => r.last.charAt(0).toUpperCase()));
    const buttons = [...alpha.children];
    if (letter !== "All" && !available.has(letter)) letter = "All";
    buttons.forEach((b) => {
      var _a;
      const l = (_a = b.textContent) != null ? _a : "";
      b.disabled = l !== "All" && !available.has(l);
      b.setAttribute("aria-pressed", String(l === letter));
    });
    const items = letter === "All" ? base : base.filter((r) => r.last.toUpperCase().startsWith(letter));
    const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    page = Math.min(Math.max(1, page), pages);
    list.innerHTML = items.length ? items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(
      (f) => `<li class="row"><div class="photo">${f.photo_url ? `<img src="${esc(f.photo_url)}" alt="Portrait of ${esc(f.name)}" width="130" height="137" loading="lazy" decoding="async">` : ""}</div><div class="info"><h3 class="name">${esc(f.name)}</h3><p class="title">${esc(f.subtitle)}</p><a class="view" href="${profileUrl(f.id)}" aria-label="View profile of ${esc(f.name)}">View Profile &rsaquo;</a></div></li>`
    ).join("") : `<li class="empty">No faculty match your search.</li>`;
    list.querySelectorAll("img").forEach((img) => img.addEventListener("error", () => img.remove(), { once: true }));
    renderPager(items.length, pages);
  }
  var reset = () => {
    page = 1;
    render();
  };
  async function load() {
    showSkeleton();
    try {
      rows = (await loadFaculty()).map(toRow).sort(byName);
      fillSchools();
      render();
    } catch (err) {
      console.error("[faculty] could not load the directory:", err);
      showError();
    }
  }
  ["All", ...LETTERS].forEach((l) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = l;
    b.setAttribute("aria-pressed", String(l === "All"));
    b.addEventListener("click", () => {
      letter = l;
      reset();
    });
    alpha.appendChild(b);
  });
  $("#pager").addEventListener("click", (e) => {
    const b = e.target.closest("[data-p]");
    if (!b) return;
    page = Number(b.dataset.p);
    render();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    $('section[aria-label="Faculty results"]').scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    list.focus({ preventScroll: true });
  });
  list.addEventListener("click", (e) => {
    if (e.target.closest(".retry")) void load();
  });
  $("#filter").addEventListener("submit", (e) => {
    e.preventDefault();
    reset();
  });
  q.addEventListener("input", reset);
  school.addEventListener("change", () => {
    fillAreas();
    reset();
  });
  area.addEventListener("change", reset);
  initShell();
  void load();
})();
