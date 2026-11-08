// Facebook pour iOS (5.x, 2012) : barre bleue « facebook », bandeau Status / Photo / Check In, fil
// de cartes (publications des 4 persos + pages suivies par ce téléphone).
// Android (2012) : barre bleue plate, bouton menu + trois « jewels », police Roboto.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { loreNowMs, loreToMs, msToLore } from "../lib/loreTime";
import { StatusBar } from "../phone/IOSChrome";
import { LORE_DATE_DEFAULT, useOS } from "../phone/common";
import { img } from "../lib/img";
import { Avatar, Empty, useEditor } from "../kit/kit";
import { mdiAccountMultiple, mdiCamera, mdiCommentOutline, mdiEarth, mdiMapMarker, mdiMenu, mdiMessageText, mdiPencil, mdiThumbUp } from "@mdi/js";
import { Glyph } from "../kit/glyph";
import { num, Press, useChars } from "./social";
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
        <button className="fb-btn" onClick={() => nav(`/${pid}/home`)} aria-label="Menu"><Glyph i={mdiMenu} size={20} /></button>
        {os === "android" ? (
          // Facebook pour Android (2012) : pas de logo, les trois « jewels » au centre.
          <div className="fb-jewels"><Glyph i={mdiAccountMultiple} size={22} /><Glyph i={mdiMessageText} size={20} /><Glyph i={mdiEarth} size={21} /></div>
        ) : <h1>facebook</h1>}
        <button className="fb-btn" aria-label="Discussions"><Glyph i={mdiAccountMultiple} size={20} /></button>
      </div>
      <div className="fb-scroll">
        <div className="fb-publisher">
          <button onClick={() => ed.canEdit && setStatus(true)}><Glyph i={mdiPencil} size={15} /> Status</button><button><Glyph i={mdiCamera} size={15} /> Photo</button><button><Glyph i={mdiMapMarker} size={15} /> Check In</button>
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
            <Press key={key} className="fb-card" onLong={ed.canEdit && mine ? () => ed.edit({ path, fields: ["name", "text", "time", "likes", "comments", "img"], title: "Publication" }) : undefined}>
              <div className="fb-head">
                <Avatar src={c?.avatar} name={p.name ?? c?.name} size={40} round={false} color={page ? "#3b5998" : undefined} />
                <div><b>{p.name ?? c?.name}</b><span>{p.time}</span></div>
              </div>
              {p.text && <p className="fb-text">{p.text}</p>}
              {p.img && <img className="fb-img" src={img(p.img)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
              {(p.likes || p.comments || liked[key]) ? <div className="fb-counts"><Glyph i={mdiThumbUp} size={12} /> {num((p.likes ?? 0) + (liked[key] ? 1 : 0))}{p.comments ? ` · ${num(p.comments)} comments` : ""}</div> : null}
              <div className="fb-acts"><button className={liked[key] ? "on" : ""} onClick={() => setLiked((l) => ({ ...l, [key]: !l[key] }))}><Glyph i={mdiThumbUp} size={14} /> {liked[key] ? "Unlike" : "Like"}</button><button><Glyph i={mdiCommentOutline} size={14} /> Comment</button></div>
            </Press>
          );
        })}
        {feed.length === 0 && <Empty>No stories</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}
