// Tumblr pour iOS (2012) : tableau de bord bleu nuit, cartes blanches arrondies avec avatar
// carré à gauche, onglets Dashboard / Blog. Mélange les posts des 4 persos et le « décor ».
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { loreNowMs, msToLore } from "../lib/loreTime";
import { img } from "../lib/img";
import { StatusBar } from "../phone/IOSChrome";
import { LORE_DATE_DEFAULT, useOS } from "../phone/common";
import { Avatar, Empty, useEditor } from "../kit/kit";
import { Icon } from "../kit/icons";
import { num, useChars } from "./social";
import "./social.css";

type TPost = { author?: string; username?: string; avatarBg?: string; body?: string; title?: string; img?: string; date?: string; notes?: number; type?: string; tags?: string; order?: number; deleted?: boolean };
type Blog = { handle?: string; cover?: string; followers?: number; following?: number; bio?: string };

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
  return (
    <div className={`app tb ${os}`}>
      <StatusBar />
      <div className="tb-bar">
        <button className="tb-ic" onClick={() => nav(`/${pid}/home`)} aria-label="Retour"><Icon name="back" size={20} /></button>
        <h1>{tab === "dash" ? "tumblr." : blog.handle}</h1>
        <button className="tb-ic" aria-label="Publier" disabled={!ed.canEdit}
          onClick={() => ed.add(`phones/${pid}/data/tumblr/posts`, { username: blog.handle ?? pid, type: "text", title: "", body: "", date: msToLore(loreNowMs(lore)).split(",")[0], notes: 0 }, { atStart: true, title: "Nouveau post", fields })}>✎</button>
      </div>
      <div className="tb-scroll">
        {tab === "blog" && (
          <div className="tb-cover" style={{ backgroundImage: blog.cover ? `url(${img(blog.cover)})` : undefined }}>
            <Avatar src={chars[pid]?.avatar} name={blog.handle} size={64} round={false} />
            <b>{blog.handle}</b><span>{num(blog.followers)} followers</span>
          </div>
        )}
        {list.map(({ key, path, p }) => {
          const c = p.author ? chars[p.author] : undefined;
          const editable = ed.canEdit && !path.startsWith("feeds/");
          return (
            <div key={key} className="tb-row" onContextMenu={(e) => { if (editable) { e.preventDefault(); ed.edit({ path, fields, title: "Post" }); } }}>
              <Avatar src={c?.avatar} name={p.username} size={40} round={false} color={p.avatarBg} />
              <div className="tb-card">
                <div className="tb-user">{p.username ?? c?.tumblr}</div>
                {p.img && <img src={img(p.img)} alt="" loading="lazy" />}
                {p.title && <h3>{p.title}</h3>}
                {p.body && <p>{p.body}</p>}
                {p.tags && <div className="tb-tags">{p.tags}</div>}
                <div className="tb-foot"><span>{num(p.notes)} notes</span><span>{p.date}</span><span>⟳ ♥</span></div>
              </div>
            </div>
          );
        })}
        {list.length === 0 && <Empty>Rien ici pour l'instant</Empty>}
      </div>
      <div className="tb-tabs">
        <button className={tab === "dash" ? "on" : ""} onClick={() => setTab("dash")}><Icon name="home" size={22} /><span>Dashboard</span></button>
        <button><Icon name="search" size={22} /><span>Search</span></button>
        <button className={tab === "blog" ? "on" : ""} onClick={() => setTab("blog")}><Icon name="person" size={22} /><span>Account</span></button>
      </div>
      {ed.ui}
    </div>
  );
}
