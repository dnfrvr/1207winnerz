// Instagram 3 (2012) : barre bleu-gris avec le logo manuscrit, barre d'onglets sombre avec le
// bouton photo bleu en relief, fil, profil (statistiques + grille), publications où l'on est
// identifié par un autre perso.
import { useState } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { img } from "../lib/img";
import { StatusBar } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { Avatar, Empty, useEditor } from "../kit/kit";
import { Icon } from "../kit/icons";
import { Glyph } from "../kit/glyph";
import { mdiChevronLeft, mdiCommentOutline, mdiDotsHorizontal, mdiHeart, mdiPlus } from "@mdi/js";
import { Press } from "./social";
import { PIDS, num, useChars } from "./social";
import "./instagram.css";

type Comment = { user?: string; text?: string; time?: string; authorKey?: string; replies?: Record<string, Comment>; order?: number; deleted?: boolean };
type Post = { src?: string; caption?: string; date?: string; likes?: number; location?: string; pinned?: boolean; archived?: boolean; taggedWith?: string;
  comments?: Record<string, Comment>; photos?: string[]; order?: number; deleted?: boolean };
type Profile = { handle?: string; displayName?: string; bio?: string; avatar?: string; followers?: number; following?: number; link?: string };

export default function InstagramApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<Shell pid={pid} />} />
      <Route path="p/:owner/:id" element={<PostPage pid={pid} />} />
    </Routes>
  );
}

function Bar({ title, left, right }: { title?: string; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="ig-bar">
      <span className="side">{left}</span>
      {title ? <h1 className="txt">{title}</h1> : <h1 className="logo">Instagram</h1>}
      <span className="side r">{right}</span>
    </div>
  );
}

/** Toutes les publications visibles sur ce téléphone : les siennes + celles des autres persos qui l'identifient. */
function useTimeline(pid: string) {
  const mine = useList<Post>(`phones/${pid}/data/instagram/posts`);
  const others = PIDS.filter((p) => p !== pid).map((p) => [p, useList<Post>(`phones/${p}/data/instagram/posts`)] as const);
  const tagged = others.flatMap(([p, list]) => list.filter(([, x]) => x.taggedWith === pid).map(([id, x]) => ({ owner: p, id, post: x })));
  const own = mine.filter(([, x]) => !x.archived).map(([id, x]) => ({ owner: pid, id, post: x }));
  const feed = [...own, ...others.flatMap(([p, list]) => list.filter(([, x]) => !x.archived).slice(-3).map(([id, x]) => ({ owner: p, id, post: x })))];
  return { own, tagged, feed: feed.reverse() };
}

function Shell({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const [tab, setTab] = useState(() => sessionStorage.getItem("ig-tab") ?? "home");
  const go = (t: string) => { setTab(t); try { sessionStorage.setItem("ig-tab", t); } catch { /* rien */ } };
  return (
    <div className={`app ig ${os}`}>
      <StatusBar />
      {tab === "home" && <Feed pid={pid} />}
      {tab === "profile" && <ProfileView pid={pid} />}
      {tab === "explore" && <Explore pid={pid} />}
      {tab === "news" && <News pid={pid} />}
      <div className="ig-tabs">
        <button className={tab === "home" ? "on" : ""} onClick={() => go("home")} aria-label="Accueil"><Icon name="home" size={22} /></button>
        <button className={tab === "explore" ? "on" : ""} onClick={() => go("explore")} aria-label="Explorer"><Icon name="star" size={22} /></button>
        <button className="cam" onClick={() => nav(`/${pid}/camera`)} aria-label="Prendre une photo"><Icon name="camera" size={22} /></button>
        <button className={tab === "news" ? "on" : ""} onClick={() => go("news")} aria-label="Activité"><Icon name="heart" size={22} /></button>
        <button className={tab === "profile" ? "on" : ""} onClick={() => go("profile")} aria-label="Profil"><Icon name="person" size={22} /></button>
      </div>
    </div>
  );
}

function Feed({ pid }: { pid: string }) {
  const nav = useNavigate();
  const { feed } = useTimeline(pid);
  return (
    <>
      <Bar left={<button className="ig-btn" onClick={() => nav(`/${pid}/home`)} aria-label="Retour"><Glyph i={mdiChevronLeft} size={20} /></button>} right={<button className="ig-btn"><Icon name="refresh" size={16} /></button>} />
      <div className="ig-scroll">
        {feed.map((f) => <PostCard key={`${f.owner}/${f.id}`} pid={pid} owner={f.owner} id={f.id} post={f.post} />)}
        {feed.length === 0 && <Empty>Aucune publication</Empty>}
      </div>
    </>
  );
}

function PostCard({ pid, owner, id, post, full = false }: { pid: string; owner: string; id: string; post: Post; full?: boolean }) {
  const chars = useChars();
  const nav = useNavigate();
  const ed = useEditor(owner === pid ? pid : "__none__");
  const who = chars[owner];
  const comments = Object.entries(post.comments ?? {}).filter(([, c]) => c && !c.deleted).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));
  const [liked, setLiked] = useState(false);
  const path = `phones/${owner}/data/instagram/posts/${id}`;
  return (
    <article className="ig-post">
      <header className="ig-head">
        <Avatar src={who?.avatar} name={who?.name} size={30} round={false} />
        <b>{who?.ig ?? owner}</b>
        <span className="ig-time"><Icon name="clock" size={11} /> {post.date?.split(",")[0]}</span>
      </header>
      {post.location && <div className="ig-loc"><Icon name="pin" size={11} /> {post.location}</div>}
      <Press className="ig-photo" onClick={!full ? () => nav(`/${pid}/insta/p/${owner}/${id}`) : () => setLiked(true)}
        onLong={ed.canEdit ? ed.itemLong(`phones/${owner}/data/instagram/posts`, id, { fields: ["src", "caption", "location", "date", "likes", "taggedWith", "pinned", "archived"], label: "Publication" }) : undefined}>
        {post.src ? <img src={img(post.src)} alt="" loading="lazy" /> : <div className="ig-nophoto" />}
        {liked && <span className="ig-heart"><Glyph i={mdiHeart} size={96} /></span>}
      </Press>
      <div className="ig-actions">
        <button className={liked ? "liked" : ""} onClick={() => setLiked((l) => !l)}><Glyph i={mdiHeart} size={14} /> {liked ? "Liked" : "Like"}</button>
        <button onClick={() => nav(`/${pid}/insta/p/${owner}/${id}`)}><Glyph i={mdiCommentOutline} size={14} /> Comment</button>
        <button className="ig-more" aria-label="Plus"><Glyph i={mdiDotsHorizontal} size={18} /></button>
      </div>
      <div className="ig-meta">
        <div className="ig-likes"><Glyph i={mdiHeart} size={13} /> {num((post.likes ?? 0) + (liked ? 1 : 0))} likes</div>
        {post.caption && <p><b>{who?.ig ?? owner}</b> {post.caption}</p>}
        {(full ? comments : comments.slice(0, 2)).map(([cid, c]) => (
          <Press key={cid} onLong={full && ed.canEdit ? ed.itemLong(`${path}/comments`, cid, { fields: ["user", "text", "time"], label: c.user, template: { user: "", text: "", time: "" } }) : undefined}>
            <CommentLine c={c} depth={0} full={full} />
          </Press>
        ))}
        {!full && comments.length > 2 && <button className="ig-viewall" onClick={() => nav(`/${pid}/insta/p/${owner}/${id}`)}>view all {comments.length} comments</button>}
      </div>
      {ed.ui}
    </article>
  );
}

function CommentLine({ c, depth, full }: { c: Comment; depth: number; full: boolean }) {
  const replies = Object.values(c.replies ?? {}).filter((r) => r && !r.deleted);
  return (
    <>
      <p className="ig-comment" style={{ marginLeft: depth * 14 }}><b>{c.user}</b> {c.text}</p>
      {full && replies.map((r, i) => <CommentLine key={i} c={r} depth={depth + 1} full={full} />)}
    </>
  );
}

function PostPage({ pid }: { pid: string }) {
  const { owner = pid, id = "" } = useParams();
  const post = useValue<Post>(`phones/${owner}/data/instagram/posts/${id}`);
  const nav = useNavigate();
  const ed = useEditor(owner === pid ? pid : "__none__");
  const path = `phones/${owner}/data/instagram/posts/${id}`;
  return (
    <div className="app ig">
      <StatusBar />
      <Bar title="Photo" left={<button className="ig-btn back" onClick={() => nav(`/${pid}/insta`)}>Back</button>}
        right={ed.canEdit ? <button className="ig-btn" aria-label="Ajouter un commentaire" onClick={() => ed.add(`${path}/comments`, { user: "", text: "", time: "" }, { title: "Commentaire", fields: ["user", "text", "time"] })}><Glyph i={mdiPlus} size={14} /><Glyph i={mdiCommentOutline} size={16} /></button> : undefined} />
      <div className="ig-scroll">{post ? <PostCard pid={pid} owner={owner} id={id} post={post} full /> : <Empty>Publication introuvable</Empty>}</div>
      {ed.ui}
    </div>
  );
}

function ProfileView({ pid }: { pid: string }) {
  const prof = useValue<Profile>(`phones/${pid}/data/instagram`) ?? {};
  const { own, tagged } = useTimeline(pid);
  const [view, setView] = useState<"grid" | "list" | "tagged">("grid");
  const nav = useNavigate();
  const ed = useEditor(pid);
  const list = view === "tagged" ? tagged : own;
  return (
    <>
      <Bar title={prof.handle ?? "Profile"} right={ed.canEdit ? <button className="ig-btn" aria-label="Nouvelle publication" onClick={() => ed.add(`phones/${pid}/data/instagram/posts`, { src: "", caption: "", date: "6 Oct, 12:00pm", likes: 0, location: "" }, { title: "Nouvelle publication", fields: ["src", "caption", "location", "date", "likes", "taggedWith"] })}><Glyph i={mdiPlus} size={18} /></button> : undefined} />
      <div className="ig-scroll">
        <div className="ig-prof">
          <Avatar src={prof.avatar} name={prof.displayName} size={76} round={false} />
          <div className="ig-stats">
            <div className="nums"><span><b>{own.length}</b>photos</span><span><b>{num(prof.followers)}</b>followers</span><span><b>{num(prof.following)}</b>following</span></div>
            <button className="ig-edit" onClick={ed.canEdit ? () => ed.edit({ path: `phones/${pid}/data/instagram`, fields: ["handle", "displayName", "bio", "link", "avatar", "followers", "following"], title: "Edit Your Profile" }) : undefined}>
              {ed.canEdit ? "Edit Your Profile" : "Following"}
            </button>
          </div>
        </div>
        <div className="ig-bio"><b>{prof.displayName}</b>{prof.bio && <p>{prof.bio}</p>}{prof.link && <a>{prof.link}</a>}</div>
        <div className="ig-views">
          <button className={view === "grid" ? "on" : ""} onClick={() => setView("grid")}><Icon name="grid" size={18} /></button>
          <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}><Icon name="list" size={18} /></button>
          <button className={view === "tagged" ? "on" : ""} onClick={() => setView("tagged")}><Icon name="person" size={18} /></button>
        </div>
        {view === "list" ? list.map((f) => <PostCard key={f.id} pid={pid} owner={f.owner} id={f.id} post={f.post} />) : (
          <div className="ig-grid">
            {[...list].reverse().map((f) => (
              <button key={`${f.owner}/${f.id}`} onClick={() => nav(`/${pid}/insta/p/${f.owner}/${f.id}`)}>{f.post.src && <img src={img(f.post.src)} alt="" loading="lazy" />}</button>
            ))}
          </div>
        )}
        {list.length === 0 && <Empty>{view === "tagged" ? "No photos of you yet" : "No photos yet"}</Empty>}
      </div>
      {ed.ui}
    </>
  );
}

function Explore({ pid }: { pid: string }) {
  const nav = useNavigate();
  const all = PIDS.filter((p) => p !== pid).flatMap((p) => useList<Post>(`phones/${p}/data/instagram/posts`).map(([id, x]) => ({ owner: p, id, post: x })));
  return (
    <>
      <Bar title="Popular" />
      <div className="ig-scroll"><div className="ig-grid">
        {all.filter((f) => f.post.src && !f.post.archived).map((f) => (
          <button key={`${f.owner}/${f.id}`} onClick={() => nav(`/${pid}/insta/p/${f.owner}/${f.id}`)}><img src={img(f.post.src)} alt="" loading="lazy" /></button>
        ))}
      </div></div>
    </>
  );
}

function News({ pid }: { pid: string }) {
  const notifs = useList<{ app?: string; title?: string; text?: string; time?: string }>(`phones/${pid}/data/notifications`).filter(([, n]) => n.app === "insta");
  const { own } = useTimeline(pid);
  const comments = own.flatMap((f) => Object.values(f.post.comments ?? {}).filter(Boolean).map((c) => ({ c, f })));
  return (
    <>
      <Bar title="News" />
      <div className="ig-tabsub"><span className="on">Following</span><span>News</span></div>
      <div className="ig-scroll ig-news">
        {notifs.map(([id, n]) => <div key={id} className="ig-news-row"><b>{n.title}</b> {n.text}<i>{n.time}</i></div>)}
        {comments.slice(-15).reverse().map(({ c, f }, i) => (
          <div key={i} className="ig-news-row"><b>{c.user}</b> commented: {c.text}<i>{c.time}</i>{f.post.src && <img src={img(f.post.src)} alt="" />}</div>
        ))}
        {notifs.length + comments.length === 0 && <Empty>No activity</Empty>}
      </div>
    </>
  );
}
