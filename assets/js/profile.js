"use strict";
(() => {
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

  // src/config.ts
  var FACULTY_LIST_URL = "https://kmahfuz.com/faculty-api/faculty";
  var REQUEST_TIMEOUT_MS = 1e4;
  var FACULTY_PROFILE_URL = (id) => `${FACULTY_LIST_URL}/${id}`;

  // src/api.ts
  var NotFoundError = class extends Error {
  };
  function isFaculty(x) {
    const o = x;
    return !!o && typeof o === "object" && typeof o.id === "number" && typeof o.name === "string";
  }
  function parse(json) {
    const list = Array.isArray(json) ? json : json == null ? void 0 : json.data;
    if (!Array.isArray(list)) throw new Error("Unexpected response shape");
    return list.filter(isFaculty).map((f) => {
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
  async function loadFacultyById(id) {
    var _a;
    const { json } = await getJson(FACULTY_PROFILE_URL(id));
    const inner = (_a = json == null ? void 0 : json.data) != null ? _a : json;
    const [f] = parse(Array.isArray(inner) ? inner : [inner]);
    if (!f) throw new Error("Unexpected response shape");
    return f;
  }

  // src/profile.ts
  var head = $("#pHead");
  var content = $("#pContent");
  var navCard = $("#pNavCard");
  var navList = $("#pNav");
  var ICON_MAIL = `<svg viewBox="0 0 20 16" width="16" height="13" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="1" y="1" width="18" height="14" rx="2"/><path d="M1.5 2.5 10 9l8.5-6.5"/></svg>`;
  var ICON_PIN = `<svg viewBox="0 0 12 16" width="11" height="15" fill="currentColor" aria-hidden="true"><path d="M6 0a6 6 0 0 0-6 6c0 4.2 6 10 6 10s6-5.800 6-10a6 6 0 0 0-6-6Zm0 8.500A2.500 2.500 0 1 1 6 3.500a2.500 2.500 0 0 1 0 5Z"/></svg>`;
  function readId() {
    const raw = new URLSearchParams(location.search).get("id");
    const n = Number(raw);
    return raw !== null && Number.isInteger(n) && n > 0 ? n : null;
  }
  function sections(f) {
    const out = [];
    if (f.education.length)
      out.push({
        id: "education",
        label: "Education",
        html: `<ul class="edu">${f.education.map((e) => `<li><p class="edu-t">${esc([e.degree, e.institution].filter(Boolean).join(", "))}</p>${e.year ? `<p class="edu-y">${e.year}</p>` : ""}</li>`).join("")}</ul>`
      });
    if (f.courses_taught.length)
      out.push({ id: "teaching", label: "Teaching Areas", html: `<ul class="tags">${f.courses_taught.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` });
    const research = [];
    if (f.research_interests.length)
      research.push(`<h3>Research Interests</h3><ul class="tags">${f.research_interests.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`);
    if (f.publications.length)
      research.push(
        `<h3>Publications</h3><ul class="pubs">${f.publications.map((p) => `<li><span>${esc(p.title)}</span>${p.year ? ` <em>(${p.year})</em>` : ""}</li>`).join("")}</ul>`
      );
    if (research.length) out.push({ id: "research", label: "Research &amp; Publications", html: research.join("") });
    return out;
  }
  function render(f) {
    var _a;
    document.title = `${f.name} | American International University`;
    const subtitle = f.department ? `${f.designation} of ${f.department}` : f.designation;
    head.classList.remove("skel");
    head.removeAttribute("aria-hidden");
    head.innerHTML = `
    <div class="p-photo">${f.photo_url ? `<img src="${esc(f.photo_url)}" alt="Portrait of ${esc(f.name)}" width="409" height="430" decoding="async" fetchpriority="high">` : ""}</div>
    <div class="p-info">
      <h1 class="p-name">${esc(f.name)}</h1>
      ${subtitle ? `<p class="p-title">${esc(subtitle)}</p>` : ""}
      ${f.school ? `<p class="p-school">${esc(f.school)}</p>` : ""}
      <ul class="p-contact">
        ${f.email ? `<li>${ICON_MAIL}<a href="mailto:${esc(f.email)}">${esc(f.email)}</a></li>` : ""}
        ${f.office ? `<li>${ICON_PIN}<span>${esc(f.office)}</span></li>` : ""}
      </ul>
    </div>`;
    (_a = head.querySelector("img")) == null ? void 0 : _a.addEventListener("error", (e) => e.target.remove(), { once: true });
    const list = sections(f);
    content.removeAttribute("aria-busy");
    content.innerHTML = list.map((s) => `<section class="p-sec ${s.id}" id="${s.id}" aria-labelledby="${s.id}-h"><h2 id="${s.id}-h">${s.label}</h2>${s.html}</section>`).join("");
    navList.innerHTML = list.map((s) => `<li><a href="#${s.id}">${s.label}</a></li>`).join("");
    navCard.hidden = list.length < 2;
  }
  function showMessage(title, text) {
    document.title = `${title} | American International University`;
    head.innerHTML = "";
    head.classList.remove("skel");
    head.removeAttribute("aria-hidden");
    navCard.hidden = true;
    content.removeAttribute("aria-busy");
    content.innerHTML = `<div class="state" role="alert"><h2>${title}</h2><p>${text}</p><a class="retry" href="index.html">Back to Faculty Directory</a></div>`;
  }
  async function load() {
    const id = readId();
    if (id === null) return showMessage("Faculty member not found", "This profile link is missing a valid id.");
    try {
      render(await loadFacultyById(id));
    } catch (err) {
      if (err instanceof NotFoundError) return showMessage("Faculty member not found", "We couldn&rsquo;t find that profile. It may have been moved or removed.");
      console.error("[faculty] could not load the profile:", err);
      showMessage("We couldn&rsquo;t load this profile", "Please check your connection and try again.");
    }
  }
  initShell();
  void load();
})();
