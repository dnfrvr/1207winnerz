// YouTube (application Google, septembre 2012) : barre sombre au logo, liste de vidéos à
// vignettes, page de lecture noire avec bouton lecture.
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { img } from "../lib/img";
import { StatusBar } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { AddButton, Empty, useEditor } from "../kit/kit";
import { Icon } from "../kit/icons";
import "./social.css";

type Video = { title?: string; ch?: string; chAvatar?: string; dur?: string; views?: string; age?: string; thumb?: string; thumbImg?: string; order?: number; deleted?: boolean };
const fields = ["title", "ch", "chAvatar", "dur", "views", "age", "thumbImg"];

export default function YouTubeApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<List pid={pid} />} />
      <Route path="v/:id" element={<Watch pid={pid} />} />
    </Routes>
  );
}

function Bar({ back, right }: { back: string; right?: React.ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="yt-bar">
      <button onClick={() => nav(back)} aria-label="Retour"><Icon name="back" size={20} /></button>
      <h1><span className="yt-you">You</span><span className="yt-tube">Tube</span></h1>
      <span className="yt-r">{right}</span>
    </div>
  );
}

function List({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const path = `phones/${pid}/data/youtubeVideos/${pid}`;
  const vids = useList<Video>(path);
  const ed = useEditor(pid);
  return (
    <div className={`app yt ${os}`}>
      <StatusBar />
      <Bar back={`/${pid}/home`} right={<AddButton show={ed.canEdit} onClick={() => ed.add(path, { title: "", ch: "", dur: "3:00", views: "0 vues", age: "1j", thumbImg: "" }, { atStart: true, title: "Nouvelle vidéo", fields })} />} />
      <div className="yt-scroll">
        <div className="yt-section">Recommandé pour vous</div>
        {vids.map(([id, v]) => (
          <button key={id} className="yt-row" onClick={() => nav(`v/${id}`)}
            onContextMenu={(e) => { if (ed.canEdit) { e.preventDefault(); ed.itemLong(path, id, { fields, label: v.title })?.(); } }}>
            <span className="yt-thumb" style={{ background: v.thumb }}>{v.thumbImg && <img src={img(v.thumbImg)} alt="" loading="lazy" />}<i>{v.dur}</i></span>
            <span className="yt-info"><b>{v.title}</b><span>{v.ch}</span><span>{v.views} · {v.age}</span></span>
          </button>
        ))}
        {vids.length === 0 && <Empty>Aucune vidéo</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}

function Watch({ pid }: { pid: string }) {
  const { id = "" } = useParams();
  const v = useValue<Video>(`phones/${pid}/data/youtubeVideos/${pid}/${id}`) ?? {};
  return (
    <div className="app yt">
      <StatusBar />
      <Bar back={`/${pid}/youtube`} />
      <div className="yt-player" style={{ background: v.thumb ?? "#000" }}>
        {v.thumbImg && <img src={img(v.thumbImg)} alt="" />}
        <span className="yt-play">▶</span>
        <div className="yt-progress"><i /></div>
      </div>
      <div className="yt-scroll yt-detail">
        <h2>{v.title}</h2>
        <div className="yt-views">{v.views} · {v.age}</div>
        <div className="yt-like"><span>👍 Like</span><span>👎</span><span>↗ Share</span></div>
        <div className="yt-ch"><span className="yt-chav">{v.chAvatar}</span><b>{v.ch}</b><button>Subscribe</button></div>
      </div>
    </div>
  );
}
