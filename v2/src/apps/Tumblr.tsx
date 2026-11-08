// Tumblr pour iOS (3.x, 2012) : tableau de bord bleu nuit (#2c4762), cartes blanches arrondies
// avec avatar carré « collant » à gauche, barre d'onglets sombre Dashboard / Search / Account.
// Mélange les posts des 4 persos et le « décor ». Android : barre d'action Holo bleu nuit.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { mdiAccount, mdiHeart, mdiHome, mdiMagnify, mdiPencil, mdiRepeat } from "@mdi/js";
import { useList, useValue } from "../data/hooks";
import { loreNowMs, msToLore } from "../lib/loreTime";
import { img } from "../lib/img";
import { StatusBar, BarBack } from "../phone/IOSChrome";
import { LORE_DATE_DEFAULT, useOS } from "../phone/common";
import { Avatar, Empty, useEditor } from "../kit/kit";
import { Brand, Glyph } from "../kit/glyph";
import { Cover, HoloBar, HoloTabs, num, Press, useChars } from "./social";
import "./social.css";

type TPost = { author?: string; username?: string; avatarBg?: string; body?: string; title?: string; img?: string; date?: string; notes?: number; type?: string; tags?: string; order?: number; deleted?: boolean };
type Blog = { handle?: string; title?: string; cover?: string; coverColor?: string; avatarBg?: string; followers?: number; following?: number; bio?: string };

export default function TumblrApp({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const chars = useChars();
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const blog = useValue<Blog>(`phones/${pid}/data/tumblr`) ?? {};
  const own = useList<TPost>(`phones/${pid}/data/tumblr/posts`);
  const decor = useList<TPost>(`phones/${pid}/data/tumblr/feedPosts`);
  const shared = useList<TPost>("feeds/tumblrPosts");
  const [tab, setTab] = useState("dash");
  const ed = useEditor(pid);
  const dash = [
    ...shared.filter(([, p]) => p.author !== pid).map(([id, p]) => ({ key: `s${id}`, path: `feeds/tumblrPosts/${id}`, p })),
    ...decor.map(([id, p]) => ({ key: `d${id}`, path: `phones/${pid}/data/tumblr/feedPosts/${id}`, p })),
  ];
  const mine = own.map(([id, p]) => ({ key: `o${id}`, path: `phones/${pid}/data/tumblr/posts/${id}`, p }));
  const list = tab === "dash" ? dash : mine;
  const fields = ["username", "title", "body", "img", "date", "notes", "tags"];
  const handle = blog.handle ?? chars[pid]?.tumblr ?? pid;
  const compose = () => ed.add(`phones/${pid}/data/tumblr/posts`, { username: handle, type: "text", title: "", body: "", date: msToLore(loreNowMs(lore)).split(",")[0], notes: 0 }, { atStart: true, title: "Nouveau post", fields });
  const editBlog = () => ed.edit({ path: `phones/${pid}/data/tumblr`, fields: ["handle", "title", "bio", "cover", "coverColor", "avatarBg", "followers", "following"], title: "Blog" });
  const title = tab === "dash" ? undefined : handle;

  return (
    <div className={`app tb ${os}`}>
      <StatusBar />
      {os === "android" ? (
        <>
          <HoloBar color="#2c4762" onUp={() => nav(`/${pid}/home`)} icon={<Brand name="tumblr" size={26} color="#fff" />} title={title ?? "Dashboard"}
            actions={<button aria-label="Publier" disabled={!ed.canEdit} onClick={compose}><Glyph i={mdiPencil} size={22} /></button>} />
          <HoloTabs dark color="#fff" tabs={[{ id: "dash", label: "DASHBOARD" }, { id: "blog", label: "MY BLOG" }]} active={tab} onChange={setTab} />
        </>
      ) : (
        <div className="tb-bar">
          <BarBack onClick={() => nav(`/${pid}/home`)} label="Accueil" />
          <h1>{title ?? <span className="tb-logo">tumblr.</span>}</h1>
          <button className="tb-ic" aria-label="Publier" disabled={!ed.canEdit} onClick={compose}><Glyph i={mdiPencil} size={17} /></button>
        </div>
      )}
      <div className="tb-scroll">
        {tab === "blog" && (
          <Press className="tb-head" onLong={ed.canEdit ? editBlog : undefined}>
            <Cover src={blog.cover} color={blog.coverColor ?? blog.avatarBg ?? "#36465d"} className="tb-cover">
              <Avatar src={chars[pid]?.avatar} name={handle} size={64} round={false} color={blog.avatarBg} />
              <b>{blog.title ?? handle}</b>
              <span>{handle}.tumblr.com</span>
            </Cover>
            {blog.bio && <p className="tb-bio">{blog.bio}</p>}
            <div className="tb-stats"><span><b>{num(own.length)}</b>posts</span><span><b>{num(blog.followers)}</b>followers</span><span><b>{num(blog.following)}</b>following</span></div>
          </Press>
        )}
        {list.map(({ key, path, p }) => {
          const c = p.author ? chars[p.author] : tab === "blog" ? chars[pid] : undefined;
          const editable = ed.canEdit && !path.startsWith("feeds/");
          const listPath = path.slice(0, path.lastIndexOf("/"));
          const id = path.slice(path.lastIndexOf("/") + 1);
          return (
            <Press key={key} className="tb-row" onLong={editable ? ed.itemLong(listPath, id, { fields, label: p.title || p.username, template: { username: p.username ?? handle, type: "text", title: "", body: "", date: p.date ?? "", notes: 0 } }) : undefined}>
              <Avatar src={c?.avatar} name={p.username ?? c?.tumblr} size={40} round={false} color={p.avatarBg ?? (tab === "blog" ? blog.avatarBg : undefined)} />
              <div className="tb-card">
                <div className="tb-user">{p.username ?? c?.tumblr}</div>
                {p.img && <img src={img(p.img)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                {p.title && <h3>{p.title}</h3>}
                {p.body && <p>{p.body}</p>}
                {p.tags && <div className="tb-tags">{p.tags}</div>}
                <div className="tb-foot">
                  <span>{num(p.notes)} notes</span>
                  <span className="tb-acts"><Glyph i={mdiRepeat} size={18} /><Glyph i={mdiHeart} size={18} /></span>
                </div>
              </div>
            </Press>
          );
        })}
        {list.length === 0 && <Empty>Rien ici pour l'instant</Empty>}
      </div>
      {os === "ios" && (
        <div className="tb-tabs">
          <button className={tab === "dash" ? "on" : ""} onClick={() => setTab("dash")}><Glyph i={mdiHome} size={24} /><span>Dashboard</span></button>
          <button><Glyph i={mdiMagnify} size={24} /><span>Search</span></button>
          <button className={tab === "blog" ? "on" : ""} onClick={() => setTab("blog")}><Glyph i={mdiAccount} size={24} /><span>Account</span></button>
        </div>
      )}
      {ed.ui}
    </div>
  );
}
