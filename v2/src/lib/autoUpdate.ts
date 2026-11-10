// Mise à jour automatique : un onglet resté ouvert garde l'ancienne version du site après un
// déploiement (ex. pas de notifs). On compare le script de la page servie avec celui chargé, au
// retour sur l'onglet et toutes les 2 minutes ; nouvelle version → rechargement, sauf pendant une saisie.
const SCRIPT = /\/assets\/index-[\w-]+\.js/;

const current = () => [...document.scripts].map((s) => s.src.match(SCRIPT)?.[0]).find(Boolean) ?? null;

const typing = () => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

export function installAutoUpdate() {
  const mine = current();
  if (!mine) return; // dev (Vite) : pas de bundle à comparer
  let pending = false;
  const check = async () => {
    if (!pending) {
      try {
        const html = await (await fetch("/", { cache: "no-store" })).text();
        const served = html.match(SCRIPT)?.[0];
        pending = !!served && served !== mine;
      } catch { return; }
    }
    if (pending && !typing()) location.reload();
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
  window.addEventListener("focus", check);
  setInterval(check, 120_000);
}
