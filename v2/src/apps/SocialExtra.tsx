// Kik Messenger (iOS 6.x, fin 2012) et Vine (iOS 1.x, début 2013) : deux réseaux sociaux,
// avec leur DA d'époque et l'édition universelle (appui long / clic droit → Modifier, Ajouter
// après, Supprimer ; bouton + pour créer).
//   Kik  → phones/{pid}/data/kik/{discussion}            { name, avatar, time, unread }
//          phones/{pid}/data/kik/{discussion}/messages/* { from: "me" | "them", text, time, status: S | D | R }
//   Vine → phones/{pid}/data/vine/{post}                 { author?, name, handle, avatar, caption, src, likes, revines, comments, time }
//          phones/{pid}/data/vineProfile                  { name, bio, avatar, followers, following }
import { useEffect, useRef, useState } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { mdiAccount, mdiCamera, mdiChevronRight, mdiCommentOutline, mdiDotsHorizontal, mdiHeart, mdiHeartOutline, mdiHome, mdiMenu,
  mdiPencil, mdiPlus, mdiRepeat, mdiSwapHorizontal, mdiTrendingUp } from "@mdi/js";
import { useList, useValue, useWriter } from "../data/hooks";
import { img } from "../lib/img";
import { BarBack, StatusBar } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { Avatar, Empty, useEditor } from "../kit/kit";
import { Brand, Glyph } from "../kit/glyph";
import { compact, HoloBar, pickLocal, Press, useChars } from "./social";
import "./social.css";
import "./socialextra.css";

// ═══ Kik ═════════════════════════════════════════════════════════════════════
type KikMsg = { from?: string; text?: string; time?: string; status?: string; order?: number; deleted?: boolean };
type KikChat = { name?: string; avatar?: string; time?: string; unread?: number; last?: string; messages?: Record<string, KikMsg>; order?: number; deleted?: boolean };

const KIK_GREEN = "#82bc23";
const CHAT_FIELDS = ["name", "avatar", "time", "unread"];
const MSG_FIELDS = ["from", "text", "time", "status"];

/** Message d'accueil réel de Kik, affiché tant que la liste est vide. */
const KIK_TEAM: KikChat = { name: "Kik Team", time: "", messages: { w: { from: "them", text: "Welcome to Kik! Kik is the fastest, simplest way to chat with your friends. Tap the pencil to start a new chat.", order: 1 } } };

export function KikApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<KikList pid={pid} />} />
      <Route path="c/:id" element={<KikChatView pid={pid} />} />
    </Routes>
  );
}

const lastOf = (c: KikChat) => {
  const msgs = Object.values(c.messages ?? {}).filter((m) => m && !m.deleted).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return msgs[msgs.length - 1];
};

function KikBar({ title, onBack, backLabel, right }: { title?: React.ReactNode; onBack: () => void; backLabel: string; right?: React.ReactNode }) {
  const os = useOS();
  if (os === "android") return <HoloBar color={KIK_GREEN} onUp={onBack} icon={title ? undefined : <Brand name="kik" size={30} color="#fff" />} title={title ?? "Kik Messenger"} actions={right} />;
  return (
    <div className="kk-bar">
      <span className="kk-back"><BarBack onClick={onBack} label={backLabel} tone="light" /></span>
      <h1>{title ?? <Brand name="kik" size={44} color={KIK_GREEN} />}</h1>
      <span className="kk-side">{right}</span>
    </div>
  );
}

function KikList({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const path = `phones/${pid}/data/kik`;
  const chats = useList<KikChat>(path);
  const ed = useEditor(pid);
  const template = { name: "", avatar: "", time: "", unread: 0 };
  const newChat = () => ed.add(path, template, { atStart: true, title: "Nouvelle discussion", fields: CHAT_FIELDS });
  const rows: [string, KikChat][] = chats.length ? chats : [["__team", KIK_TEAM]];
  return (
    <div className={`app kk ${os}`}>
      <StatusBar />
      <KikBar onBack={() => nav(`/${pid}/home`)} backLabel="Home"
        right={ed.canEdit ? <button className="kk-btn icon" aria-label="Nouvelle discussion" onClick={newChat}><Glyph i={mdiPencil} size={os === "android" ? 22 : 17} /></button> : undefined} />
      {os === "ios" && <div className="kk-search"><span>Search</span></div>}
      <div className="kk-scroll">
        {rows.map(([id, c]) => {
          const last = lastOf(c);
          const preview = last?.text ?? c.last ?? "";
          return (
            <Press key={id} className="kk-row" onClick={() => nav(`c/${id}`)}
              onLong={id === "__team" ? undefined : ed.itemLong(path, id, { fields: CHAT_FIELDS, label: c.name, template })}>
              <Avatar src={c.avatar} name={c.name} size={46} color={id === "__team" ? KIK_GREEN : undefined} />
              <span className="kk-txt">
                <span className="kk-top"><b>{c.name || "Nouvelle discussion"}</b><i>{c.time ?? last?.time}</i></span>
                <span className="kk-prev">{last?.from === "me" && last.status && <em className={`kk-st ${last.status}`}>{last.status}</em>}{preview}</span>
              </span>
              {!!c.unread && <span className="kk-unread">{c.unread}</span>}
              {os === "ios" && <Glyph i={mdiChevronRight} size={18} className="kk-chev" />}
            </Press>
          );
        })}
      </div>
      {ed.ui}
    </div>
  );
}

function KikChatView({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const { id = "" } = useParams();
  const base = `phones/${pid}/data/kik/${id}`;
  const stored = useValue<KikChat>(id === "__team" ? null : base);
  const chat = id === "__team" ? KIK_TEAM : stored ?? {};
  const msgs = useList<KikMsg>(`${base}/messages`);
  const shown: [string, KikMsg][] = id === "__team" ? Object.entries(KIK_TEAM.messages ?? {}) : msgs;
  const ed = useEditor(pid);
  const { insert } = useWriter(pid);
  const [text, setText] = useState("");
  const [asThem, setAsThem] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [shown.length]);
  const editable = ed.canEdit && id !== "__team";
  const send = () => {
    if (!text.trim() || !editable) return;
    insert(`${base}/messages`, asThem ? { from: "them", text: text.trim(), time: "" } : { from: "me", text: text.trim(), time: "", status: "D" });
    setText("");
  };
  const lastMine = [...shown].reverse().find(([, m]) => m.from === "me")?.[0];
  const template = { from: "me", text: "", time: "", status: "R" };
  return (
    <div className={`app kk ${os}`}>
      <StatusBar />
      <KikBar title={chat.name || "Kik"} onBack={() => nav(`/${pid}/kik`)} backLabel="Chats"
        right={editable ? <button className="kk-btn icon" aria-label="Modifier la discussion" onClick={() => ed.edit({ path: base, fields: CHAT_FIELDS, title: "Discussion" })}><Glyph i={mdiDotsHorizontal} size={20} /></button> : undefined} />
      <div className="kk-scroll kk-thread">
        {shown.map(([mid, m], i) => {
          const me = m.from === "me";
          const prev = shown[i - 1]?.[1];
          return (
            <div key={mid} className={`kk-line ${me ? "me" : "them"}`}>
              {m.time && m.time !== prev?.time && <div className="kk-stamp">{m.time}</div>}
              <Press className="kk-bubble" onLong={editable ? ed.itemLong(`${base}/messages`, mid, { fields: MSG_FIELDS, label: m.text, template }) : undefined}>
                {m.text}
              </Press>
              {me && mid === lastMine && <span className={`kk-st ${m.status ?? "S"}`} title={m.status === "R" ? "Read" : m.status === "D" ? "Delivered" : "Sent"}>{m.status ?? "S"}</span>}
            </div>
          );
        })}
        {shown.length === 0 && <Empty>Say hi!</Empty>}
        <div ref={end} />
      </div>
      <div className="kk-compose">
        {editable && <button className={`kk-who ${asThem ? "them" : ""}`} onClick={() => setAsThem((v) => !v)} title="Changer d'expéditeur"><Glyph i={mdiSwapHorizontal} size={14} />{asThem ? (chat.name || "Eux").split(" ")[0] : "Moi"}</button>}
        <input value={text} disabled={!editable} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message..." />
        <button className="kk-send" disabled={!editable || !text.trim()} onClick={send}>Send</button>
      </div>
      {ed.ui}
    </div>
  );
}

// ═══ Vine ════════════════════════════════════════════════════════════════════
type VinePost = { author?: string; name?: string; handle?: string; avatar?: string; caption?: string; src?: string; likes?: number; revines?: number;
  comments?: number; time?: string; location?: string; order?: number; deleted?: boolean };
type VineProfile = { name?: string; bio?: string; avatar?: string; followers?: number; following?: number; location?: string };

const VINE_GREEN = "#00bf8f";
const POST_FIELDS = ["name", "avatar", "caption", "src", "time", "location", "likes", "revines", "comments"];
const isVideo = (src?: string) => !!src && /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src);

export function VineApp({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const chars = useChars();
  const path = `phones/${pid}/data/vine`;
  const posts = useList<VinePost>(path);
  const prof = useValue<VineProfile>(`phones/${pid}/data/vineProfile`) ?? {};
  const ed = useEditor(pid);
  const [tab, setTab] = useState<"home" | "popular" | "profile">("home");
  const [menu, setMenu] = useState(false);
  const me = chars[pid];
  const myName = prof.name ?? me?.name ?? pid;
  const myAvatar = pickLocal(prof.avatar, me?.avatar);
  const template = { author: pid, caption: "", src: "", time: "now", likes: 0, revines: 0, comments: 0 };
  const newPost = () => ed.add(path, template, { atStart: true, title: "Nouveau post", fields: ["caption", "src", "time", "location", "likes", "revines", "comments"] });
  const mine = posts.filter(([, p]) => p.author === pid);
  const list = tab === "profile" ? mine : tab === "popular" ? [...posts].sort((a, b) => (b[1].likes ?? 0) - (a[1].likes ?? 0)) : posts;
  const title = tab === "home" ? undefined : tab === "popular" ? "Popular Now" : myName;
  const go = (t: typeof tab) => { setTab(t); setMenu(false); };

  return (
    <div className={`app vn ${os}`}>
      <StatusBar />
      {os === "android" ? (
        <HoloBar color={VINE_GREEN} onUp={() => nav(`/${pid}/home`)} icon={<span className="vn-word sm">Vine</span>} title={title}
          actions={<>
            <button aria-label="Menu" onClick={() => setMenu((m) => !m)}><Glyph i={mdiMenu} size={24} /></button>
            <button aria-label="Filmer" disabled={!ed.canEdit} onClick={newPost}><Glyph i={mdiCamera} size={24} /></button>
          </>} />
      ) : (
        <div className="vn-bar">
          <BarBack onClick={() => (tab === "home" ? nav(`/${pid}/home`) : go("home"))} label={tab === "home" ? "Accueil" : "Vine"} />
          <button className="vn-ic" onClick={() => setMenu((m) => !m)} aria-label="Menu"><Glyph i={mdiMenu} size={22} /></button>
          <h1>{title ?? <span className="vn-word">Vine</span>}</h1>
          <button className="vn-ic cam" onClick={newPost} disabled={!ed.canEdit} aria-label="Filmer"><Glyph i={mdiCamera} size={22} /></button>
        </div>
      )}
      {menu && (
        <div className="vn-menu" onClick={() => setMenu(false)}>
          <div className="vn-menu-in" onClick={(e) => e.stopPropagation()}>
            <button className={tab === "home" ? "on" : ""} onClick={() => go("home")}><Glyph i={mdiHome} size={20} />Home</button>
            <button className={tab === "popular" ? "on" : ""} onClick={() => go("popular")}><Glyph i={mdiTrendingUp} size={20} />Popular Now</button>
            <button className={tab === "profile" ? "on" : ""} onClick={() => go("profile")}><Glyph i={mdiAccount} size={20} />Profile</button>
          </div>
        </div>
      )}
      <div className="vn-scroll">
        {tab === "profile" && (
          <Press className="vn-prof" onLong={ed.canEdit ? () => ed.edit({ path: `phones/${pid}/data/vineProfile`, fields: ["name", "bio", "location", "avatar", "followers", "following"], title: "Profil Vine" }) : undefined}>
            <Avatar src={myAvatar} name={myName} size={72} />
            <b>{myName}</b>
            {prof.location && <span>{prof.location}</span>}
            {prof.bio && <p>{prof.bio}</p>}
            <div className="vn-stats">
              <span><b>{mine.length}</b>posts</span>
              <span><b>{compact(prof.followers ?? 0)}</b>followers</span>
              <span><b>{compact(prof.following ?? 0)}</b>following</span>
            </div>
          </Press>
        )}
        {list.map(([id, p]) => {
          const c = p.author ? chars[p.author] : undefined;
          const name = p.author === pid ? myName : p.name ?? c?.name ?? "";
          const av = p.author === pid ? myAvatar : pickLocal(p.avatar, c?.avatar);
          return (
            <VineCard key={id} p={p} name={name} avatar={av}
              onLong={ed.itemLong(path, id, { fields: p.author ? POST_FIELDS.filter((f) => f !== "name" && f !== "avatar") : POST_FIELDS, label: p.caption || name, template })} />
          );
        })}
        {list.length === 0 && (
          <div className="vn-empty">
            <Brand name="vine" size={46} color={VINE_GREEN} />
            <p>{tab === "profile" ? "You haven't posted yet." : "Welcome to Vine! Find people to follow, or post your first video."}</p>
            {ed.canEdit && <button onClick={newPost}><Glyph i={mdiPlus} size={16} /> Post</button>}
          </div>
        )}
      </div>
      {ed.ui}
    </div>
  );
}

function VineCard({ p, name, avatar, onLong }: { p: VinePost; name: string; avatar?: string; onLong?: () => void }) {
  const [liked, setLiked] = useState(false);
  const [broken, setBroken] = useState(false);
  const src = img(p.src);
  return (
    <Press as="article" className="vn-post" onLong={onLong}>
      <header className="vn-head">
        <Avatar src={avatar} name={name} size={34} />
        <span className="vn-who"><b>{name}</b>{p.location && <small>{p.location}</small>}</span>
        <i>{p.time}</i>
      </header>
      <div className="vn-media" onDoubleClick={() => setLiked(true)}>
        {src && !broken ? (
          isVideo(p.src)
            ? <video src={src} autoPlay muted loop playsInline onError={() => setBroken(true)} />
            : <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
        ) : <span className="vn-nomedia"><Brand name="vine" size={54} color="rgba(255,255,255,.55)" /></span>}
        <span className="vn-loop" aria-hidden><i /></span>
      </div>
      {p.caption && <p className="vn-cap">{p.caption}</p>}
      <div className="vn-acts">
        <button className={liked ? "on" : ""} onClick={() => setLiked((l) => !l)}><Glyph i={liked ? mdiHeart : mdiHeartOutline} size={18} />Like</button>
        <button><Glyph i={mdiCommentOutline} size={18} />Comment</button>
        <button><Glyph i={mdiRepeat} size={18} />Revine</button>
        <button className="more" aria-label="Plus"><Glyph i={mdiDotsHorizontal} size={20} /></button>
      </div>
      <div className="vn-counts">
        <span><Glyph i={mdiHeart} size={12} />{compact((p.likes ?? 0) + (liked ? 1 : 0))} likes</span>
        {!!p.revines && <span><Glyph i={mdiRepeat} size={12} />{compact(p.revines)} revines</span>}
        {!!p.comments && <span><Glyph i={mdiCommentOutline} size={12} />{compact(p.comments)} comments</span>}
      </div>
    </Press>
  );
}
