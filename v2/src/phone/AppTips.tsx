// Guide de prise en main : à la 1re ouverture d'une app (par navigateur), une bulle rappelle quoi
// toucher pour modifier. Seulement pour qui peut modifier ce téléphone.
import { useState } from "react";
import { useCanEdit } from "../data/hooks";

// Une entrée par app, d'après ce qu'elle permet vraiment de modifier ; null = pas de bulle (rien à y modifier).
const LONG = "Appui long (ou clic droit)";
const GENERIC = [`${LONG} sur un élément pour le modifier ou le supprimer.`];
const TIPS: Record<string, string[] | null> = {
  messages: ["Le bouton en haut à droite démarre une conversation.", "Dans une conversation, le bouton du nom à côté du champ de saisie change qui envoie.", `${LONG} sur une bulle ou une conversation pour la modifier ou la supprimer.`],
  notes: ["« + » crée une note ; touche une note pour l'écrire.", "La corbeille, dans une note ouverte, la supprime."],
  photos: ["« + » crée un album.", `${LONG} sur une photo pour la modifier ou la supprimer.`],
  music: ["« + » (onglet Songs) ajoute un morceau.", `${LONG} sur un morceau ou une playlist pour le modifier.`],
  phone: ["« + » ajoute un contact.", `${LONG} sur un appel récent, un message vocal ou un contact pour le modifier.`],
  calendar: ["« + » ajoute un événement.", `${LONG} sur un événement pour le modifier ou le supprimer.`],
  clock: ["« + » ajoute une alarme ou une ville, selon l'onglet.", `${LONG} sur une alarme ou une ville pour la modifier.`],
  weather: ["Touche le nom de la ville pour changer la température et le temps.", "Touche un jour des prévisions pour le modifier."],
  settings: ["« Brightness & Wallpaper » (Android : « Affichage ») change le fond d'écran.", "« Photos & Camera » (Android : « Appareil photo ») change la vidéo du viseur.", "Dans Wi-Fi et Bluetooth, « + » ajoute un réseau ou un appareil."],
  insta: ["Sur le profil, le bouton « Nouvelle publication » ajoute une photo.", `${LONG} sur une publication pour la modifier ou la supprimer.`],
  twitter: ["Le bouton « Tweeter » écrit un tweet.", `${LONG} sur un tweet pour le modifier ou le supprimer.`],
  facebook: [`${LONG} sur une de ses propres publications pour la modifier.`],
  tumblr: ["Le bouton « Publier » ajoute un billet.", `${LONG} sur un billet pour le modifier ou le supprimer.`],
  pinterest: [`${LONG} sur une épingle pour la modifier ou la supprimer.`],
  youtube: ["Le bouton « Ajouter » ajoute une vidéo à la liste.", `${LONG} sur une vidéo pour la modifier ou la supprimer.`],
  gmail: ["Le bouton « Nouveau message » écrit un mail.", "Dans un mail ouvert, « Modifier » le change.", `${LONG} sur un mail de la liste pour le modifier ou le supprimer.`],
  safari: [`${LONG} sur un signet ou une page de l'historique pour le modifier.`],
  maps: [`${LONG} sur une épingle pour changer le lieu.`],
  snapchat: ["« + Snap » ajoute un snap.", `${LONG} sur un snap pour le modifier ou le supprimer.`],
  groupme: ["Le bouton « Nouveau groupe » crée une discussion.", `${LONG} sur un groupe pour le modifier ou le supprimer.`],
  starbucks: ["« Edit » change les étoiles et le solde de la carte.", `${LONG} sur un achat ou un café favori pour le modifier.`],
  files: ["« + » ajoute un fichier, « + Nouveau dossier » un dossier.", `${LONG} sur un fichier ou un dossier pour le modifier.`],
  grindr: ["« + » (grille) ajoute un profil ; touche ton profil pour le modifier.", `${LONG} sur un profil ou un message pour le modifier.`],
  nikeplus: ["Le crayon change les totaux.", `${LONG} sur une course pour la modifier.`],
  soundcloud: ["« + » ou « Record » ajoute un son.", `${LONG} sur un son ou sur le profil pour le modifier.`],
  inaturalist: ["Le bouton appareil photo ou « Observe » ajoute une observation.", `${LONG} sur une observation ou sur le profil pour la modifier.`],
  kindle: ["« + » ajoute un livre.", `${LONG} sur un livre pour le modifier.`],
  wikipedia: ["« + » ajoute un article.", `${LONG} sur un article pour le modifier.`],
  reddit: ["« + » ajoute un post.", `${LONG} sur un post pour le modifier.`],
  vpn: ["L'interrupteur active ou coupe le VPN.", `${LONG} sur un serveur pour le modifier.`],
  camera: null,
  facetime: null,
  shazam: null,
  compass: [`${LONG} sur les coordonnées pour changer la position.`],
  passbook: ["« + » ajoute une carte.", `${LONG} sur une carte pour la modifier.`],
  reminders: ["« + » ajoute un rappel ; touche la case pour le cocher.", `${LONG} sur un rappel pour le modifier.`],
  messenger: ["Le bouton en haut crée une conversation.", `${LONG} sur une conversation pour la modifier.`],
  kik: ["Le bouton « Nouvelle discussion » en crée une.", "Dans une discussion, le bouton du nom change qui envoie.", `${LONG} sur un message pour le modifier.`],
  vine: ["Le bouton « Filmer » ajoute une vidéo.", `${LONG} sur une vidéo pour la modifier.`],
  askfm: [`${LONG} sur le profil ou sur une question pour la modifier.`],
  espn: [`${LONG} sur un score pour le modifier.`],
  polyvore: [`${LONG} sur un ensemble pour le modifier.`],
};
// Les apps à deux noms (iOS / Android) partagent leur bulle ; les jeux, eux, se modifient tous pareil.
const ALIAS: Record<string, string> = { gallery: "photos", contacts: "phone", browser: "safari" };
const GAME = [`${LONG} sur le menu du jeu pour changer la partie en cours.`];
for (const g of ["candycrush", "templerun", "angrybirds", "subwaysurf", "pou", "wordswfriends"]) TIPS[g] = GAME;
const tipsFor = (app: string) => { const t = TIPS[ALIAS[app] ?? app]; return t === undefined ? GENERIC : t; };
const KEY = (app: string) => `uma-v2-tip-${app}`;
const seen = (app: string) => { try { return localStorage.getItem(KEY(app)) === "1"; } catch { return true; } };

export function AppTips({ pid, app }: { pid: string; app: string }) {
  const canEdit = useCanEdit(pid);
  const [open, setOpen] = useState(() => !seen(app));
  const tips = tipsFor(app);
  if (!canEdit || !open || !tips) return null;
  const close = () => { setOpen(false); try { localStorage.setItem(KEY(app), "1"); } catch { /* rien */ } };
  return (
    <div className="app-tip" role="note">
      <ul>{tips.map((t, i) => (
        <li key={t} style={{ animationDelay: `${0.25 + i * 0.15}s` }}>
          {/* petit doigt animé : appui long = anneau qui se remplit, sinon simple tape */}
          <span className={`tip-g ${t.startsWith(LONG) ? "hold" : "tap"}`} aria-hidden />{t}
        </li>
      ))}</ul>
      <button type="button" onClick={close}>Compris</button>
    </div>
  );
}
