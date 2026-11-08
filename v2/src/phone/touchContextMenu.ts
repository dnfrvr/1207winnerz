// Appui long tactile → événement « contextmenu » : les apps qui n'écoutent que le clic droit
// (onContextMenu) deviennent éditables au doigt, y compris sur iOS Safari qui ne l'émet pas.
// Les éléments gérés par useLongPress marquent l'événement (`__lp`) et sont ignorés ici.
const MS = 450;
let timer: ReturnType<typeof setTimeout> | null = null;
let start: { x: number; y: number } | null = null;
let firedAt = 0;
const clear = () => { if (timer) clearTimeout(timer); timer = null; start = null; };

export function installTouchContextMenu() {
  document.addEventListener("pointerdown", (e) => {
    clear();
    if (e.pointerType !== "touch" || (e as PointerEvent & { __lp?: boolean }).__lp) return;
    const target = e.target as Element;
    start = { x: e.clientX, y: e.clientY };
    const { clientX, clientY } = e;
    timer = setTimeout(() => {
      timer = null;
      firedAt = Date.now();
      target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX, clientY }));
    }, MS);
  });
  document.addEventListener("pointermove", (e) => { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) clear(); });
  document.addEventListener("pointerup", clear);
  document.addEventListener("pointercancel", clear);
  // Après un appui long : pas de clic au relâchement, ni de second menu natif (Android).
  const swallow = (e: Event) => { if (Date.now() - firedAt < 1000 && (e.type === "click" || e.isTrusted)) { e.preventDefault(); e.stopPropagation(); firedAt = e.type === "click" ? 0 : firedAt; } };
  document.addEventListener("click", swallow, true);
  document.addEventListener("contextmenu", swallow, true);
}
