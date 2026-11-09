// Easter egg de la v1 : des ballons rouges (et quelques clowns) s'envolent du bas de l'écran du
// téléphone. Branché sur des boutons décoratifs, qui ne créent ni ne modifient rien.
const pick = () => (Math.random() < 0.75 ? "🎈" : "🤡");

export function balloons(from: Element | null) {
  const screen = from?.closest(".screen");
  if (!screen || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.createElement("div");
  layer.className = "balloons";
  layer.setAttribute("aria-hidden", "true");
  let last = 0;
  for (let i = 0; i < 24; i++) {
    const b = document.createElement("span");
    const dur = 3200 + Math.random() * 2000, delay = Math.random() * 1800;
    last = Math.max(last, dur + delay);
    b.style.cssText = `left:${2 + Math.random() * 88}%;font-size:${18 + Math.random() * 18}px;animation-duration:${dur}ms;animation-delay:${delay}ms`;
    const inner = document.createElement("i");
    inner.textContent = pick();
    inner.style.cssText = `animation-duration:${900 + Math.random() * 900}ms;animation-delay:${delay}ms;--w:${(Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 12)}px`;
    b.append(inner);
    layer.append(b);
  }
  screen.append(layer);
  setTimeout(() => layer.remove(), last + 300);
}
