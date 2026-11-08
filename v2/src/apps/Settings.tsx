// Réglages iOS 6 (tableau groupé avec icônes, Wi-Fi, Bluetooth, Général › Informations)
// / Paramètres Android 4.1 (sections holo).
import { Route, Routes, useNavigate } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { AppFrame, BackButton } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { AddButton, Cell, Grouped, Section, Switch, useEditor } from "../kit/kit";
import "./settings.css";

type Net = { name?: string; secured?: boolean; current?: boolean; order?: number; deleted?: boolean };
type Dev = { name?: string; connected?: boolean; order?: number; deleted?: boolean };
type Prefs = { wifi?: boolean; bt?: boolean; airplane?: boolean };

const tile = (bg: string, glyph: string) => <span className="st-tile" style={{ background: bg }}>{glyph}</span>;

export default function SettingsApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<Root pid={pid} />} />
      <Route path="wifi" element={<Wifi pid={pid} />} />
      <Route path="bluetooth" element={<Bluetooth pid={pid} />} />
      <Route path="about" element={<About pid={pid} />} />
    </Routes>
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
  if (os === "android") return (
    <AppFrame title="Paramètres" left={<BackButton to={`/${pid}/home`} label="Accueil" />} bodyClass="st android">
      <Grouped>
        <Section title="Sans fil et réseaux">
          <Cell icon={<span className="st-ic">📶</span>} title="Wi-Fi" onClick={() => nav("wifi")} accessory={<Switch on={p.wifi} onChange={set && ((v) => set("wifi", v))} />} />
          <Cell icon={<span className="st-ic">ᛒ</span>} title="Bluetooth" onClick={() => nav("bluetooth")} accessory={<Switch on={p.bt} onChange={set && ((v) => set("bt", v))} />} />
          <Cell icon={<span className="st-ic">◔</span>} title="Consommation des données" />
          <Cell icon={<span className="st-ic">⋯</span>} title="Plus…" />
        </Section>
        <Section title="Appareil">
          <Cell icon={<span className="st-ic">🔊</span>} title="Son" /><Cell icon={<span className="st-ic">☀</span>} title="Affichage" />
          <Cell icon={<span className="st-ic">▤</span>} title="Stockage" /><Cell icon={<span className="st-ic">🔋</span>} title="Batterie" /><Cell icon={<span className="st-ic">▦</span>} title="Applications" />
        </Section>
        <Section title="Personnel">
          <Cell icon={<span className="st-ic">⌖</span>} title="Services de localisation" /><Cell icon={<span className="st-ic">🔒</span>} title="Sécurité" />
          <Cell icon={<span className="st-ic">A</span>} title="Langue et saisie" /><Cell icon={<span className="st-ic">↺</span>} title="Sauvegarder et réinitialiser" />
        </Section>
        <Section title="Système">
          <Cell icon={<span className="st-ic">◷</span>} title="Date et heure" /><Cell icon={<span className="st-ic">ⓘ</span>} title="À propos du téléphone" onClick={() => nav("about")} />
        </Section>
      </Grouped>
    </AppFrame>
  );
  return (
    <AppFrame title="Settings" left={<BackButton to={`/${pid}/home`} label="Accueil" />} bodyClass="st">
      <Grouped>
        <Section>
          <Cell icon={tile("linear-gradient(#ffa33a,#f07400)", "✈")} title="Airplane Mode" accessory={<Switch on={p.airplane} onChange={set && ((v) => set("airplane", v))} />} />
          <Cell icon={tile("linear-gradient(#4aa3f5,#1a6fd4)", "📶")} title="Wi-Fi" detail={p.wifi ? (current ?? "Not Connected") : "Off"} chevron onClick={() => nav("wifi")} />
          <Cell icon={tile("linear-gradient(#4aa3f5,#1a6fd4)", "ᛒ")} title="Bluetooth" detail={p.bt ? "On" : "Off"} chevron onClick={() => nav("bluetooth")} />
          <Cell icon={tile("linear-gradient(#7ad66a,#33a524)", "◉")} title="Cellular" chevron />
          <Cell icon={tile("linear-gradient(#7ad66a,#33a524)", "⇆")} title="Personal Hotspot" detail="Off" chevron />
          <Cell icon={tile("linear-gradient(#8e9aab,#5a6678)", "☏")} title="Carrier" detail="AT&T" chevron />
        </Section>
        <Section>
          <Cell icon={tile("linear-gradient(#ff6a6a,#e01a1a)", "◉")} title="Notifications" chevron />
          <Cell icon={tile("linear-gradient(#8e9aab,#5a6678)", "⚙")} title="General" chevron onClick={() => nav("about")} />
          <Cell icon={tile("linear-gradient(#ff6a6a,#e01a1a)", "🔊")} title="Sounds" chevron />
          <Cell icon={tile("linear-gradient(#4aa3f5,#1a6fd4)", "☀")} title="Brightness & Wallpaper" chevron />
          <Cell icon={tile("linear-gradient(#8e9aab,#5a6678)", "✋")} title="Privacy" chevron />
        </Section>
        <Section>
          <Cell icon={tile("linear-gradient(#9fd2ff,#3a8fe0)", "☁")} title="iCloud" chevron />
          <Cell icon={tile("linear-gradient(#4aa3f5,#1a6fd4)", "✉")} title="Mail, Contacts, Calendars" chevron />
          <Cell icon={tile("linear-gradient(#fff3a0,#f5c400)", "✎")} title="Notes" chevron />
          <Cell icon={tile("linear-gradient(#8ed97f,#33a524)", "☎")} title="Phone" chevron />
          <Cell icon={tile("linear-gradient(#8ed97f,#33a524)", "💬")} title="Messages" chevron />
          <Cell icon={tile("linear-gradient(#4aa3f5,#1a6fd4)", "🧭")} title="Safari" chevron />
          <Cell icon={tile("linear-gradient(#ff8fc9,#e0157f)", "♫")} title="Music" chevron />
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
    <AppFrame title={os === "ios" ? "Wi-Fi Networks" : "Wi-Fi"} left={<BackButton to={`/${pid}/settings`} label="Settings" />}
      right={<AddButton show={ed.canEdit} onClick={() => ed.add(path, { name: "", secured: true, current: false }, { title: "Réseau", fields })} />} bodyClass={`st ${os}`}>
      <Grouped>
        <Section><Cell title="Wi-Fi" accessory={<Switch on={p.wifi} onChange={set && ((v) => set("wifi", v))} />} /></Section>
        {p.wifi && (
          <Section title={os === "ios" ? "Choose a Network…" : "Réseaux"}>
            {nets.map(([id, n]) => (
              <Cell key={id} className={n.current ? "st-cur" : ""} title={n.name}
                icon={os === "ios" ? <span className="st-check">{n.current ? "✓" : ""}</span> : <span className="st-ic">📶</span>}
                subtitle={os === "android" ? (n.current ? "Connecté" : n.secured ? "Sécurisé par WPA2" : "Ouvert") : undefined}
                accessory={os === "ios" ? <span className="st-wifi">{n.secured ? "🔒" : ""}<b>≋</b><i className="st-disclose">›</i></span> : undefined}
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
          <Section title="Devices">
            {devs.map(([id, d]) => (
              <Cell key={id} title={d.name} detail={d.connected ? "Connected" : "Not Connected"} chevron={os === "ios"}
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
