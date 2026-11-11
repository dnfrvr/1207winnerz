// Titres des barres toujours entiers, sur une ligne, sans déborder : comme iOS, le titre prend
// toute la place entre les boutons, puis sa police rétrécit s'il ne tient toujours pas.
import { useEffect, useRef } from "react";

const TITLES = [
  ".navbar > h1", ".actionbar > h1", ".w12-bar > h1", ".kk-bar > h1", ".ig-bar > h1", ".gm-bar > h1",
  ".os-ios :is(.tw-bar, .tb-bar, .yt-bar, .sc-bar, .pb-bar, .msn-bar, .pi-bar, .vn-bar) > h1", ".os-ios .pb-top > span:first-of-type",
].join(", ");
const MIN_FONT = 11;
const GAP = 6;

function fit(h: HTMLElement) {
  const bar = h.parentElement;
  if (!bar || !h.offsetWidth) return;
  const pos = getComputedStyle(h).position;
  const b = bar.getBoundingClientRect(), mid = b.left + b.width / 2;
  const k = b.width / bar.offsetWidth || 1; // écran mis à l'échelle (plein écran mobile) → px CSS
  // Place réellement prise par les boutons de chaque côté → marge symétrique (titre centré sur la barre).
  let side = 0;
  for (const s of bar.children) {
    if (s === h || !(s instanceof HTMLElement) || !s.offsetWidth) continue;
    const r = s.getBoundingClientRect();
    side = Math.max(side, r.right <= mid ? r.right - b.left : r.left >= mid ? b.right - r.left : 0);
  }
  side = side / k + GAP;
  if (pos === "absolute") { h.style.left = h.style.right = `${side}px`; }
  else if (bar.classList.contains("navbar")) h.style.maxWidth = `${bar.offsetWidth - 2 * side}px`;
  // Rétrécir : un seul enfant (logo en px fixes) → zoom sur lui ; sinon la police du titre.
  const only = h.childNodes.length === 1 && h.firstElementChild instanceof HTMLElement ? h.firstElementChild : null;
  if (only) {
    only.style.zoom = "";
    if (h.scrollWidth > h.clientWidth + 0.5) only.style.zoom = String(Math.max(0.4, (h.clientWidth - 1) / h.scrollWidth));
    return;
  }
  h.style.fontSize = "";
  let fs = parseFloat(getComputedStyle(h).fontSize);
  while (h.scrollWidth > h.clientWidth + 0.5 && fs > MIN_FONT) { fs -= 0.5; h.style.fontSize = `${fs}px`; }
}

/** À poser dans l'écran du téléphone : ajuste ses titres de barre. */
export function FitTitles() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const screen = ref.current?.closest<HTMLElement>(".screen");
    return screen ? installFitTitles(screen) : undefined;
  }, []);
  return <span ref={ref} hidden />;
}

/** Ajuste les titres de l'écran maintenant et à chaque changement (regroupés en un passage). */
function installFitTitles(screen: HTMLElement) {
  let timer = 0;
  const run = () => { timer = 0; screen.querySelectorAll<HTMLElement>(TITLES).forEach(fit); };
  const queue = () => { if (!timer) timer = window.setTimeout(run, 0); };
  // Nos propres changements de style ne touchent que l'attribut style : on ne les observe pas.
  const mo = new MutationObserver(queue);
  mo.observe(screen, { childList: true, subtree: true, characterData: true });
  void document.fonts?.ready.then(queue);
  queue();
  return () => { mo.disconnect(); clearTimeout(timer); };
}
