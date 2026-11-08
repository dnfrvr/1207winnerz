// Composants « système » d'iOS 6 réutilisables : feuille d'actions (action sheet) et
// bulle d'édition (callout noir brillant au-dessus d'un élément). C'est l'interface d'édition
// de la v2 : moderne dans l'ergonomie, iOS 6 dans le dessin.
import { useEffect, useRef, type ReactNode } from "react";

export type SheetAction = { label: string; onPress: () => void; destructive?: boolean };

export function ActionSheet({ title, actions, onClose }: { title?: string; actions: SheetAction[]; onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="action-sheet" onClick={(e) => e.stopPropagation()}>
        {title && <div className="sheet-title">{title}</div>}
        {actions.map((a) => (
          <button key={a.label} className={`sheet-btn ${a.destructive ? "red" : ""}`} onClick={() => { onClose(); a.onPress(); }}>{a.label}</button>
        ))}
        <button className="sheet-btn cancel" onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}

/** Bulle noire d'iOS 6 (« Copier | Définir… »), positionnée au-dessus d'un point de l'écran. */
export function Callout({ x, y, items, onClose }: { x: number; y: number; items: SheetAction[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Garde la bulle dans l'écran (320 px de large).
    const parent = el.offsetParent as HTMLElement | null;
    const max = (parent?.clientWidth ?? 320) - el.offsetWidth - 4;
    el.style.left = `${Math.max(4, Math.min(max, x - el.offsetWidth / 2))}px`;
  }, [x]);
  return (
    <>
      <div className="callout-backdrop" onClick={onClose} />
      <div ref={ref} className="callout" style={{ top: Math.max(24, y - 46), left: x }}>
        {items.map((it, i) => (
          <button key={it.label} className={i ? "sep" : ""} onClick={() => { onClose(); it.onPress(); }}>{it.label}</button>
        ))}
      </div>
    </>
  );
}

/** Fenêtre de saisie façon UIAlertView (titre + champ + Annuler / OK). */
export function PromptAlert({ title, message, initial, placeholder, onOk, onClose, validate, type = "text", min, max }: {
  title: string; message?: ReactNode; initial: string; placeholder?: string; type?: string; min?: string; max?: string;
  onOk: (v: string) => void; onClose: () => void; validate?: (v: string) => boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);
  const submit = () => {
    const v = input.current?.value ?? "";
    if (validate && !validate(v)) { input.current?.classList.add("bad"); return; }
    onClose(); onOk(v);
  };
  return (
    <div className="sheet-backdrop center" onClick={onClose}>
      <form className="alert" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="alert-title">{title}</div>
        {message && <div className="alert-msg">{message}</div>}
        <input ref={input} type={type} min={min} max={max} defaultValue={initial} placeholder={placeholder} onInput={(e) => e.currentTarget.classList.remove("bad")} />
        <div className="alert-btns">
          <button type="button" onClick={onClose}>Annuler</button>
          <button type="submit" className="ok">OK</button>
        </div>
      </form>
    </div>
  );
}

/** Appui long (≈ 450 ms) sans gêner le défilement ni le clic simple. */
export function useLongPress(onLong: (x: number, y: number) => void, ms = 450) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  return {
    fired,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        fired.current = false;
        (e.nativeEvent as PointerEvent & { __lp?: boolean }).__lp = true; // géré ici : touchContextMenu l'ignore
        const host = (e.currentTarget as HTMLElement).closest(".screen") as HTMLElement | null;
        const r = host?.getBoundingClientRect();
        const scale = r && host ? r.width / host.offsetWidth : 1;
        const x = r ? (e.clientX - r.left) / scale : e.clientX, y = r ? (e.clientY - r.top) / scale : e.clientY;
        start.current = { x: e.clientX, y: e.clientY };
        clear();
        timer.current = setTimeout(() => { fired.current = true; onLong(x, y); }, ms);
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) clear();
      },
      onPointerUp: clear,
      onPointerCancel: clear,
      // Clic droit (ordinateur) = même menu que l'appui long (mobile).
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        clear();
        if (fired.current) return;
        const host = (e.currentTarget as HTMLElement).closest(".screen") as HTMLElement | null;
        const r = host?.getBoundingClientRect();
        const scale = r && host ? r.width / host.offsetWidth : 1;
        fired.current = true;
        onLong(r ? (e.clientX - r.left) / scale : e.clientX, r ? (e.clientY - r.top) / scale : e.clientY);
      },
    },
  };
}
