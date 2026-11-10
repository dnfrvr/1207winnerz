// Comptes et pages suivis sur les réseaux sociaux (hors des 4 persos) : Cynthia, « Sephora
// Augusta », Taylor Swift… Chaque téléphone a ses propres abonnements, éditables par son joueur :
//   phones/{pid}/data/follows/{net}/{acc}              { name, handle, avatar, bio, bannerImg, color, followers, following, match?, order, deleted? }
//   phones/{pid}/data/follows/{net}/{acc}/posts/{id}   post au format du réseau (tweet, publication, photo, post tumblr)
// Les anciens posts « décor » (homeBaseTweets, facebookPages, tumblr/feedPosts) portent l'identité
// de leur compte dans chaque post. Un compte décor devient un vrai compte la première fois qu'on le
// modifie (« adoption ») : `match` garde la clé d'origine (pseudo / nom), pour que ses anciens posts
// prennent la nouvelle identité (nom, avatar) et s'affichent sur sa page.
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { mdiAccountPlus, mdiChevronRight, mdiCommentOutline, mdiHeart, mdiPencil, mdiPlus, mdiRepeat, mdiReply, mdiStar, mdiThumbUp } from "@mdi/js";
import { useData, useList, useValue } from "../data/hooks";
import type { Json } from "../data/store";
import { loreNowMs, loreToMs, msToLore, newestFirst } from "../lib/loreTime";
import { img } from "../lib/img";
import { BarBack, StatusBar } from "../phone/IOSChrome";
import { LORE_DATE_DEFAULT, useOS } from "../phone/common";
import { Avatar, Empty, useEditor } from "../kit/kit";
import { Brand, Glyph } from "../kit/glyph";
import { Icon } from "../kit/icons";
import { compact, Cover, HoloBar, num, pickLocal, Press } from "./social";
import "./social.css";
import "./instagram.css";
import "./follows.css";

export type Net = "twitter" | "facebook" | "instagram" | "tumblr";
export type FPost = {
  text?: string; title?: string; body?: string; caption?: string; src?: string; img?: string; time?: string; date?: string; location?: string; tags?: string;
  likes?: number; comments?: number; notes?: number; rp?: number; rt?: number; fav?: number; order?: number; deleted?: boolean;
  // Champs des posts décor (identité portée par le post)
  author?: string; name?: string; h?: string; av?: string; username?: string; avatarBg?: string;
};
export type Acc = { name?: string; handle?: string; avatar?: string; bio?: string; bannerImg?: string; color?: string; followers?: number; following?: number;
  match?: string; order?: number; deleted?: boolean; posts?: Record<string, FPost> };
/** Identité affichée d'un auteur. */
export type Who = { key: string; name: string; handle: string; avatar?: string; color?: string };

type Decor = { path: (pid: string) => string; key: (p: FPost) => string | undefined; seed: (p: FPost) => Acc; postFields: string[] };
type Cfg = { label: string; accLabel: string; listTitle: string; accFields: string[]; postFields: string[]; dateKey: "time" | "date"; post: (now: number) => Record<string, Json>; decor?: Decor };

/** « nouveau compte » / « nouvelle page » (avec article si demandé). */
const newAcc = (cfg: Cfg, article = false) => {
  const fem = cfg.accLabel === "Page";
  return `${article ? (fem ? "une " : "un ") : ""}${fem ? "nouvelle" : "nouveau"} ${cfg.accLabel.toLowerCase()}`;
};

const urlOrEmpty = (s?: string) => (s && s.length > 2 ? s : "");

export const NETS: Record<Net, Cfg> = {
  twitter: {
    label: "Twitter", accLabel: "Compte", listTitle: "Following", dateKey: "time",
    accFields: ["name", "handle", "avatar", "bannerImg", "bio", "followers", "following"],
    postFields: ["text", "time", "rp", "rt", "fav"],
    post: (now) => ({ text: "", time: msToLore(now), rp: 0, rt: 0, fav: 0 }),
    decor: {
      path: (pid) => `phones/${pid}/data/homeBaseTweets`,
      key: (p) => (p.author ? undefined : p.h || p.name || undefined),
      seed: (p) => ({ name: p.name ?? "", handle: p.h ?? "", avatar: urlOrEmpty(p.av) }),
      postFields: ["text", "time", "rp", "rt", "fav"],
    },
  },
  facebook: {
    label: "Facebook", accLabel: "Page", listTitle: "Pages", dateKey: "time",
    accFields: ["name", "avatar", "bannerImg", "bio", "followers"],
    postFields: ["text", "img", "time", "likes", "comments"],
    post: (now) => ({ text: "", img: "", time: msToLore(now), likes: 0, comments: 0 }),
    decor: {
      path: (pid) => `phones/${pid}/data/facebookPages/${pid}`,
      key: (p) => (p.author ? undefined : p.name || undefined),
      seed: (p) => ({ name: p.name ?? "" }),
      postFields: ["text", "img", "time", "likes", "comments"],
    },
  },
  instagram: {
    label: "Instagram", accLabel: "Compte", listTitle: "Following", dateKey: "date",
    accFields: ["handle", "name", "avatar", "bio", "followers", "following"],
    postFields: ["src", "caption", "location", "date", "likes"],
    post: (now) => ({ src: "", caption: "", location: "", date: msToLore(now), likes: 0 }),
  },
  tumblr: {
    label: "Tumblr", accLabel: "Blog", listTitle: "Following", dateKey: "date",
    accFields: ["handle", "name", "avatar", "bannerImg", "color", "bio", "followers"],
    postFields: ["title", "body", "img", "date", "notes", "tags"],
    post: (now) => ({ title: "", body: "", img: "", date: msToLore(now).split(",")[0], notes: 0, tags: "" }),
    decor: {
      path: (pid) => `phones/${pid}/data/tumblr/feedPosts`,
      key: (p) => (p.author ? undefined : p.username || undefined),
      seed: (p) => ({ handle: p.username ?? "", name: p.username ?? "", color: p.avatarBg ?? "" }),
      postFields: ["title", "body", "img", "date", "notes", "tags"],
    },
  },
};

const ACC_TEMPLATE: Record<Net, Record<string, Json>> = {
  twitter: { name: "", handle: "", avatar: "", bannerImg: "", bio: "", followers: 0, following: 0 },
  facebook: { name: "", avatar: "", bannerImg: "", bio: "", followers: 0 },
  instagram: { handle: "", name: "", avatar: "", bio: "", followers: 0, following: 0 },
  tumblr: { handle: "", name: "", avatar: "", bannerImg: "", color: "#36465d", bio: "", followers: 0 },
};

const norm = (s?: string) => (s ?? "").trim().toLowerCase();
export const followsPath = (pid: string, net: Net) => `phones/${pid}/data/follows/${net}`;
/** Clé d'URL d'un compte : son id, ou « m~clé » pour un compte décor pas encore adopté. */
const implicitKey = (match: string) => `m~${match}`;

export type Entry = { key: string; id?: string; path?: string; match?: string; acc: Acc; decorPosts: [string, FPost][] };
export type FollowPostItem = { key: string; path: string; post: FPost; who: Who; entry: Entry };

/** Tous les comptes suivis d'un réseau (vrais + décor), leurs posts, et l'identité des posts décor. */
export function useFollows(pid: string, net: Net) {
  const cfg = NETS[net];
  const base = followsPath(pid, net);
  const accs = useList<Acc>(base, { withDeleted: true });
  const decor = useList<FPost>(cfg.decor ? cfg.decor.path(pid) : null);
  return useMemo(() => {
    const byMatch = new Map<string, Entry>();
    const entries: Entry[] = [];
    for (const [id, acc] of accs) {
      const e: Entry = { key: id, id, path: `${base}/${id}`, match: acc.match, acc, decorPosts: [] };
      // Un compte décor adopté (match) garde sa place d'origine dans la liste : on le range
      // au moment où son premier post décor apparaît, plus bas.
      if (acc.match && cfg.decor) byMatch.set(norm(acc.match), e);
      else if (!acc.deleted) entries.push(e);
    }
    const placed = new Set<Entry>();
    const implicit = new Map<string, Entry>();
    if (cfg.decor) {
      for (const [id, p] of decor) {
        const k = cfg.decor.key(p);
        if (!k) continue;
        const owner = byMatch.get(norm(k));
        if (owner) {
          if (!placed.has(owner)) { placed.add(owner); if (!owner.acc.deleted) entries.push(owner); }
          owner.decorPosts.push([id, p]);
          continue;
        }
        let e = implicit.get(norm(k));
        if (!e) { e = { key: implicitKey(k), match: k, acc: cfg.decor.seed(p), decorPosts: [] }; implicit.set(norm(k), e); entries.push(e); }
        else if (!e.acc.color && p.avatarBg) e.acc = { ...e.acc, color: p.avatarBg };
        e.decorPosts.push([id, p]);
      }
      // Comptes adoptés dont les posts décor ont disparu : en fin de liste.
      for (const e of byMatch.values()) if (!placed.has(e) && !e.acc.deleted) entries.push(e);
    }
    const whoOf = (e: Entry): Who => ({ key: e.key, name: e.acc.name || e.acc.handle || "", handle: e.acc.handle ?? "", avatar: e.acc.avatar || undefined, color: e.acc.color || undefined });
    /** Posts des vrais comptes (non supprimés), pour les fils. */
    const posts: FollowPostItem[] = entries.filter((e) => e.id).flatMap((e) =>
      Object.entries(e.acc.posts ?? {}).filter(([, p]) => p && typeof p === "object" && !p.deleted)
        .map(([id, p]) => ({ key: `${e.id}/${id}`, path: `${e.path}/posts/${id}`, post: p, who: whoOf(e), entry: e })));
    /** Post décor → compte qui le possède (null = compte désabonné : post masqué). */
    const decorOwner = (p: FPost): Entry | null | undefined => {
      const k = cfg.decor?.key(p);
      if (!k) return undefined;
      const owner = byMatch.get(norm(k));
      if (owner) return owner.acc.deleted ? null : owner;
      return implicit.get(norm(k));
    };
    const find = (key: string) => entries.find((e) => e.key === key)
      ?? (key.startsWith("m~") ? entries.find((e) => e.match && norm(e.match) === norm(key.slice(2))) : undefined);
    return { cfg, base, entries, posts, whoOf, decorOwner, find };
  }, [accs, decor, base, cfg]);
}

/** Ouvre la page d'un compte depuis une app (chemin relatif à la racine de l'app). */
export function useAppRoot(pid: string) {
  const { app = "" } = useParams();
  return `/${pid}/${app}`;
}

const twHandle = (h?: string) => (!h ? "" : h.startsWith("@") ? h : `@${h}`);

/** « il y a 5 min » au format Twitter (5m, 3h, 2d). */
export const ago = (time: string | undefined, now: number) => {
  const t = loreToMs(time);
  if (t === null) return time ?? "";
  const m = Math.max(0, Math.round((now - t) / 60000));
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};

// ─── Rendu d'un post (même dessin que le fil de chaque réseau) ───────────────

export function FollowPost({ net, who, post, now, onLong, onWho }: { net: Net; who: Who; post: FPost; now: number; onLong?: () => void; onWho?: () => void }) {
  const [liked, setLiked] = useState(false);
  const whoBtn = (child: React.ReactNode, cls = "") => onWho
    ? <button type="button" className={`fo-who ${cls}`} onClick={(e) => { e.stopPropagation(); onWho(); }}>{child}</button>
    : child;
  if (net === "twitter") return (
    <Press className="tw-tweet" onLong={onLong}>
      {whoBtn(<Avatar src={who.avatar} name={who.name} size={48} round={false} />)}
      <div className="tw-body">
        <div className="tw-head">{whoBtn(<b>{who.name}</b>, "inline")}<span>{twHandle(who.handle)}</span><i>{ago(post.time, now)}</i></div>
        <p>{post.text}</p>
        <div className="tw-acts">
          <span><Glyph i={mdiReply} size={15} />{post.rp || ""}</span>
          <span><Glyph i={mdiRepeat} size={15} />{post.rt || ""}</span>
          <span className={post.fav ? "fav" : ""}><Glyph i={mdiStar} size={15} />{post.fav || ""}</span>
        </div>
      </div>
    </Press>
  );
  if (net === "facebook") return (
    <Press className="fb-card" onLong={onLong}>
      <div className="fb-head">
        {whoBtn(<Avatar src={who.avatar} name={who.name} size={40} round={false} color="#3b5998" />)}
        <div>{whoBtn(<b>{who.name}</b>, "inline")}<span>{post.time}</span></div>
      </div>
      {post.text && <p className="fb-text">{post.text}</p>}
      {post.img && <img className="fb-img" src={img(post.img)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
      {(post.likes || post.comments || liked) ? <div className="fb-counts"><Glyph i={mdiThumbUp} size={12} /> {num((post.likes ?? 0) + (liked ? 1 : 0))}{post.comments ? ` · ${num(post.comments)} comments` : ""}</div> : null}
      <div className="fb-acts"><button className={liked ? "on" : ""} onClick={() => setLiked((l) => !l)}><Glyph i={mdiThumbUp} size={14} /> {liked ? "Unlike" : "Like"}</button><button><Glyph i={mdiCommentOutline} size={14} /> Comment</button></div>
    </Press>
  );
  if (net === "instagram") return (
    <article className="ig-post">
      <header className="ig-head">
        {whoBtn(<Avatar src={who.avatar} name={who.name} size={30} round={false} />)}
        {whoBtn(<b>{who.handle || who.name}</b>, "inline grow")}
        <span className="ig-time"><Icon name="clock" size={11} /> {post.date?.split(",")[0]}</span>
      </header>
      {post.location && <div className="ig-loc"><Icon name="pin" size={11} /> {post.location}</div>}
      <Press className="ig-photo" onClick={() => setLiked(true)} onLong={onLong}>
        {post.src ? <img src={img(post.src)} alt="" loading="lazy" /> : <div className="ig-nophoto" />}
        {liked && <span className="ig-heart"><Glyph i={mdiHeart} size={96} /></span>}
      </Press>
      <div className="ig-actions">
        <button className={liked ? "liked" : ""} onClick={() => setLiked((l) => !l)}><Glyph i={mdiHeart} size={14} /> {liked ? "Liked" : "Like"}</button>
        <button><Glyph i={mdiCommentOutline} size={14} /> Comment</button>
      </div>
      <div className="ig-meta">
        <div className="ig-likes"><Glyph i={mdiHeart} size={13} /> {num((post.likes ?? 0) + (liked ? 1 : 0))} likes</div>
        {post.caption && <p><b>{who.handle || who.name}</b> {post.caption}</p>}
      </div>
    </article>
  );
  return (
    <Press className="tb-row" onLong={onLong}>
      {whoBtn(<Avatar src={who.avatar} name={who.handle || who.name} size={40} round={false} color={who.color} />, "sticky")}
      <div className="tb-card">
        <div className="tb-user">{whoBtn(<>{who.handle || who.name}</>, "inline")}</div>
        {post.img && <img src={img(post.img)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
        {post.title && <h3>{post.title}</h3>}
        {post.body && <p>{post.body}</p>}
        {post.tags && <div className="tb-tags">{post.tags}</div>}
        <div className="tb-foot">
          <span>{num(post.notes)} notes</span>
          <span className="tb-acts"><Glyph i={mdiRepeat} size={18} /><Glyph i={mdiHeart} size={18} /></span>
        </div>
      </div>
    </Press>
  );
}

// ─── Barre de navigation au style de chaque réseau ───────────────────────────

const APP_CLASS: Record<Net, string> = { twitter: "tw", facebook: "fb", instagram: "ig", tumblr: "tb" };

function NetBar({ net, title, onBack, backLabel, action }: { net: Net; title: string; onBack: () => void; backLabel: string; action?: { label: string; icon: string; onClick: () => void } }) {
  const os = useOS();
  const btn = (cls: string, size: number) => action ? <button className={cls} aria-label={action.label} title={action.label} onClick={action.onClick}><Glyph i={action.icon} size={size} /></button> : <span className="fo-spacer" />;
  if (os === "android" && (net === "twitter" || net === "tumblr")) {
    const tw = net === "twitter";
    return <HoloBar color={tw ? "#f3f3f3" : "#2c4762"} dark={!tw} onUp={onBack} icon={<Brand name={net} size={tw ? 30 : 26} color={tw ? true : "#fff"} />} title={title}
      actions={action ? <button aria-label={action.label} onClick={action.onClick}><Glyph i={action.icon} size={24} /></button> : undefined} />;
  }
  if (net === "twitter") return <div className="tw-bar"><BarBack onClick={onBack} label={backLabel} tone="light" /><h1 className="fo-title">{title}</h1>{btn("tw-ic", 18)}</div>;
  if (net === "facebook") return <div className="fb-bar"><button className="fb-btn fo-back" onClick={onBack} aria-label={backLabel}>‹</button><h1 className="fo-title fo-fb">{title}</h1>{btn("fb-btn", 20)}</div>;
  if (net === "instagram") return (
    <div className="ig-bar"><span className="side"><button className="ig-btn back" onClick={onBack}>{backLabel}</button></span><h1 className="txt">{title}</h1>
      <span className="side r">{action ? <button className="ig-btn" aria-label={action.label} onClick={action.onClick}><Glyph i={action.icon} size={16} /></button> : null}</span></div>
  );
  return <div className="tb-bar"><BarBack onClick={onBack} label={backLabel} /><h1 className="fo-title">{title}</h1>{btn("tb-ic", 17)}</div>;
}

// ─── Liste des comptes suivis ────────────────────────────────────────────────

export function FollowList({ pid, net }: { pid: string; net: Net }) {
  const os = useOS();
  const nav = useNavigate();
  const root = useAppRoot(pid);
  const f = useFollows(pid, net);
  const ed = useEditor(pid);
  const { cfg } = f;
  const create = () => ed.add(f.base, ACC_TEMPLATE[net], { atStart: true, title: `${newAcc(cfg)[0].toUpperCase()}${newAcc(cfg).slice(1)}`, fields: cfg.accFields });
  const adopt = useAdopt(pid, net);
  return (
    <div className={`app ${APP_CLASS[net]} fo ${os}`}>
      <StatusBar />
      <NetBar net={net} title={cfg.listTitle} onBack={() => nav(root)} backLabel={cfg.label}
        action={ed.canEdit ? { label: `Suivre ${newAcc(cfg, true)}`, icon: mdiAccountPlus, onClick: create } : undefined} />
      <div className="fo-scroll">
        {ed.canEdit && <button className="fo-new" onClick={create}><Glyph i={mdiPlus} size={18} />Suivre {newAcc(cfg, true)}</button>}
        {f.entries.map((e) => {
          const who = f.whoOf(e);
          const count = Object.values(e.acc.posts ?? {}).filter((p) => p && !p.deleted).length + e.decorPosts.length;
          return (
            <Press key={e.key} className="fo-row" onClick={() => nav(`${root}/f/${encodeURIComponent(e.key)}`)}
              onLong={ed.canEdit ? () => ed.sheet({ title: who.name, actions: [
                { label: "Modifier le profil", onPress: () => adopt(e, { edit: true }) },
                { label: "Ne plus suivre", destructive: true, onPress: () => adopt(e, { unfollow: true }) },
              ] }) : undefined}>
              <Avatar src={who.avatar} name={who.name} size={44} round={false} color={who.color} />
              <span className="fo-txt"><b>{who.name || "Sans nom"}</b><small>{net === "twitter" ? twHandle(who.handle) : net === "facebook" ? `${count} publication${count > 1 ? "s" : ""}` : who.handle}</small></span>
              <Glyph i={mdiChevronRight} size={20} className="fo-chev" />
            </Press>
          );
        })}
        {f.entries.length === 0 && <Empty>Aucun abonnement</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}

/** Transforme un compte décor en vrai compte (une seule fois), puis l'édite ou le retire. */
function useAdopt(pid: string, net: Net) {
  const ed = useEditor(pid);
  const { store } = useData();
  const cfg = NETS[net];
  return async (e: Entry, opts: { edit?: boolean; unfollow?: boolean }): Promise<string | undefined> => {
    let path = e.path;
    if (!path) {
      const id = store.newId("a");
      path = `${followsPath(pid, net)}/${id}`;
      await ed.write({ [path]: { ...ACC_TEMPLATE[net], ...e.acc, match: e.match ?? "", order: Date.now(), ...(opts.unfollow ? { deleted: true } : {}) } as Json });
    } else if (opts.unfollow) await ed.write({ [`${path}/deleted`]: true });
    if (opts.edit) ed.edit({ path, fields: cfg.accFields, title: `Profil · ${cfg.label}` });
    return path.slice(path.lastIndexOf("/") + 1);
  };
}

// ─── Page d'un compte : profil + posts ───────────────────────────────────────

export function AccountPage({ pid, net }: { pid: string; net: Net }) {
  const os = useOS();
  const nav = useNavigate();
  const root = useAppRoot(pid);
  const { key = "" } = useParams();
  const f = useFollows(pid, net);
  const e = f.find(key);
  const ed = useEditor(pid);
  const { store } = useData();
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const now = loreNowMs(lore);
  const { cfg } = f;
  const [busy, setBusy] = useState(false);

  // Même composant d'édition pour le profil et les posts : l'adoption se fait avant d'écrire.
  const ensure = async (): Promise<string | undefined> => {
    if (!e) return;
    if (e.path) return e.path;
    const id = store.newId("a");
    const path = `${f.base}/${id}`;
    await ed.write({ [path]: { ...ACC_TEMPLATE[net], ...e.acc, match: e.match ?? "", order: Date.now() } as Json });
    nav(`${root}/f/${id}`, { replace: true });
    return path;
  };
  const editProfile = async () => { const p = await ensure(); if (p) ed.edit({ path: p, fields: cfg.accFields, title: `Profil · ${cfg.label}` }); };
  const newPost = async () => {
    if (busy) return;
    setBusy(true);
    try { const p = await ensure(); if (p) ed.add(`${p}/posts`, cfg.post(now), { atStart: true, title: "Nouveau post", fields: cfg.postFields }); }
    finally { setBusy(false); }
  };

  if (!e) return (
    <div className={`app ${APP_CLASS[net]} fo ${os}`}>
      <StatusBar />
      <NetBar net={net} title={cfg.accLabel} onBack={() => nav(`${root}/f`)} backLabel={cfg.listTitle} />
      <div className="fo-scroll"><Empty>Compte introuvable</Empty></div>
    </div>
  );

  const who = f.whoOf(e);
  const own = Object.entries(e.acc.posts ?? {}).filter(([, p]) => p && typeof p === "object" && !p.deleted)
    .map(([id, p]) => ({ k: `o${id}`, id, list: `${e.path}/posts`, post: p, fields: cfg.postFields }));
  const decorList = cfg.decor?.path(pid) ?? "";
  const old = e.decorPosts.filter(([, p]) => !p.deleted).map(([id, p]) => ({ k: `d${id}`, id, list: decorList, post: p, fields: cfg.decor?.postFields ?? cfg.postFields }));
  const posts = newestFirst([...own, ...old], (x) => x.post[cfg.dateKey]);
  const tpl = cfg.post(now);
  const handleLine = net === "twitter" ? twHandle(who.handle) : net === "tumblr" ? (who.handle ? `${who.handle}.tumblr.com` : "") : net === "instagram" ? (who.name !== who.handle ? who.name : "") : "";
  const stats = net === "facebook"
    ? [[posts.length, "posts"], [e.acc.followers ?? 0, "likes"]]
    : net === "tumblr" ? [[posts.length, "posts"], [e.acc.followers ?? 0, "followers"]]
    : [[posts.length, net === "instagram" ? "photos" : "tweets"], [e.acc.followers ?? 0, "followers"], [e.acc.following ?? 0, "following"]];

  return (
    <div className={`app ${APP_CLASS[net]} fo ${os}`}>
      <StatusBar />
      <NetBar net={net} title={net === "instagram" ? who.handle || who.name : who.name || cfg.accLabel} onBack={() => nav(-1)} backLabel="Back"
        action={ed.canEdit ? { label: "Nouveau post", icon: net === "twitter" || net === "tumblr" ? mdiPencil : mdiPlus, onClick: newPost } : undefined} />
      <div className="fo-scroll">
        <Press className={`fo-head ${net}`} onLong={ed.canEdit ? editProfile : undefined}>
          <Cover src={e.acc.bannerImg} color={who.color ?? (net === "facebook" ? "#3b5998" : net === "tumblr" ? "#36465d" : net === "instagram" ? "#517fa4" : "#3a6d99")} className="fo-cover">
            <Avatar src={pickLocal(who.avatar)} name={who.name} size={64} round={false} color={who.color ?? (net === "facebook" ? "#3b5998" : undefined)} />
            <b>{who.name || "Sans nom"}</b>
            {handleLine && <span>{handleLine}</span>}
          </Cover>
          {e.acc.bio && <p className="fo-bio">{e.acc.bio}</p>}
          <div className="fo-stats">{stats.map(([n, l]) => <span key={l as string}><b>{compact(n as number)}</b>{l}</span>)}</div>
          {ed.canEdit && <div className="fo-tools">
            <button onClick={editProfile}><Glyph i={mdiPencil} size={14} />Modifier le profil</button>
            <button className="main" onClick={newPost} disabled={busy}><Glyph i={mdiPlus} size={14} />Nouveau post</button>
          </div>}
        </Press>
        <div className={net === "tumblr" ? "fo-tb-list" : ""}>
          {posts.map((x) => (
            <FollowPost key={x.k} net={net} who={who} post={x.post} now={now}
              // Les anciens posts décor restent à leur place (« Ajouter après » seulement pour les posts du compte).
              onLong={ed.itemLong(x.list, x.id, { fields: x.fields, label: x.post.title || x.post.text?.slice(0, 40) || x.post.caption?.slice(0, 40) || who.name,
                template: x.k.startsWith("o") ? tpl : undefined })} />
          ))}
        </div>
        {posts.length === 0 && <Empty>Aucun post pour l'instant</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}
