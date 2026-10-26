import { loadFaculty } from "./api";
import { profileUrl } from "./config";
import type { Faculty } from "./types";
import { $, esc } from "./dom";
import { initShell } from "./shell";

/* ---------- types & helpers ---------- */
interface Row extends Faculty {
  last: string;
  first: string;
  subtitle: string;
  haystack: string;
}

const PAGE_SIZE = 15;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const TITLES = /^(dr|prof|professor|mr|mrs|ms|miss|eng|sheikh)\.?$/i;

/** "Dr. Adam Rahman" -> first "Adam", last "Rahman" (titles are ignored for sorting and the A-Z strip). */
function toRow(f: Faculty): Row {
  const words = f.name.trim().split(/\s+/);
  while (words.length > 1 && TITLES.test(words[0])) words.shift();
  const last = words.length > 1 ? words[words.length - 1] : words[0];
  const first = words.slice(0, -1).join(" ");
  return {
    ...f,
    last,
    first,
    subtitle: f.department ? `${f.designation} of ${f.department}` : f.designation,
    haystack: [f.name, f.designation, f.department, f.school, ...f.research_interests, ...f.courses_taught, f.biography]
      .join(" ")
      .toLowerCase(),
  };
}
const byName = (a: Row, b: Row): number =>
  a.last.localeCompare(b.last, "en", { sensitivity: "base" }) || a.first.localeCompare(b.first, "en", { sensitivity: "base" });

/* ---------- state & elements ---------- */
const list = $("#list");
const alpha = $("#alpha");
const q = $<HTMLInputElement>("#q");
const school = $<HTMLSelectElement>("#school");
const area = $<HTMLSelectElement>("#area");
let rows: Row[] = [];
let letter = "All";
let page = 1;

/* ---------- loading / error states ---------- */
function showSkeleton(): void {
  list.setAttribute("aria-busy", "true");
  $("#pagerRow").hidden = true;
  list.innerHTML = Array.from(
    { length: 5 },
    () => `<li class="row skel" aria-hidden="true"><div class="photo"></div><div class="info"><div class="l n"></div><div class="l t"></div><div class="l v"></div></div></li>`,
  ).join("");
}
function showError(): void {
  list.removeAttribute("aria-busy");
  $("#pagerRow").hidden = true;
  list.innerHTML = `<li class="state" role="alert"><p>We couldn&rsquo;t load the faculty directory. Please check your connection and try again.</p><button type="button" class="retry">Try again</button></li>`;
}

/* ---------- filtering ---------- */
function baseRows(): Row[] {
  const term = q.value.trim().toLowerCase();
  return rows.filter(
    (r) => (!school.value || r.school === school.value) && (!area.value || r.department === area.value) && (!term || r.haystack.includes(term)),
  );
}
function fillSchools(): void {
  const schools = [...new Set(rows.map((r) => r.school).filter(Boolean))].sort();
  school.innerHTML = `<option value="">All Schools</option>` + schools.map((s) => `<option>${esc(s)}</option>`).join("");
  fillAreas();
}
function fillAreas(): void {
  const keep = area.value;
  const depts = [...new Set(rows.filter((r) => !school.value || r.school === school.value).map((r) => r.department).filter(Boolean))].sort();
  area.innerHTML = `<option value="">All Teaching Areas</option>` + depts.map((d) => `<option>${esc(d)}</option>`).join("");
  area.value = depts.includes(keep) ? keep : "";
}

/* ---------- rendering ---------- */
function pageList(c: number, n: number): (number | "…")[] {
  if (n <= 9) return Array.from({ length: n }, (_, i) => i + 1);
  const keep = [...new Set([1, 2, c - 1, c, c + 1, n - 1, n].filter((p) => p >= 1 && p <= n))].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  keep.forEach((p, i) => {
    if (i && p - keep[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

function renderPager(total: number, pages: number): void {
  const row = $("#pagerRow");
  if (!total) {
    row.hidden = true;
    return;
  }
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  $("#pagerInfo").innerHTML = `Showing <b>${from}</b> to <b>${to}</b> of <b>${total}</b> results`;
  const ul = $("#pager");
  const nav = ul.parentElement as HTMLElement;
  nav.hidden = pages < 2;
  if (pages >= 2) {
    const arrow = (ch: string, label: string, p: number, off: boolean): string =>
      off
        ? `<li class="page-item disabled" aria-disabled="true"><span class="page-link" aria-hidden="true">${ch}</span></li>`
        : `<li class="page-item"><button type="button" class="page-link" data-p="${p}" aria-label="${label}">${ch}</button></li>`;
    ul.innerHTML =
      arrow("&lsaquo;", "Previous page", page - 1, page === 1) +
      pageList(page, pages)
        .map((p) =>
          p === "…"
            ? `<li class="page-item dots far" aria-hidden="true"><span class="page-link">&hellip;</span></li>`
            : p === page
              ? `<li class="page-item active" aria-current="page"><span class="page-link">${p}</span></li>`
              : `<li class="page-item${Math.abs(p - page) > 1 ? " far" : ""}"><button type="button" class="page-link" data-p="${p}" aria-label="Page ${p}">${p}</button></li>`,
        )
        .join("") +
      arrow("&rsaquo;", "Next page", page + 1, page === pages);
  }
  row.hidden = false;
}

function render(): void {
  list.removeAttribute("aria-busy");
  const base = baseRows();
  // A-Z strip: dim letters that would give no results with the other filters applied.
  const available = new Set(base.map((r) => r.last.charAt(0).toUpperCase()));
  const buttons = [...alpha.children] as HTMLButtonElement[];
  if (letter !== "All" && !available.has(letter)) letter = "All";
  buttons.forEach((b) => {
    const l = b.textContent ?? "";
    b.disabled = l !== "All" && !available.has(l);
    b.setAttribute("aria-pressed", String(l === letter));
  });

  const items = letter === "All" ? base : base.filter((r) => r.last.toUpperCase().startsWith(letter));
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  page = Math.min(Math.max(1, page), pages);

  list.innerHTML = items.length
    ? items
        .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
        .map(
          (f) => `<li class="row"><div class="photo">${
            f.photo_url ? `<img src="${esc(f.photo_url)}" alt="Portrait of ${esc(f.name)}" width="130" height="137" loading="lazy" decoding="async">` : ""
          }</div><div class="info"><h3 class="name">${esc(f.name)}</h3><p class="title">${esc(f.subtitle)}</p><a class="view" href="${profileUrl(f.id)}" aria-label="View profile of ${esc(f.name)}">View Profile &rsaquo;</a></div></li>`,
        )
        .join("")
    : `<li class="empty">No faculty match your search.</li>`;
  // a photo that fails to load falls back to the plain gray box
  list.querySelectorAll("img").forEach((img) => img.addEventListener("error", () => img.remove(), { once: true }));
  renderPager(items.length, pages);
}

const reset = (): void => {
  page = 1;
  render();
};

/* ---------- data ---------- */
async function load(): Promise<void> {
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

/* ---------- wiring ---------- */
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
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-p]");
  if (!b) return;
  page = Number(b.dataset.p);
  render();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  $('section[aria-label="Faculty results"]').scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  list.focus({ preventScroll: true });
});
list.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest(".retry")) void load();
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
