// Réglages iOS 6 (tableau groupé avec icônes, Wi-Fi, Bluetooth, Général › Informations)
// / Paramètres Android 4.1 (sections holo).
import { useEffect, useRef, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { useCanEdit, useList, useValue, useWriter } from "../data/hooks";
import { deezerSearch, type DzTrack } from "../lib/deezer";
import { soundOn, type Ringtone, type SoundPrefs } from "../phone/sounds";
import { AppFrame, BackButton } from "../phone/IOSChrome";
import { ActionSheet } from "../phone/Sheets";
import { useOS } from "../phone/common";
import { AddButton, Cell, Grouped, Section, Switch, useEditor } from "../kit/kit";
import { Glyph } from "../kit/glyph";
import { img } from "../lib/img";
import { mdiAirplane, mdiAntenna, mdiApps, mdiBackupRestore, mdiBattery, mdiBluetooth, mdiBrightness6, mdiBrightness7, mdiCamera, mdiChartPie, mdiCheck, mdiClockOutline, mdiCloud, mdiCog, mdiCompass, mdiDatabase, mdiDotsHorizontal, mdiEmail, mdiFormatListBulleted, mdiHandBackRight, mdiInformationOutline, mdiLinkVariant, mdiLock, mdiLockOutline, mdiMapMarker, mdiMessageText, mdiMusic, mdiNoteText, mdiPhone, mdiPhoneClassic, mdiTranslate, mdiVolumeHigh, mdiWifi, mdiWifiStrength3, mdiWifiStrength3Lock } from "@mdi/js";
import "./settings.css";

type Net = { name?: string; secured?: boolean; current?: boolean; order?: number; deleted?: boolean };
type Dev = { name?: string; connected?: boolean; order?: number; deleted?: boolean };
type Prefs = { wifi?: boolean; bt?: boolean; airplane?: boolean };

// Tuile colorée d'iOS 6 (29 pt, coins arrondis, reflet) avec glyphe blanc.
const tile = (bg: string, glyph: string) => <span className="st-tile" style={{ background: bg }}><Glyph i={glyph} size={19} /></span>;
// Icône holo de Jelly Bean (glyphe gris clair).
const ic = (glyph: string) => <span className="st-ic"><Glyph i={glyph} size={24} /></span>;
const BLUE = "linear-gradient(#5aaaf7,#1f6fd8)", GREEN = "linear-gradient(#7fd66b,#2f9b22)", GREY = "linear-gradient(#9da7b4,#5d6877)", RED = "linear-gradient(#ff7272,#d41b1b)", ORANGE = "linear-gradient(#ffad45,#f07000)";

export default function SettingsApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<Root pid={pid} />} />
      <Route path="wifi" element={<Wifi pid={pid} />} />
      <Route path="bluetooth" element={<Bluetooth pid={pid} />} />
      <Route path="about" element={<About pid={pid} />} />
      <Route path="wallpaper" element={<Wallpaper pid={pid} />} />
      <Route path="wallpaper/pick" element={<WallpaperPick pid={pid} />} />
      <Route path="sounds" element={<Sounds pid={pid} />} />
      <Route path="sounds/ringtone" element={<RingtonePick pid={pid} />} />
      <Route path="camera" element={<CameraSettings pid={pid} />} />
    </Routes>
  );
}

/** Luminosité et fond d'écran (iOS 6) / Affichage (Android). Toucher un aperçu change ce fond-là ;
 *  « Camera Roll » / « Galerie » : on choisit une photo du téléphone, puis écran verrouillé, accueil ou les deux. */
type WpProfile = { wallpaper?: string; lockWallpaper?: string; brightness?: number };
function Wallpaper({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const ed = useEditor(pid);
  const prof = useValue<WpProfile>(`phones/${pid}/profile`) ?? {};
  const edit = (field: string, title: string) => ed.canEdit && ed.edit({ path: `phones/${pid}/profile`, fields: [field], title });
  const home = prof.wallpaper ? img(prof.wallpaper) : undefined;
  const lock = prof.lockWallpaper ? img(prof.lockWallpaper) : home;
  const ios = os === "ios";
  return (
    <AppFrame title={ios ? "Brightness & Wallpaper" : "Affichage"} left={<BackButton to={`/${pid}/settings`} label={ios ? "Settings" : "Paramètres"} />} bodyClass={`st ${os}`}>
      <Grouped>
        <Section title={ios ? undefined : "Luminosité"}>
          <Brightness pid={pid} value={prof.brightness ?? 1} canEdit={ed.canEdit} />
        </Section>
        <Section title={ios ? undefined : "Fond d'écran"}>
          <div className="st-wp">
            <button className="st-wp-prev lock" style={{ backgroundImage: lock && `url(${lock})` }} aria-label="Fond de l'écran verrouillé"
              onClick={() => edit("lockWallpaper", "Fond de l'écran verrouillé")}><i /></button>
            <button className="st-wp-prev" style={{ backgroundImage: home && `url(${home})` }} aria-label="Fond de l'écran d'accueil"
              onClick={() => edit("wallpaper", "Fond d'écran")}><b /></button>
          </div>
          {ed.canEdit && <Cell title={ios ? "Camera Roll" : "Galerie"} chevron onClick={() => nav("pick")} />}
        </Section>
      </Grouped>
      {ed.ui}
    </AppFrame>
  );
}

/** Curseur de luminosité ; enregistré au relâchement (une seule entrée d'historique). */
function Brightness({ pid, value, canEdit }: { pid: string; value: number; canEdit: boolean }) {
  const { set } = useWriter(pid);
  const [v, setV] = useState<number | null>(null);
  const save = () => { if (v !== null && v !== value) set(`phones/${pid}/profile/brightness`, v); setV(null); };
  return (
    <div className="st-bright">
      <Glyph i={mdiBrightness6} size={16} />
      <input type="range" min={0.25} max={1} step={0.01} value={v ?? value} disabled={!canEdit} aria-label="Luminosité"
        onChange={(e) => setV(Number(e.target.value))} onPointerUp={save} onKeyUp={save} onBlur={save} />
      <Glyph i={mdiBrightness7} size={22} />
    </div>
  );
}

/** Pellicule du téléphone → « Set Lock Screen / Set Home Screen / Set Both ». */
function WallpaperPick({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const photos = useList<{ src?: string }>(`phones/${pid}/data/gallery`).filter(([, p]) => p.src);
  const { write } = useWriter(pid);
  const [pick, setPick] = useState<string | null>(null);
  const ios = os === "ios";
  const apply = (fields: string[]) => { if (!pick) return; write(Object.fromEntries(fields.map((f) => [`phones/${pid}/profile/${f}`, pick]))); nav(`/${pid}/settings/wallpaper`); };
  return (
    <AppFrame title={ios ? "Camera Roll" : "Galerie"} left={<BackButton to={`/${pid}/settings/wallpaper`} label={ios ? "Wallpaper" : "Affichage"} />} bodyClass={`st ${os}`}>
      <div className="st-pick">
        {photos.map(([id, p]) => <button key={id} style={{ backgroundImage: `url(${img(p.src!)})` }} onClick={() => setPick(p.src!)} aria-label="Choisir cette photo" />)}
        {photos.length === 0 && <p className="st-pick-empty">{ios ? "No Photos" : "Aucune photo"}</p>}
      </div>
      {pick && (
        <ActionSheet onClose={() => setPick(null)} actions={[
          { label: ios ? "Set Lock Screen" : "Écran de verrouillage", onPress: () => apply(["lockWallpaper"]) },
          { label: ios ? "Set Home Screen" : "Écran d'accueil", onPress: () => apply(["wallpaper"]) },
          // « Les deux » : le fond verrouillé suit l'accueil (champ vidé).
          { label: ios ? "Set Both" : "Les deux", onPress: () => { apply(["wallpaper"]); write({ [`phones/${pid}/profile/lockWallpaper`]: null }); } },
        ]} />
      )}
    </AppFrame>
  );
}

/** Sounds (iOS 6) / Son (Android) : sonnerie (extrait Deezer), son des SMS, verrouillage, clavier. */
function Sounds({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const { set } = useWriter(pid);
  const canEdit = useCanEdit(pid);
  const prof = useValue<{ sounds?: SoundPrefs; ringtone?: Ringtone }>(`phones/${pid}/profile`) ?? {};
  const ios = os === "ios";
  const sw = (k: keyof SoundPrefs, title: string) => (
    <Cell title={title} accessory={<Switch on={soundOn(prof.sounds, k)} onChange={canEdit ? (v) => set(`phones/${pid}/profile/sounds/${k}`, v) : undefined} />} />
  );
  return (
    <AppFrame title={ios ? "Sounds" : "Son"} left={<BackButton to={`/${pid}/settings`} label={ios ? "Settings" : "Paramètres"} />} bodyClass={`st ${os}`}>
      <Grouped>
        <Section title={ios ? "Sounds and Vibration Patterns" : "Sonnerie et notifications"}>
          <Cell title={ios ? "Ringtone" : "Sonnerie du téléphone"} detail={prof.ringtone?.title || (ios ? "Marimba" : "Défaut")} chevron onClick={() => nav("ringtone")} />
          {sw("sms", ios ? "Text Tone" : "Son des notifications")}
        </Section>
        <Section title={ios ? undefined : "Système"}>
          {sw("lock", ios ? "Lock Sounds" : "Son du verrouillage")}
          {sw("keys", ios ? "Keyboard Clicks" : "Sons des touches")}
        </Section>
      </Grouped>
    </AppFrame>
  );
}

/** Choix de la sonnerie : sonnerie d'origine ou n'importe quelle chanson du catalogue Deezer (extrait de 30 s). */
function RingtonePick({ pid }: { pid: string }) {
  const os = useOS();
  const ios = os === "ios";
  const { set } = useWriter(pid);
  const canEdit = useCanEdit(pid);
  const cur = useValue<Ringtone>(`phones/${pid}/profile/ringtone`);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<DzTrack[] | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!q.trim()) { setRes(null); return; }
    const h = setTimeout(() => { void deezerSearch(q, 15).then(setRes); }, 350);
    return () => clearTimeout(h);
  }, [q]);
  useEffect(() => () => audio.current?.pause(), []);
  const listen = (url: string) => { audio.current?.pause(); if (url) { audio.current = new Audio(url); void audio.current.play().catch(() => {}); } };
  // Seuls titre et artiste sont enregistrés : l'URL de l'extrait est signée et expire.
  const pick = (d: DzTrack | null) => { listen(d?.preview ?? ""); if (canEdit) set(`phones/${pid}/profile/ringtone`, d ? { title: d.title, artist: d.artist } : null); };
  const check = <Glyph i={mdiCheck} size={18} />;
  return (
    <AppFrame title={ios ? "Ringtone" : "Sonnerie"} left={<BackButton to={`/${pid}/settings/sounds`} label={ios ? "Sounds" : "Son"} />} bodyClass={`st ${os}`}>
      <Grouped>
        <Section>
          <Cell title={ios ? "Marimba (Default)" : "Sonnerie par défaut"} accessory={!cur?.title ? check : undefined} onClick={() => pick(null)} />
          {cur?.title && <Cell title={cur.title} subtitle={cur.artist} accessory={check} />}
        </Section>
        <Section title="Deezer">
          <div className="st-dz"><Glyph i={mdiMusic} size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une chanson…" disabled={!canEdit} /></div>
          {res?.map((d, i) => <Cell key={i} title={d.title} subtitle={d.artist} image={d.cover || null} detail={d.duration} onClick={() => pick(d)} />)}
          {res && !res.length && <Cell title="Aucun résultat" dim />}
        </Section>
      </Grouped>
    </AppFrame>
  );
}

function VideoPreview({ src }: { src: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  if (broken === src) return <span className="st-wp-vid empty">Vidéo illisible ici (format HEVC d'iPhone ?) — renvoie-la en H.264</span>;
  return <video className="st-wp-vid" src={img(src)} autoPlay muted loop playsInline onError={() => setBroken(src)} />;
}

/** Photos & Camera (iOS 6) / Appareil photo (Android) : vidéo qui tourne dans le viseur. */
function CameraSettings({ pid }: { pid: string }) {
  const os = useOS();
  const ed = useEditor(pid);
  const prof = useValue<{ cameraVideo?: string }>(`phones/${pid}/profile`) ?? {};
  const edit = (field: string, title: string) => ed.edit({ path: `phones/${pid}/profile`, fields: [field], title });
  return (
    <AppFrame title={os === "ios" ? "Photos & Camera" : "Appareil photo"} left={<BackButton to={`/${pid}/settings`} label={os === "ios" ? "Settings" : "Paramètres"} />} bodyClass={`st ${os}`}>
      <Grouped>
        <Section footer="Vidéo qui tourne dans le viseur de l'appareil photo (courte, sans son).">
          <div className="st-wp">
            {prof.cameraVideo
              ? <VideoPreview src={prof.cameraVideo} />
              : <span className="st-wp-vid empty">Aucune vidéo</span>}
          </div>
          {ed.canEdit && <Cell title={os === "ios" ? "Camera Video" : "Vidéo du viseur"} detail={prof.cameraVideo ? "Modifier" : "Ajouter"} chevron onClick={() => edit("cameraVideo", "Vidéo de l'appareil photo")} />}
        </Section>
      </Grouped>
      {ed.ui}
    </AppFrame>
  );
}

function usePrefs(pid: string) {
  const p = useValue<Prefs>(`phones/${pid}/data/settings`) ?? {};
  const ed = useEditor(pid);
  return { p: { wifi: p.wifi ?? true, bt: p.bt ?? true, airplane: p.airplane ?? false }, set: ed.canEdit ? (k: keyof Prefs, v: boolean) => ed.write({ [`phones/${pid}/data/settings/${k}`]: v }) : undefined };
}

function Root({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const { p, set } = usePrefs(pid);
  const nets = useList<Net>(`phones/${pid}/data/wifiNetworks`);
  const current = nets.find(([, n]) => n.current)?.[1].name;
  // Lignes des apps : iOS 6 y affiche l'icône réelle de l'app en miniature.
  const appIcons = useValue<Record<string, string>>(`phones/${pid}/profile/appIcons`) ?? {};
  const appTile = (id: string, bg: string, glyph: string) => appIcons[id]
    ? <span className="st-tile st-app"><img src={img(appIcons[id])} alt="" /></span> : tile(bg, glyph);
  if (os === "android") return (
    <AppFrame title="Paramètres" left={<BackButton to={`/${pid}/home`} label="Accueil" />} bodyClass="st android">
      <Grouped>
        <Section title="Sans fil et réseaux">
          <Cell icon={ic(mdiWifi)} title="Wi-Fi" onClick={() => nav("wifi")} accessory={<Switch on={p.wifi} onChange={set && ((v) => set("wifi", v))} />} />
          <Cell icon={ic(mdiBluetooth)} title="Bluetooth" onClick={() => nav("bluetooth")} accessory={<Switch on={p.bt} onChange={set && ((v) => set("bt", v))} />} />
          <Cell icon={ic(mdiChartPie)} title="Consommation des données" />
          <Cell icon={ic(mdiDotsHorizontal)} title="Plus…" />
        </Section>
        <Section title="Appareil">
          <Cell icon={ic(mdiVolumeHigh)} title="Son" onClick={() => nav("sounds")} /><Cell icon={ic(mdiBrightness6)} title="Affichage" onClick={() => nav("wallpaper")} />
          <Cell icon={ic(mdiCamera)} title="Appareil photo" onClick={() => nav("camera")} />
          <Cell icon={ic(mdiDatabase)} title="Stockage" /><Cell icon={ic(mdiBattery)} title="Batterie" /><Cell icon={ic(mdiApps)} title="Applications" />
        </Section>
        <Section title="Personnel">
          <Cell icon={ic(mdiMapMarker)} title="Services de localisation" /><Cell icon={ic(mdiLock)} title="Sécurité" />
          <Cell icon={ic(mdiTranslate)} title="Langue et saisie" /><Cell icon={ic(mdiBackupRestore)} title="Sauvegarder et réinitialiser" />
        </Section>
        <Section title="Système">
          <Cell icon={ic(mdiClockOutline)} title="Date et heure" /><Cell icon={ic(mdiInformationOutline)} title="À propos du téléphone" onClick={() => nav("about")} />
        </Section>
      </Grouped>
    </AppFrame>
  );
  return (
    <AppFrame title="Settings" left={<BackButton to={`/${pid}/home`} label="Accueil" />} bodyClass="st">
      <Grouped>
        <Section>
          <Cell icon={tile(ORANGE, mdiAirplane)} title="Airplane Mode" accessory={<Switch on={p.airplane} onChange={set && ((v) => set("airplane", v))} />} />
          <Cell icon={tile(BLUE, mdiWifi)} title="Wi-Fi" detail={p.wifi ? (current ?? "Not Connected") : "Off"} chevron onClick={() => nav("wifi")} />
          <Cell icon={tile(BLUE, mdiBluetooth)} title="Bluetooth" detail={p.bt ? "On" : "Off"} chevron onClick={() => nav("bluetooth")} />
          <Cell icon={tile(GREEN, mdiAntenna)} title="Cellular" chevron />
          <Cell icon={tile(GREEN, mdiLinkVariant)} title="Personal Hotspot" detail="Off" chevron />
          <Cell icon={tile(GREEN, mdiPhoneClassic)} title="Carrier" detail="AT&T" chevron />
        </Section>
        <Section>
          <Cell icon={tile(RED, mdiFormatListBulleted)} title="Notifications" chevron />
          <Cell icon={tile(GREY, mdiCog)} title="General" chevron onClick={() => nav("about")} />
          <Cell icon={tile(RED, mdiVolumeHigh)} title="Sounds" chevron onClick={() => nav("sounds")} />
          <Cell icon={tile(BLUE, mdiBrightness7)} title="Brightness & Wallpaper" chevron onClick={() => nav("wallpaper")} />
          <Cell icon={tile(GREY, mdiHandBackRight)} title="Privacy" chevron />
        </Section>
        <Section>
          <Cell icon={tile("linear-gradient(#a9d8ff,#3d93e6)", mdiCloud)} title="iCloud" chevron />
          <Cell icon={tile(BLUE, mdiEmail)} title="Mail, Contacts, Calendars" chevron />
          <Cell icon={appTile("notes", "linear-gradient(#ffe66a,#e9b800)", mdiNoteText)} title="Notes" chevron />
          <Cell icon={appTile("phone", GREEN, mdiPhone)} title="Phone" chevron />
          <Cell icon={appTile("messages", GREEN, mdiMessageText)} title="Messages" chevron />
          <Cell icon={appTile("safari", BLUE, mdiCompass)} title="Safari" chevron />
          <Cell icon={appTile("music", ORANGE, mdiMusic)} title="Music" chevron />
          <Cell icon={appTile("photos", GREY, mdiCamera)} title="Photos & Camera" chevron onClick={() => nav("camera")} />
        </Section>
      </Grouped>
    </AppFrame>
  );
}

function Wifi({ pid }: { pid: string }) {
  const os = useOS();
  const nets = useList<Net>(`phones/${pid}/data/wifiNetworks`);
  const { p, set } = usePrefs(pid);
  const ed = useEditor(pid);
  const path = `phones/${pid}/data/wifiNetworks`;
  const fields = ["name", "secured", "current"];
  return (
    <AppFrame title="Wi-Fi" left={<BackButton to={`/${pid}/settings`} label="Settings" />}
      right={<AddButton show={ed.canEdit} onClick={() => ed.add(path, { name: "", secured: true, current: false }, { title: "Réseau", fields })} />} bodyClass={`st ${os}`}>
      <Grouped>
        <Section><Cell title="Wi-Fi" accessory={<Switch on={p.wifi} onChange={set && ((v) => set("wifi", v))} />} /></Section>
        {p.wifi && (
          <Section title={os === "ios" ? "Choose a Network…" : "Réseaux"}>
            {nets.map(([id, n]) => (
              <Cell key={id} className={n.current ? "st-cur" : ""} title={n.name}
                icon={os === "ios" ? <span className="st-check">{n.current ? <Glyph i={mdiCheck} size={18} /> : ""}</span> : ic(n.secured ? mdiWifiStrength3Lock : mdiWifiStrength3)}
                subtitle={os === "android" ? (n.current ? "Connecté" : n.secured ? "Sécurisé par WPA2" : "Ouvert") : undefined}
                accessory={os === "ios" ? <span className="st-wifi">{n.secured && <Glyph i={mdiLockOutline} size={14} />}<Glyph i={mdiWifi} size={18} /><i className="st-disclose">›</i></span> : undefined}
                onClick={ed.canEdit ? () => { const patches: Record<string, boolean> = {}; for (const [k, x] of nets) if (x.current !== (k === id)) patches[`${path}/${k}/current`] = k === id; ed.write(patches); } : undefined}
                onLong={ed.itemLong(path, id, { label: n.name, fields })} />
            ))}
            <Cell title={os === "ios" ? "Other…" : "Ajouter un réseau"} chevron />
          </Section>
        )}
        <Section footer={os === "ios" ? "Known networks will be joined automatically. If no known networks are available, you will be asked before joining a new network." : undefined}>
          <Cell title={os === "ios" ? "Ask to Join Networks" : "Notification de réseau"} accessory={<Switch on={true} />} />
        </Section>
      </Grouped>
      {ed.ui}
    </AppFrame>
  );
}

function Bluetooth({ pid }: { pid: string }) {
  const os = useOS();
  const devs = useList<Dev>(`phones/${pid}/data/btDevices`);
  const { p, set } = usePrefs(pid);
  const ed = useEditor(pid);
  const path = `phones/${pid}/data/btDevices`;
  return (
    <AppFrame title="Bluetooth" left={<BackButton to={`/${pid}/settings`} label="Settings" />}
      right={<AddButton show={ed.canEdit} onClick={() => ed.add(path, { name: "", connected: false }, { title: "Appareil", fields: ["name", "connected"] })} />} bodyClass={`st ${os}`}>
      <Grouped>
        <Section footer={p.bt ? (os === "ios" ? `Now Discoverable as “${pid[0].toUpperCase() + pid.slice(1)}'s ${os === "ios" ? "iPhone" : "phone"}”.` : undefined) : undefined}>
          <Cell title="Bluetooth" accessory={<Switch on={p.bt} onChange={set && ((v) => set("bt", v))} />} />
        </Section>
        {p.bt && (
          <Section title={os === "ios" ? "Devices" : "Appareils associés"}>
            {devs.map(([id, d]) => (
              <Cell key={id} title={d.name} detail={os === "ios" ? (d.connected ? "Connected" : "Not Connected") : undefined} subtitle={os === "android" ? (d.connected ? "Connecté" : "Associé") : undefined} chevron={os === "ios"}
                onLong={ed.itemLong(path, id, { label: d.name, fields: ["name", "connected"] })} />
            ))}
          </Section>
        )}
      </Grouped>
      {ed.ui}
    </AppFrame>
  );
}

function About({ pid }: { pid: string }) {
  const os = useOS();
  const name = useValue<string>(`phones/${pid}/profile/name`) ?? pid;
  const songs = useList(`phones/${pid}/data/music`).length;
  const photos = useList(`phones/${pid}/data/gallery`).length;
  const first = name.split(" ")[0];
  return (
    <AppFrame title={os === "ios" ? "About" : "À propos du téléphone"} left={<BackButton to={`/${pid}/settings`} label={os === "ios" ? "General" : "Paramètres"} />} bodyClass={`st ${os}`}>
      <Grouped>
        <Section>
          <Cell title="Name" detail={`${first}'s ${os === "ios" ? "iPhone" : "Galaxy S"}`} />
          <Cell title="Network" detail="AT&T" />
          <Cell title="Songs" detail={songs} /><Cell title="Photos" detail={photos} />
          <Cell title="Capacity" detail={os === "ios" ? "13.6 GB" : "16 GB"} /><Cell title="Available" detail={os === "ios" ? "2.1 GB" : "3.4 GB"} />
          <Cell title="Version" detail={os === "ios" ? "6.0.1 (10A523)" : "Android 4.1.2"} />
          <Cell title="Model" detail={os === "ios" ? "MD297LL/A" : "GT-I9000"} />
        </Section>
      </Grouped>
    </AppFrame>
  );
}
