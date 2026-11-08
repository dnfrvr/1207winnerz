// Twitter pour iPhone 5 (2012) : barre claire, onglets Accueil / Connecter / Découvrir / Moi,
// fil mêlant les tweets des 4 persos (partagés) et le fil « décor » propre au téléphone.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { loreNowMs, loreToMs, msToLore } from "../lib/loreTime";
import { StatusBar } from "../phone/IOSChrome";
import { LORE_DATE_DEFAULT, useOS } from "../phone/common";
import { Avatar, Empty, useEditor } from "../kit/kit";
import { Icon } from "../kit/icons";
import { img } from "../lib/img";
import { compact, pickLocal, useChars, type CharInfo } from "./social";
import "./social.css";

type Tweet = { author?: string; name?: string; h?: string; av?: string; text?: string; time?: string; rt?: number; fav?: number; rp?: number; order?: number; deleted?: boolean };
type TwUser = { char?: string; h?: string; name?: string; av?: string; bannerImg?: string; bio?: string };

const ago = (time: string | undefined, now: number) => {
  const t = loreToMs(time);
  if (t === null) return time ?? "";
  const m = Math.max(0, Math.round((now - t) / 60000));
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};

export default function TwitterApp({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const chars = useChars();
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const now = loreNowMs(lore);
  const shared = useList<Tweet>("feeds/tweets");
  const decor = useList<Tweet>(`phones/${pid}/data/homeBaseTweets`);
  const users = useValue<Record<string, TwUser>>("shared/twitterUsers") ?? {};
  const [tab, setTab] = useState("home");
  const [compose, setCompose] = useState(false);
  const ed = useEditor(pid);
  const me = chars[pid];
  const myUser = Object.values(users).find((u) => u?.char === pid);

  const who = (t: Tweet): { name: string; h: string; av?: string } => {
    if (t.author && chars[t.author]) { const c: CharInfo = chars[t.author]; return { name: c.twName ?? c.name, h: c.tw ?? `@${c.first.toLowerCase()}`, av: pickLocal(c.twAv, c.avatar) }; }
    return { name: t.name ?? "", h: t.h ?? "", av: t.av && t.av.length > 2 ? t.av : undefined };
  };
  const all = [...shared.map(([id, t]) => ({ id, t, path: `feeds/tweets/${id}` })), ...decor.map(([id, t]) => ({ id, t, path: `phones/${pid}/data/homeBaseTweets/${id}` }))]
    .sort((a, b) => (loreToMs(b.t.time) ?? 0) - (loreToMs(a.t.time) ?? 0));
  const handle = (me?.tw ?? "").toLowerCase();
  const list = tab === "home" ? all : tab === "connect" ? all.filter(({ t }) => handle && (t.text ?? "").toLowerCase().includes(handle)) : tab === "me" ? all.filter(({ t }) => t.author === pid) : [];

  return (
    <div className={`app tw ${os}`}>
      <StatusBar />
      <div className="tw-bar">
        <button className="tw-ic" onClick={() => nav(`/${pid}/home`)} aria-label="Retour"><Icon name="back" size={20} /></button>
        <h1>{tab === "home" ? "Home" : tab === "connect" ? "Connect" : tab === "discover" ? "Discover" : "Me"}</h1>
        <button className="tw-ic" onClick={() => ed.canEdit && setCompose(true)} aria-label="Tweeter" disabled={!ed.canEdit}>✎</button>
      </div>
      <div className="tw-scroll">
        {tab === "me" && (
          <div className="tw-me" style={{ backgroundImage: myUser?.bannerImg ? `url(${img(myUser.bannerImg)})` : undefined }}>
            <Avatar src={pickLocal(me?.twAv, me?.avatar)} name={me?.name} size={64} round={false} />
            <b>{me?.twName ?? me?.name}</b><span>{me?.tw}</span>
            <div className="tw-counts"><span><b>{list.length}</b>TWEETS</span><span><b>{compact(312)}</b>FOLLOWING</span><span><b>{compact(1204)}</b>FOLLOWERS</span></div>
          </div>
        )}
        {tab === "discover" ? (
          <div className="tw-trends">
            <div className="tw-th">Trends · United States</div>
            {["#GameDay", "#UMAmoose", "Hurricane Sandy", "#Gangnam", "Call Me Maybe", "#Debates2012", "One Direction", "#TwilightBreakingDawn"].map((t) => <div key={t} className="tw-trend">{t}</div>)}
          </div>
        ) : list.map(({ t, path }) => {
          const w = who(t);
          return (
            <div key={path} className="tw-tweet" onContextMenu={(e) => { if (ed.canEdit && (t.author === pid || path.startsWith("phones/"))) { e.preventDefault(); ed.edit({ path, fields: t.author ? ["text", "time", "rp", "rt", "fav"] : ["name", "h", "text", "time", "rp", "rt", "fav"], title: "Tweet" }); } }}>
              <Avatar src={w.av} name={w.name} size={48} round={false} />
              <div className="tw-body">
                <div className="tw-head"><b>{w.name}</b><span>{w.h}</span><i>{ago(t.time, now)}</i></div>
                <p>{t.text}</p>
                <div className="tw-acts"><span>↩ {t.rp || ""}</span><span>⟲ {t.rt || ""}</span><span>★ {t.fav || ""}</span></div>
              </div>
            </div>
          );
        })}
        {tab !== "discover" && list.length === 0 && <Empty>{tab === "connect" ? "No mentions yet" : "No Tweets"}</Empty>}
      </div>
      <div className="tw-tabs">
        {[["home", "home", "Home"], ["connect", "chat", "Connect"], ["discover", "search", "Discover"], ["me", "person", "Me"]].map(([id, icon, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}><Icon name={icon as "home"} size={24} /><span>{label}</span></button>
        ))}
      </div>
      {compose && <Compose onClose={() => setCompose(false)} onSend={(text) => {
        const id = `t_${Date.now().toString(36)}`;
        ed.write({ [`feeds/tweets/${id}`]: { author: pid, text, time: msToLore(now), rp: 0, rt: 0, fav: 0, order: Date.now() } });
      }} />}
      {ed.ui}
    </div>
  );
}

function Compose({ onClose, onSend }: { onClose: () => void; onSend: (t: string) => void }) {
  const [t, setT] = useState("");
  return (
    <div className="tw-compose">
      <div className="tw-bar"><button className="tw-txt" onClick={onClose}>Cancel</button><h1>New Tweet</h1><button className="tw-txt send" disabled={!t.trim()} onClick={() => { onSend(t.trim()); onClose(); }}>Tweet</button></div>
      <textarea autoFocus value={t} maxLength={140} onChange={(e) => setT(e.target.value)} placeholder="What's happening?" />
      <div className="tw-left">{140 - t.length}</div>
    </div>
  );
}
