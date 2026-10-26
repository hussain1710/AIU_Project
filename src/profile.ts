import { $, esc } from "./dom";
import { initShell } from "./shell";
import { loadFacultyById, NotFoundError } from "./api";
import type { Faculty } from "./types";

const head = $("#pHead");
const content = $("#pContent");
const navCard = $("#pNavCard");
const navList = $("#pNav");

const ICON_MAIL = `<svg viewBox="0 0 20 16" width="16" height="13" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="1" y="1" width="18" height="14" rx="2"/><path d="M1.5 2.5 10 9l8.5-6.5"/></svg>`;
const ICON_PIN = `<svg viewBox="0 0 12 16" width="11" height="15" fill="currentColor" aria-hidden="true"><path d="M6 0a6 6 0 0 0-6 6c0 4.2 6 10 6 10s6-5.800 6-10a6 6 0 0 0-6-6Zm0 8.500A2.500 2.500 0 1 1 6 3.500a2.500 2.500 0 0 1 0 5Z"/></svg>`;

/** The profile id comes from the address, e.g. profile.html?id=3 */
function readId(): number | null {
  const raw = new URLSearchParams(location.search).get("id");
  const n = Number(raw);
  return raw !== null && Number.isInteger(n) && n > 0 ? n : null;
}

interface Section {
  id: string;
  label: string;
  html: string;
}

function sections(f: Faculty): Section[] {
  const out: Section[] = [];
  if (f.education.length)
    out.push({
      id: "education",
      label: "Education",
      html: `<ul class="edu">${f.education
        .map((e) => `<li><p class="edu-t">${esc([e.degree, e.institution].filter(Boolean).join(", "))}</p>${e.year ? `<p class="edu-y">${e.year}</p>` : ""}</li>`)
        .join("")}</ul>`,
    });
  if (f.courses_taught.length)
    out.push({ id: "teaching", label: "Teaching Areas", html: `<ul class="tags">${f.courses_taught.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` });
  const research: string[] = [];
  if (f.research_interests.length)
    research.push(`<h3>Research Interests</h3><ul class="tags">${f.research_interests.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`);
  if (f.publications.length)
    research.push(
      `<h3>Publications</h3><ul class="pubs">${f.publications
        .map((p) => `<li><span>${esc(p.title)}</span>${p.year ? ` <em>(${p.year})</em>` : ""}</li>`)
        .join("")}</ul>`,
    );
  if (research.length) out.push({ id: "research", label: "Research &amp; Publications", html: research.join("") });
  return out;
}

function render(f: Faculty): void {
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
  head.querySelector("img")?.addEventListener("error", (e) => (e.target as HTMLElement).remove(), { once: true });

  const list = sections(f);
  content.removeAttribute("aria-busy");
  content.innerHTML = list.map((s) => `<section class="p-sec ${s.id}" id="${s.id}" aria-labelledby="${s.id}-h"><h2 id="${s.id}-h">${s.label}</h2>${s.html}</section>`).join("");
  navList.innerHTML = list.map((s) => `<li><a href="#${s.id}">${s.label}</a></li>`).join("");
  navCard.hidden = list.length < 2;
}

function showMessage(title: string, text: string): void {
  document.title = `${title} | American International University`;
  head.innerHTML = "";
  head.classList.remove("skel");
  head.removeAttribute("aria-hidden");
  navCard.hidden = true;
  content.removeAttribute("aria-busy");
  content.innerHTML = `<div class="state" role="alert"><h2>${title}</h2><p>${text}</p><a class="retry" href="index.html">Back to Faculty Directory</a></div>`;
}

async function load(): Promise<void> {
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
