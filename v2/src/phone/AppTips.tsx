// Guide de prise en main : à la 1re ouverture d'une app (par navigateur), une bulle rappelle quoi
// toucher pour modifier. Seulement pour qui peut modifier ce téléphone.
import { useState } from "react";
import { useCanEdit } from "../data/hooks";

const GENERIC = ["Appui long (ou clic droit) sur un élément pour le modifier ou le supprimer.", "Le bouton « + », quand il y en a un, ajoute un élément."];
const TIPS: Record<string, string[]> = {
  messages: ["Le bouton du nom, à côté du champ de saisie, change qui envoie le message.", "Appui long sur une bulle pour la modifier ou la supprimer."],
  notes: ["« + » crée une note ; touche une note pour l'écrire.", "La corbeille, dans une note ouverte, la supprime."],
};
const KEY = (app: string) => `uma-v2-tip-${app}`;
const seen = (app: string) => { try { return localStorage.getItem(KEY(app)) === "1"; } catch { return true; } };

export function AppTips({ pid, app }: { pid: string; app: string }) {
  const canEdit = useCanEdit(pid);
  const [open, setOpen] = useState(() => !seen(app));
  if (!canEdit || !open) return null;
  const close = () => { setOpen(false); try { localStorage.setItem(KEY(app), "1"); } catch { /* rien */ } };
  return (
    <div className="app-tip" role="note">
      <ul>{(TIPS[app] ?? GENERIC).map((t) => <li key={t}>{t}</li>)}</ul>
      <button type="button" onClick={close}>Compris</button>
    </div>
  );
}
