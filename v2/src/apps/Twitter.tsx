// Twitter pour iPhone 5 (sept. 2012) / Twitter pour Android 3.x (2012).
// iOS : barre grise claire, onglets du bas Home / Connect / Discover / Me (maison, @, #, profil).
// Android : barre d'action Holo claire (oiseau bleu) + onglets à icônes sous la barre.
// Le fil mêle les tweets des 4 persos (partagés) et le fil « décor » propre au téléphone.
// Chaque tweet se retweete, se met en favori et reçoit des réponses (cf. tweetActions.tsx) ;
// toucher un tweet l'ouvre avec ses réponses.
import { useEffect, useState } from "react";
import { Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import { mdiAccount, mdiAt, mdiFeather, mdiHome, mdiMagnify, mdiPound, mdiRepeat } from "@mdi/js";
import { useList, useValue } from "../data/hooks";
import { loreNowMs, loreToMs, msToLore } from "../lib/loreTime";
import { AccountPage, ago, FollowList, useFollows, type Who } from "./follows";
import { StatusBar, BarBack } from "../phone/IOSChrome";
import { LORE_DATE_DEFAULT, useOS } from "../phone/common";
import { Avatar, Empty, useEditor } from "../kit/kit";
import { Brand, Glyph } from "../kit/glyph";
import { compact, Cover, HoloBar, HoloTabs, pickLocal, Press, useChars, type CharInfo } from "./social";
import { Compose, ReplyUI, TweetActs, useTweetActions, type Target, type Tweet } from "./tweetActions";
import "./social.css";

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
  const [detail, setDetail] = useState<string | null>(null);
  // Notif « X replied / retweeted… » : ?t=chemin du tweet → on l'ouvre (avec ses réponses).
  const [params, setParams] = useSearchParams();
  const fromNotif = params.get("t");
  useEffect(() => { if (fromNotif) { setDetail(fromNotif); setParams({}, { replace: true }); } }, [fromNotif, setParams]);
  const ed = useEditor(pid);
  const acts = useTweetActions(pid);
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
  const title = detail ? "Tweet" : TABS.find((t) => t.id === tab)?.label ?? "";
  const editMe = myKey ? () => ed.edit({ path: `shared/twitterUsers/${myKey}`, fields: ["name", "h", "bio", "av", "bannerImg", "following", "followers"], title: "Profil Twitter" }) : undefined;
  const byPath = new Map(all.map((x) => [x.path, x]));

  /** Tweet réellement affiché : l'original pour un retweet (copie si l'original n'est pas sur ce téléphone). */
  const shown = (x: Item): { target: Target; acc?: Who; adopted?: boolean; rtBy?: string } => {
    if (x.t.rtOf) {
      const o = byPath.get(x.t.rtOf);
      const by = x.t.author && chars[x.t.author] ? (x.t.author === pid ? "You" : chars[x.t.author].twName ?? chars[x.t.author].name) : "";
      if (o) return { target: { path: o.path, t: o.t, who: who(o.t, o.acc) }, acc: o.acc, adopted: o.adopted, rtBy: by };
      const sn = x.t.rtSnap ?? {};
      return { target: { path: x.t.rtOf, t: { text: sn.text, time: sn.time }, who: { name: sn.name ?? "", h: sn.h ?? "", av: sn.av } }, rtBy: by };
    }
    return { target: { path: x.path, t: x.t, who: who(x.t, x.acc) }, acc: x.acc, adopted: x.adopted };
  };

  const renderTweet = (x: Item, opts: { big?: boolean } = {}) => {
    const { target, acc, adopted, rtBy } = shown(x);
    const { t, path } = target;
    const w = target.who;
    // Un retweet s'édite (ou se retire) depuis son original ; appui long sur le retweet = annuler le retweet.
    const editable = ed.canEdit && !x.t.rtOf && (t.author === pid || path.startsWith("phones/"));
    const open = acc ? () => openAcc(acc.key) : undefined;
    const whoBtn = (child: React.ReactNode, cls = "") => open ? <button type="button" className={`fo-who ${cls}`} onClick={(e) => { e.stopPropagation(); open(); }}>{child}</button> : child;
    const onLong = editable ? () => ed.sheet({ title: (t.text ?? "").slice(0, 40) || "Tweet", actions: [
        { label: "Modifier", onPress: () => ed.edit({ path, fields: t.author || adopted ? ["text", "time", "rp", "rt", "fav"] : ["name", "h", "av", "text", "time", "rp", "rt", "fav"], title: "Tweet" }) },
        { label: "Supprimer", destructive: true, onPress: () => { ed.write({ [`${path}/deleted`]: true }); if (detail === path) setDetail(null); } },
      ] })
      : ed.canEdit && x.t.rtOf && x.t.author === pid ? () => ed.sheet({ title: "Retweet", actions: [{ label: "Undo Retweet", destructive: true, onPress: () => acts.toggleRt(target) }] }) : undefined;
    return (
      <Press key={x.path} className={`tw-tweet ${opts.big ? "big" : ""}`} onClick={opts.big ? undefined : () => setDetail(path)} onLong={onLong}>
        {whoBtn(<Avatar src={w.av} name={w.name} size={48} round={false} />)}
        <div className="tw-body">
          {rtBy && <div className="tw-rtby"><Glyph i={mdiRepeat} size={12} />{rtBy === "You" ? "You retweeted" : `Retweeted by ${rtBy}`}</div>}
          <div className="tw-head">{whoBtn(<b>{w.name}</b>, "inline")}<span>{w.h}</span><i>{ago(t.time, now)}</i></div>
          {t.replyTo && t.replyToH && <div className="tw-inreply">in reply to {t.replyToH.startsWith("@") ? t.replyToH : `@${t.replyToH}`}</div>}
          <p>{t.text}</p>
          {opts.big && t.time && <div className="tw-when">{t.time}</div>}
          <TweetActs x={target} acts={acts} canAct={ed.canEdit} own={t.author === pid} />
        </div>
      </Press>
    );
  };

  const detailView = () => {
    const x = detail ? byPath.get(detail) : undefined;
    if (!x) return <Empty>Tweet introuvable</Empty>;
    const parent = x.t.replyTo ? byPath.get(x.t.replyTo) : undefined;
    const replies = all.filter((r) => r.t.replyTo === detail && !r.t.rtOf).sort((a, b) => (loreToMs(a.t.time) ?? 0) - (loreToMs(b.t.time) ?? 0));
    return (
      <>
        {parent && renderTweet(parent)}
        {renderTweet(x, { big: true })}
        {replies.length > 0 && <div className="tw-th">Replies</div>}
        {replies.map((r) => renderTweet(r))}
        {ed.canEdit && <button className="tw-replybtn" onClick={() => acts.reply(shown(x).target)}>Reply to {shown(x).target.who.name}…</button>}
      </>
    );
  };

  return (
    <div className={`app tw ${os}`}>
      <StatusBar />
      {os === "android" ? (
        <>
          <HoloBar color="#f3f3f3" dark={false} onUp={() => (detail ? setDetail(null) : nav(`/${pid}/home`))} icon={<Brand name="twitter" size={30} color />} title={title}
            actions={<>
              <button aria-label="Search" onClick={() => setTab("discover")}><Glyph i={mdiMagnify} size={24} /></button>
              <button aria-label="Tweet" disabled={!ed.canEdit} onClick={() => setCompose(true)}><Glyph i={mdiFeather} size={24} /></button>
            </>} />
          <HoloTabs tabs={TABS.map((t) => ({ id: t.id, icon: <Glyph i={t.icon} size={24} /> }))} active={tab} onChange={(id) => { setDetail(null); setTab(id); }} />
        </>
      ) : (
        <div className="tw-bar">
          <BarBack onClick={() => (detail ? setDetail(null) : nav(`/${pid}/home`))} label={detail ? "Back" : "Home"} tone="light" />
          <h1>{title}</h1>
          <button className="tw-ic" onClick={() => setCompose(true)} aria-label="Tweet" disabled={!ed.canEdit}><Glyph i={mdiFeather} size={18} /></button>
        </div>
      )}
      <div className="tw-scroll">
        {detail ? detailView() : <>
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
        ) : list.map((x) => renderTweet(x))}
        {tab !== "discover" && list.length === 0 && <Empty>{tab === "connect" ? "No mentions yet" : "No Tweets"}</Empty>}
        </>}
      </div>
      {os === "ios" && (
        <div className="tw-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id && !detail ? "on" : ""} onClick={() => { setDetail(null); setTab(t.id); }}><Glyph i={t.icon} size={26} /><span>{t.label}</span></button>
          ))}
        </div>
      )}
      {compose && <Compose os={os} onClose={() => setCompose(false)} onSend={(text) => {
        const id = `t_${Date.now().toString(36)}`;
        ed.write({ [`feeds/tweets/${id}`]: { author: pid, text, time: msToLore(now), rp: 0, rt: 0, fav: 0, order: Date.now() } });
      }} />}
      <ReplyUI acts={acts} os={os} />
      {ed.ui}
    </div>
  );
}
