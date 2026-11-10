// Twitter pour iPhone 5 (sept. 2012) / Twitter pour Android 3.x (2012).
// iOS : barre grise claire, onglets du bas Home / Connect / Discover / Me (maison, @, #, profil).
// Android : barre d'action Holo claire (oiseau bleu) + onglets à icônes sous la barre.
// Le fil mêle les tweets des 4 persos (partagés) et le fil « décor » propre au téléphone.
import { useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { mdiAccount, mdiAt, mdiFeather, mdiHome, mdiMagnify, mdiPound, mdiRepeat, mdiReply, mdiStar } from "@mdi/js";
import { useList, useValue } from "../data/hooks";
import { loreNowMs, loreToMs, msToLore } from "../lib/loreTime";
import { AccountPage, ago, FollowList, useFollows, type Who } from "./follows";
import { StatusBar, BarBack } from "../phone/IOSChrome";
import { LORE_DATE_DEFAULT, useOS } from "../phone/common";
import { Avatar, Empty, useEditor } from "../kit/kit";
import { Brand, Glyph } from "../kit/glyph";
import { compact, Cover, HoloBar, HoloTabs, pickLocal, Press, useChars, type CharInfo } from "./social";
import "./social.css";

type Tweet = { author?: string; name?: string; h?: string; av?: string; text?: string; time?: string; rt?: number; fav?: number; rp?: number; order?: number; deleted?: boolean };
type TwUser = { char?: string; h?: string; name?: string; av?: string; bannerImg?: string; bio?: string; followers?: number; following?: number };

const TABS = [
  { id: "home", icon: mdiHome, label: "Home" },
  { id: "connect", icon: mdiAt, label: "Connect" },
  { id: "discover", icon: mdiPound, label: "Discover" },
  { id: "me", icon: mdiAccount, label: "Me" },
];

export default function TwitterApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<TwitterMain pid={pid} />} />
      <Route path="f" element={<FollowList pid={pid} net="twitter" />} />
      <Route path="f/:key" element={<AccountPage pid={pid} net="twitter" />} />
    </Routes>
  );
}

function TwitterMain({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const chars = useChars();
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const now = loreNowMs(lore);
  const shared = useList<Tweet>("feeds/tweets");
  const decor = useList<Tweet>(`phones/${pid}/data/homeBaseTweets`);
  const users = useValue<Record<string, TwUser>>("shared/twitterUsers") ?? {};
  const fol = useFollows(pid, "twitter");
  const [tab, setTabRaw] = useState(() => sessionStorage.getItem("tw-tab") ?? "home");
  const setTab = (t: string) => { setTabRaw(t); try { sessionStorage.setItem("tw-tab", t); } catch { /* rien */ } };
  const openAcc = (key: string) => nav(`/${pid}/twitter/f/${encodeURIComponent(key)}`);
  const [compose, setCompose] = useState(false);
  const ed = useEditor(pid);
  const me = chars[pid];
  const myKey = Object.keys(users).find((k) => users[k]?.char === pid);
  const myUser = myKey ? users[myKey] : undefined;

  type Item = { id: string; t: Tweet; path: string; acc?: Who; adopted?: boolean };
  const who = (t: Tweet, acc?: Who): { name: string; h: string; av?: string } => {
    if (acc) return { name: acc.name, h: acc.handle && !acc.handle.startsWith("@") ? `@${acc.handle}` : acc.handle, av: acc.avatar };
    if (t.author && chars[t.author]) { const c: CharInfo = chars[t.author]; return { name: c.twName ?? c.name, h: c.tw ?? `@${c.first.toLowerCase()}`, av: pickLocal(c.twAv, c.avatar) }; }
    return { name: t.name ?? "", h: t.h ?? "", av: t.av && t.av.length > 2 ? t.av : undefined };
  };
  const decorItems: Item[] = decor.flatMap(([id, t]) => {
    const owner = fol.decorOwner(t);
    if (owner === null) return []; // compte désabonné
    return [{ id, t, path: `phones/${pid}/data/homeBaseTweets/${id}`, acc: owner ? fol.whoOf(owner) : undefined, adopted: !!owner?.id }];
  });
  const all: Item[] = [...shared.map(([id, t]) => ({ id, t, path: `feeds/tweets/${id}` })), ...decorItems,
    ...fol.posts.map((x) => ({ id: x.key, t: x.post as Tweet, path: x.path, acc: x.who, adopted: true }))]
    .sort((a, b) => (loreToMs(b.t.time) ?? 0) - (loreToMs(a.t.time) ?? 0));
  const handle = (me?.tw ?? "").toLowerCase();
  const list = tab === "home" ? all : tab === "connect" ? all.filter(({ t }) => handle && (t.text ?? "").toLowerCase().includes(handle)) : tab === "me" ? all.filter(({ t }) => t.author === pid) : [];
  const title = TABS.find((t) => t.id === tab)?.label ?? "";
  const editMe = myKey ? () => ed.edit({ path: `shared/twitterUsers/${myKey}`, fields: ["name", "h", "bio", "av", "bannerImg", "following", "followers"], title: "Profil Twitter" }) : undefined;

  return (
    <div className={`app tw ${os}`}>
      <StatusBar />
      {os === "android" ? (
        <>
          <HoloBar color="#f3f3f3" dark={false} onUp={() => nav(`/${pid}/home`)} icon={<Brand name="twitter" size={30} color />} title={title}
            actions={<>
              <button aria-label="Rechercher" onClick={() => setTab("discover")}><Glyph i={mdiMagnify} size={24} /></button>
              <button aria-label="Tweeter" disabled={!ed.canEdit} onClick={() => setCompose(true)}><Glyph i={mdiFeather} size={24} /></button>
            </>} />
          <HoloTabs tabs={TABS.map((t) => ({ id: t.id, icon: <Glyph i={t.icon} size={24} /> }))} active={tab} onChange={setTab} />
        </>
      ) : (
        <div className="tw-bar">
          <BarBack onClick={() => nav(`/${pid}/home`)} label="Accueil" tone="light" />
          <h1>{title}</h1>
          <button className="tw-ic" onClick={() => setCompose(true)} aria-label="Tweeter" disabled={!ed.canEdit}><Glyph i={mdiFeather} size={18} /></button>
        </div>
      )}
      <div className="tw-scroll">
        {tab === "me" && (
          <>
            <Press className="tw-me" onLong={ed.canEdit ? editMe : undefined}>
              <Cover src={myUser?.bannerImg} color={me?.accent ?? "#3a6d99"} className="tw-banner">
                <Avatar src={pickLocal(me?.twAv, me?.avatar)} name={me?.name} size={62} round={false} />
                <b>{me?.twName ?? me?.name}</b>
                <span>{me?.tw}</span>
                {myUser?.bio && <p>{myUser.bio}</p>}
              </Cover>
              <div className="tw-counts">
                <span><b>{list.length}</b>TWEETS</span>
                <button type="button" className="fo-count" onClick={(e) => { e.stopPropagation(); nav(`/${pid}/twitter/f`); }}><b>{compact(myUser?.following ?? 312)}</b>FOLLOWING</button>
                <span><b>{compact(myUser?.followers ?? 1204)}</b>FOLLOWERS</span>
              </div>
            </Press>
            <div className="tw-menu">
              <div className="fo-link" onClick={() => nav(`/${pid}/twitter/f`)}>Following<i>›</i></div><div>Direct Messages<i>›</i></div><div>Lists<i>›</i></div><div>Drafts<i>›</i></div>
            </div>
          </>
        )}
        {tab === "discover" ? (
          <div className="tw-trends">
            <div className="tw-search"><Glyph i={mdiMagnify} size={15} /><span>Search</span></div>
            <div className="tw-th">Trends · United States</div>
            {["#GameDay", "#UMAmoose", "Hurricane Sandy", "#Gangnam", "Call Me Maybe", "#Debates2012", "One Direction", "#TwilightBreakingDawn"].map((t) => <div key={t} className="tw-trend">{t}</div>)}
          </div>
        ) : list.map(({ t, path, acc, adopted }) => {
          const w = who(t, acc);
          const editable = ed.canEdit && (t.author === pid || path.startsWith("phones/"));
          const open = acc ? () => openAcc(acc.key) : undefined;
          const whoBtn = (child: React.ReactNode, cls = "") => open ? <button type="button" className={`fo-who ${cls}`} onClick={(e) => { e.stopPropagation(); open(); }}>{child}</button> : child;
          return (
            <Press key={path} className="tw-tweet" onLong={editable ? () => ed.edit({ path, fields: t.author || adopted ? ["text", "time", "rp", "rt", "fav"] : ["name", "h", "av", "text", "time", "rp", "rt", "fav"], title: "Tweet" }) : undefined}>
              {whoBtn(<Avatar src={w.av} name={w.name} size={48} round={false} />)}
              <div className="tw-body">
                <div className="tw-head">{whoBtn(<b>{w.name}</b>, "inline")}<span>{w.h}</span><i>{ago(t.time, now)}</i></div>
                <p>{t.text}</p>
                <div className="tw-acts">
                  <span><Glyph i={mdiReply} size={15} />{t.rp || ""}</span>
                  <span><Glyph i={mdiRepeat} size={15} />{t.rt || ""}</span>
                  <span className={t.fav ? "fav" : ""}><Glyph i={mdiStar} size={15} />{t.fav || ""}</span>
                </div>
              </div>
            </Press>
          );
        })}
        {tab !== "discover" && list.length === 0 && <Empty>{tab === "connect" ? "No mentions yet" : "No Tweets"}</Empty>}
      </div>
      {os === "ios" && (
        <div className="tw-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}><Glyph i={t.icon} size={26} /><span>{t.label}</span></button>
          ))}
        </div>
      )}
      {compose && <Compose os={os} onClose={() => setCompose(false)} onSend={(text) => {
        const id = `t_${Date.now().toString(36)}`;
        ed.write({ [`feeds/tweets/${id}`]: { author: pid, text, time: msToLore(now), rp: 0, rt: 0, fav: 0, order: Date.now() } });
      }} />}
      {ed.ui}
    </div>
  );
}

function Compose({ os, onClose, onSend }: { os: string; onClose: () => void; onSend: (t: string) => void }) {
  const [t, setT] = useState("");
  const send = () => { onSend(t.trim()); onClose(); };
  return (
    <div className={`tw-compose ${os}`}>
      {os === "android" ? (
        <HoloBar color="#f3f3f3" dark={false} onUp={onClose} icon={<Brand name="twitter" size={30} color />} title="Tweet"
          actions={<button className="tw-holo-send" disabled={!t.trim()} onClick={send}>TWEET</button>} />
      ) : (
        <div className="tw-bar"><button className="tw-txt" onClick={onClose}>Cancel</button><h1>New Tweet</h1><button className="tw-txt send" disabled={!t.trim()} onClick={send}>Tweet</button></div>
      )}
      <textarea autoFocus value={t} maxLength={140} onChange={(e) => setT(e.target.value)} placeholder="What's happening?" />
      <div className="tw-left">{140 - t.length}</div>
    </div>
  );
}
