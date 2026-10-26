import { $ } from "./dom";

/** Header (mobile menu) and footer behaviour shared by every page. */
export function initShell(): void {
  setupMenu();
  $<HTMLImageElement>(".f-logo img").src = $<HTMLImageElement>(".brand img").src;
  $("#yr").textContent = String(new Date().getFullYear());
}

/** The mobile menu is built from the same lists as the desktop header, so they cannot drift apart. */
function setupMenu(): void {
  const mega = $("#mega");
  const main = $(".hdr-nav > ul");
  const util = $(".util-nav");
  const m = document.createElement("ul");
  m.className = "m-nav";
  m.append(util.querySelector(".ql")!.cloneNode(true), ...[...main.children].map((l) => l.cloneNode(true)));
  const mu = document.createElement("ul");
  mu.className = "m-util";
  [...util.children].filter((l) => !l.matches(".ql,.sr")).forEach((l) => mu.append(l.cloneNode(true)));
  mega.prepend(m, mu);
  mega.querySelectorAll<HTMLElement>("li.has-sub").forEach((li) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tg";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Toggle submenu");
    const a = li.firstElementChild as HTMLAnchorElement;
    a.after(btn);
    const toggle = (e: Event): void => {
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
