// Visite guidée à la 1re ouverture d'une app (par navigateur, seulement pour qui peut modifier) :
// l'écran s'assombrit sauf l'élément à toucher, un doigt fantôme y mime le geste, et une carte
// pointe dessus. Étape sans cible visible (élément dans un sous-écran) : carte en bas, sans flèche.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useCanEdit } from "../data/hooks";

/** [texte, ...cibles] ; cible = sélecteur CSS, ou « sélecteur|texte contenu ». « Maintiens… » = appui long.
 *  Cible préfixée « @ » : l'étape attend que l'élément apparaisse (ex. dans un fil ouvert) avant de s'afficher. */
type Step = [string, ...string[]];
const ADD = '[aria-label="Ajouter"]';
const TIPS: Record<string, Step[] | null> = {
  messages: [["Touche ce bouton pour démarrer une conversation.", '[aria-label="Nouveau message"]'], ["Maintiens une conversation pour la modifier ou la supprimer.", ".msg-row"], ["Ouvre une conversation pour la suite.", ".msg-row"],
    ["Touche ce bouton pour changer qui envoie le message.", "@.who-btn"], ["Maintiens une bulle pour la modifier ou la supprimer.", "@.bubble"]],
  notes: [["Touche « + » pour créer une note.", '[aria-label="Nouvelle note"]', '[aria-label="Nouveau mémo"]'], ["Touche une note pour l'écrire.", ".nt-memo"], ["Touche la corbeille pour supprimer la note.", '@[aria-label="Mettre à la corbeille"]', '@[aria-label="Supprimer"]']],
  photos: [["Touche « + » pour ajouter une photo.", ADD], ["Ouvre un album pour la suite."], ["Maintiens une photo pour la modifier ou la supprimer.", "@.ph-cell"]],
  music: [["Dans l'onglet Songs, touche « + » pour ajouter un morceau.", ADD], ["Maintiens un morceau ou une playlist pour le modifier."]],
  phone: [["Touche « + » pour ajouter un appel ou un contact, selon l'onglet.", ADD], ["Maintiens un appel, un message vocal ou un contact pour le modifier."]],
  calendar: [["Touche « + » pour ajouter un événement.", ADD], ["Maintiens un événement pour le modifier ou le supprimer."]],
  clock: [["Touche « + » pour ajouter une alarme ou une ville, selon l'onglet.", ADD], ["Maintiens une ville ou une alarme pour la modifier.", ".clk-row"]],
  weather: [["Touche le nom de la ville pour changer la température et le temps.", ".wx-top"], ["Touche un jour des prévisions pour le modifier.", ".wx-day"]],
  settings: [["Touche ici pour changer le fond d'écran.", ".k-cell|Wallpaper", ".k-cell|Affichage"], ["Touche ici pour changer la vidéo du viseur de l'appareil photo.", ".k-cell|Photos & Camera", ".k-cell|Appareil photo"], ["Dans Wi-Fi et Bluetooth, touche « + » pour ajouter un réseau ou un appareil.", ".k-cell|Wi-Fi"]],
  insta: [["Maintiens une publication pour la modifier ou la supprimer.", ".ig-post"], ["Sur ton profil, touche ce bouton pour ajouter une photo.", '@[aria-label="Nouvelle publication"]']],
  twitter: [["Touche ce bouton pour écrire un tweet.", '[aria-label="Tweeter"]'], ["Maintiens un tweet pour le modifier ou le supprimer.", ".tw-tweet"]],
  facebook: [["Maintiens une de tes publications pour la modifier.", ".fb-card"]],
  tumblr: [["Touche ce bouton pour publier un billet.", '[aria-label="Publier"]'], ["Maintiens un billet pour le modifier ou le supprimer.", ".tb-row"]],
  pinterest: [["Maintiens une épingle pour la modifier ou la supprimer.", ".pi-pin"]],
  youtube: [["Touche ce bouton pour ajouter une vidéo.", ADD], ["Maintiens une vidéo pour la modifier ou la supprimer.", ".yt-row"]],
  gmail: [["Touche une boîte pour voir ses mails.", ".k-cell"], ["Touche « + » pour ajouter un mail.", "@" + ADD], ["Maintiens un mail pour le modifier ou le supprimer.", "@.ml-row"], ["Touche « Modifier » pour changer ce mail.", '@[aria-label="Modifier"]']],
  safari: [["Maintiens un signet ou une page de l'historique pour le modifier."]],
  maps: [["Maintiens une épingle pour changer le lieu.", ".mp-pin"]],
  snapchat: [["Touche « + Snap » pour ajouter un snap.", ".sc-foot button"], ["Maintiens un snap pour le modifier ou le supprimer.", ".sc-row"]],
  groupme: [["Touche ce bouton pour créer un groupe.", '[aria-label="Nouveau groupe"]'], ["Maintiens un groupe pour le modifier ou le supprimer.", ".gm-row"]],
  starbucks: [["Touche « Edit » pour changer les étoiles et le solde de la carte.", ".barbtn|Edit"], ["Maintiens un achat ou un café favori pour le modifier."]],
  files: [["Touche « + » pour ajouter un fichier.", ADD], ["Touche ici pour créer un dossier.", ".fl-add"], ["Maintiens un fichier ou un dossier pour le modifier."]],
  grindr: [["Touche ton profil pour le modifier.", ".gr-me"], ["Maintiens un profil pour le modifier ou le supprimer.", ".gr-cell"]],
  nikeplus: [["Maintiens une course pour la modifier. Le crayon, en haut, change les totaux.", ".nk-run"]],
  soundcloud: [["Touche ce bouton pour ajouter un son.", '[aria-label="Nouveau son"]'], ["Maintiens un son ou le profil pour le modifier."]],
  inaturalist: [["Touche ce bouton pour ajouter une observation.", '[aria-label="Nouvelle observation"]'], ["Maintiens une observation pour la modifier.", ".inat-row"]],
  kindle: [["Touche « + » pour ajouter un livre.", "button|＋"], ["Maintiens un livre pour le modifier.", ".kd-book"]],
  wikipedia: [["Touche « + » pour ajouter un article.", "button|＋"], ["Maintiens un article pour le modifier.", ".wk-row"]],
  reddit: [["Touche « + » pour ajouter un post.", "button|＋"], ["Maintiens un post pour le modifier.", ".rd-post"]],
  vpn: [["L'interrupteur active ou coupe le VPN. Maintiens un serveur pour le modifier."]],
  camera: null,
  facetime: null,
  shazam: null,
  compass: [["Maintiens les coordonnées pour changer la position.", ".cmp-coord"]],
  passbook: [["Touche « + » pour ajouter une carte, puis maintiens-la pour la modifier."]],
  reminders: [["Touche « + » pour ajouter un rappel.", ADD], ["Touche la case pour cocher un rappel.", ".rm-check"], ["Maintiens un rappel pour le modifier.", ".rm-row"]],
  messenger: [["Touche le bouton en haut pour créer une conversation, puis maintiens-la pour la modifier."]],
  kik: [["Touche ce bouton pour démarrer une discussion.", '[aria-label="Nouvelle discussion"]'], ["Ouvre une discussion pour la suite."], ["Touche ce bouton pour changer qui envoie le message.", "@.kk-who"], ["Maintiens un message pour le modifier.", "@.kk-bubble"]],
  vine: [["Touche ce bouton pour ajouter une vidéo.", '[aria-label="Filmer"]'], ["Maintiens une vidéo pour la modifier.", ".vn-post"]],
  askfm: [["Maintiens le profil pour le modifier.", ".af2-prof"], ["Maintiens une question pour la modifier.", ".af2-qa"]],
  espn: [["Maintiens un score pour le modifier.", ".es2-row"]],
  polyvore: [["Maintiens un ensemble pour le modifier.", ".pv-set"]],
};
// Apps à deux noms (iOS / Android) ; les jeux se modifient tous pareil.
const ALIAS: Record<string, string> = { gallery: "photos", contacts: "phone", browser: "safari" };
for (const g of ["candycrush", "templerun", "angrybirds", "subwaysurf", "pou", "wordswfriends"]) TIPS[g] = [["Maintiens le menu du jeu pour changer la partie en cours.", ".gm-menu"]];
const GENERIC: Step[] = [["Maintiens un élément pour le modifier ou le supprimer."]];
const stepsFor = (app: string) => { const t = TIPS[ALIAS[app] ?? app]; return t === undefined ? GENERIC : t; };

// Progression gardée par app : une étape qui attend un sous-écran reprend à la prochaine ouverture.
const KEY = (app: string) => `uma-v2-tour-${app}`;
const saved = (app: string) => { try { return Number(localStorage.getItem(KEY(app)) ?? 0) || 0; } catch { return Infinity; } };
const save = (app: string, i: number) => { try { localStorage.setItem(KEY(app), String(i)); } catch { /* rien */ } };

type Box = { x: number; y: number; w: number; h: number; W: number; H: number };
/** Première cible visible dans l'app, en coordonnées de la visite (le téléphone peut être mis à l'échelle). */
function locate(tour: HTMLElement, targets: string[]): Box | null {
  const root = tour.parentElement; if (!root) return null;
  const R = tour.getBoundingClientRect(); const k = R.width / tour.offsetWidth || 1;
  for (const t of targets) {
    const [sel, text] = t.replace(/^@/, "").split("|");
    for (const el of root.querySelectorAll(sel)) {
      if (tour.contains(el) || (text && !el.textContent?.includes(text))) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || r.bottom <= R.top || r.top >= R.bottom) continue;
      // Vraiment visible : au centre, le premier élément sous la visite doit être la cible (pas une barre qui la cache).
      const hit = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find((e) => !tour.contains(e));
      if (!hit || !el.contains(hit)) continue;
      return { x: (r.left - R.left) / k, y: (r.top - R.top) / k, w: r.width / k, h: r.height / k, W: tour.offsetWidth, H: tour.offsetHeight };
    }
  }
  return null;
}

/** Voile sombre percé d'un trou arrondi autour de la cible (règle « evenodd »). */
function shade(tour: HTMLElement | null, b: Box | null, pad: number): string {
  const W = b?.W ?? tour?.offsetWidth ?? 2000, H = b?.H ?? tour?.offsetHeight ?? 2000;
  const outer = `M0 0H${W}V${H}H0Z`;
  if (!b) return outer;
  const x = b.x - pad, y = b.y - pad, w = b.w + pad * 2, h = b.h + pad * 2, r = Math.min(12, w / 2, h / 2);
  return `${outer}M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

export function AppTips({ pid, app }: { pid: string; app: string }) {
  const canEdit = useCanEdit(pid);
  const steps = stepsFor(app);
  const [i, setI] = useState(() => saved(app));
  const [box, setBox] = useState<Box | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const step = canEdit && steps ? steps[i] : undefined;
  const waits = !!step?.[1]?.startsWith("@");

  // L'app se charge et s'anime à l'ouverture : on suit la cible tant que l'étape est affichée.
  useLayoutEffect(() => {
    if (!step) return;
    const tick = () => {
      if (!ref.current) return;
      const b = locate(ref.current, step.slice(1));
      // Cible absente (app ouverte dans un fil, fil sans bouton d'expéditeur…) : on saute à une étape suivante dont la cible est visible.
      if (!b && step.length > 1 && steps) for (let j = i + 1; j < steps.length; j++) if (steps[j].length > 1 && locate(ref.current, steps[j].slice(1))) { setI(j); return; }
      setBox((o) => (JSON.stringify(o) === JSON.stringify(b) ? o : b));
    };
    tick(); const h = setInterval(tick, 250);
    return () => clearInterval(h);
  }, [step, waits, steps, i]);
  useEffect(() => { if (steps && i > 0) save(app, i); }, [i, steps, app]);

  // Étape « @ » sans sa cible à l'écran : rien d'affiché, mais l'élément reste monté pour la guetter.
  if (!step || !steps) return null;
  if (waits && !box) return <div className="at-tour waiting" ref={ref} aria-hidden />;
  const close = () => setI(steps.length);
  const hold = step[0].startsWith("Maintiens");
  const last = i === steps.length - 1;
  const pad = 6;
  // Carte sous la cible si elle est dans la moitié haute, sinon au-dessus ; la flèche vise son centre.
  const below = box ? box.y + box.h / 2 < box.H / 2 : false;
  const cx = box ? box.x + box.w / 2 : 0;
  const cardStyle = box
    ? { ...(below ? { top: box.y + box.h + pad + 12 } : { bottom: box.H - box.y + pad + 12 }), ["--ax" as string]: `${Math.min(box.W - 34, Math.max(34, cx)) - 12}px` }
    : undefined;
  return (
    <div className="at-tour" ref={ref} role="dialog" aria-label="Prise en main">
      <svg className="at-shade" aria-hidden><path d={shade(ref.current, box, pad)} /></svg>
      {box && <div className="at-spot" style={{ left: box.x - pad, top: box.y - pad, width: box.w + pad * 2, height: box.h + pad * 2 }} />}
      {box && <span key={`f${i}`} className={`at-finger ${hold ? "hold" : "tap"}`} style={{ left: cx, top: box.y + box.h / 2 }} aria-hidden />}
      <div key={i} className={`at-card ${box ? (below ? "below" : "above") : "free"}`} style={cardStyle}>
        {steps.length > 1 && <div className="at-progress" aria-hidden>{steps.map((_, k) => <i key={k} className={k <= i ? "on" : ""} />)}</div>}
        <p>{step[0]}</p>
        <div className="at-btns">
          {!last && <button type="button" className="skip" onClick={close}>Passer</button>}
          <button type="button" onClick={() => setI(i + 1)}>{last ? "Compris" : "Suivant"}</button>
        </div>
      </div>
    </div>
  );
}
