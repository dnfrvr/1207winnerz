import { useRef } from "react";

/**
 * Glisser à la souris entre les pages d'un conteneur `overflow-x` + scroll-snap.
 * Le doigt marche déjà nativement ; sur PC la souris ne fait pas défiler, d'où ce hook.
 * Le clic sur une icône reste un clic tant qu'on n'a pas bougé de plus de 6 px.
 */
export function useDragPages() {
  const s = useRef<{ x: number; left: number; id: number; drag: boolean } | null>(null);
  const swallow = useRef(false);

  const end = (el: HTMLElement, dx: number) => {
    const w = el.clientWidth;
    const from = Math.round(s.current!.left / w);
    const to = Math.abs(dx) > w * 0.15 ? from + (dx < 0 ? 1 : -1) : from;
    const max = Math.round(el.scrollWidth / w) - 1;
    el.style.scrollSnapType = "";
    el.scrollTo({ left: Math.max(0, Math.min(max, to)) * w, behavior: "smooth" });
  };

  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      s.current = { x: e.clientX, left: e.currentTarget.scrollLeft, id: e.pointerId, drag: false };
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const st = s.current;
      if (!st || e.pointerId !== st.id) return;
      const dx = e.clientX - st.x;
      if (!st.drag) {
        if (Math.abs(dx) < 6) return;
        st.drag = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.style.scrollSnapType = "none";
      }
      e.currentTarget.scrollLeft = st.left - dx;
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const st = s.current;
      if (!st || e.pointerId !== st.id) return;
      if (st.drag) { swallow.current = true; end(e.currentTarget, e.clientX - st.x); }
      s.current = null;
    },
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
      if (s.current?.drag) end(e.currentTarget, 0);
      s.current = null;
    },
    // Après un glisser, le clic qui suit ne doit pas ouvrir l'app sous le curseur.
    onClickCapture: (e: React.MouseEvent) => {
      if (swallow.current) { swallow.current = false; e.stopPropagation(); e.preventDefault(); }
    },
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  };
}
