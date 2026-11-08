// Facebook pour iOS (2012) : barre bleue « facebook », bandeau Statut / Photo / Lieu, fil de
// cartes (publications des 4 persos + pages suivies par ce téléphone).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { loreNowMs, loreToMs, msToLore } from "../lib/loreTime";
import { StatusBar } from "../phone/IOSChrome";
import { LORE_DATE_DEFAULT, useOS } from "../phone/common";
import { Avatar, Empty, useEditor } from "../kit/kit";
import { Icon } from "../kit/icons";
import { num, useChars } from "./social";
import "./social.css";

type FbPost = { author?: string; name?: string; text?: string; time?: string; likes?: number; comments?: number; img?: string; order?: number; deleted?: boolean };

export default function FacebookApp({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const chars = useChars();
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const posts = useList<FbPost>("feeds/facebookPosts");
  const pages = useList<FbPost>(`phones/${pid}/data/facebookPages/${pid}`);
  const [status, setStatus] = useState(false);
  const [text, setText] = useState("");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const ed = useEditor(pid);
  const feed = [
    ...posts.map(([id, p]) => ({ key: `f/${id}`, path: `feeds/facebookPosts/${id}`, p, page: false })),
    ...pages.map(([id, p]) => ({ key: `p/${id}`, path: `phones/${pid}/data/facebookPages/${pid}/${id}`, p, page: true })),
  ].sort((a, b) => (loreToMs(b.p.time) ?? 0) - (loreToMs(a.p.time) ?? 0));
  const post = () => {
    if (!text.trim()) return;
    ed.write({ [`feeds/facebookPosts/fb_${Date.now().toString(36)}`]: { author: pid, name: chars[pid]?.name ?? pid, text: text.trim(), time: msToLore(loreNowMs(lore)), likes: 0, comments: 0, order: Date.now() } });
    setText(""); setStatus(false);
  };
  return (
    <div className={`app fb ${os}`}>
      <StatusBar />
      <div className="fb-bar">
        <button className="fb-btn" onClick={() => nav(`/${pid}/home`)} aria-label="Retour"><Icon name="list" size={18} /></button>
        <h1>facebook</h1>
        <button className="fb-btn" aria-label="Discussions"><Icon name="people" size={18} /></button>
      </div>
      <div className="fb-scroll">
        <div className="fb-publisher">
          <button onClick={() => ed.canEdit && setStatus(true)}>✎ Status</button><button>📷 Photo</button><button>📍 Check In</button>
        </div>
        {status && (
          <div className="fb-card fb-composer">
            <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="What's on your mind?" />
            <div><button onClick={() => setStatus(false)}>Cancel</button><button className="post" onClick={post}>Post</button></div>
          </div>
        )}
        {feed.map(({ key, path, p, page }) => {
          const c = p.author ? chars[p.author] : undefined;
          const mine = p.author === pid || page;
          return (
            <div key={key} className="fb-card" onContextMenu={(e) => { if (ed.canEdit && mine) { e.preventDefault(); ed.edit({ path, fields: ["name", "text", "time", "likes", "comments", "img"], title: "Publication" }); } }}>
              <div className="fb-head">
                <Avatar src={c?.avatar} name={p.name ?? c?.name} size={40} round={false} color={page ? "#3b5998" : undefined} />
                <div><b>{p.name ?? c?.name}</b><span>{p.time}</span></div>
              </div>
              {p.text && <p className="fb-text">{p.text}</p>}
              {p.img && <img className="fb-img" src={p.img} alt="" loading="lazy" />}
              {(p.likes || p.comments) ? <div className="fb-counts">👍 {num((p.likes ?? 0) + (liked[key] ? 1 : 0))}{p.comments ? ` · ${num(p.comments)} comments` : ""}</div> : null}
              <div className="fb-acts"><button className={liked[key] ? "on" : ""} onClick={() => setLiked((l) => ({ ...l, [key]: !l[key] }))}>👍 Like</button><button>💬 Comment</button></div>
            </div>
          );
        })}
        {feed.length === 0 && <Empty>No stories</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}
