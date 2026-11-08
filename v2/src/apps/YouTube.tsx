// YouTube (application Google, septembre 2012) : barre sombre au logo You[Tube], bouton « Guide »,
// liste de vidéos à vignettes, page de lecture noire avec le bouton lecture rouge.
// Android (YouTube 4.x, 2012) : barre d'action Holo sombre avec le logo, police Roboto.
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { mdiMagnify, mdiPlay, mdiPlus, mdiShareVariant, mdiThumbDown, mdiThumbUp } from "@mdi/js";
import { useList, useValue } from "../data/hooks";
import { img } from "../lib/img";
import { BarBack, StatusBar } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { Empty, useEditor } from "../kit/kit";
import { Glyph } from "../kit/glyph";
import { HoloBar, Press } from "./social";
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

const Logo = () => <span className="yt-logo"><span className="yt-you">You</span><span className="yt-tube">Tube</span></span>;

function Bar({ back, guide, right }: { back: string; guide?: boolean; right?: React.ReactNode }) {
  const nav = useNavigate();
  const os = useOS();
  if (os === "android") return <HoloBar color="#262626" onUp={() => nav(back)} icon={<Logo />} actions={<><button aria-label="Rechercher"><Glyph i={mdiMagnify} size={24} /></button>{right}</>} />;
  return (
    <div className="yt-bar">
      <BarBack onClick={() => nav(back)} label={guide ? "Accueil" : "Vidéos"} />
      <h1><Logo /></h1>
      <span className="yt-r">{right ?? <button className="yt-bbtn" aria-label="Rechercher"><Glyph i={mdiMagnify} size={20} /></button>}</span>
    </div>
  );
}

function List({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const path = `phones/${pid}/data/youtubeVideos/${pid}`;
  const vids = useList<Video>(path);
  const ed = useEditor(pid);
  const template = { title: "", ch: "", dur: "3:00", views: "0 vues", age: "1j", thumbImg: "" };
  return (
    <div className={`app yt ${os}`}>
      <StatusBar />
      <Bar back={`/${pid}/home`} guide right={ed.canEdit ? <button className="yt-bbtn" aria-label="Ajouter" onClick={() => ed.add(path, template, { atStart: true, title: "Nouvelle vidéo", fields })}><Glyph i={mdiPlus} size={22} /></button> : undefined} />
      <div className="yt-scroll">
        <div className="yt-section">Recommandé pour vous</div>
        {vids.map(([id, v]) => (
          <Press as="button" key={id} className="yt-row" onClick={() => nav(`v/${id}`)} onLong={ed.itemLong(path, id, { fields, label: v.title, template })}>
            <span className="yt-thumb" style={{ background: v.thumb }}>{v.thumbImg && <img src={img(v.thumbImg)} alt="" loading="lazy" />}<i>{v.dur}</i></span>
            <span className="yt-info"><b>{v.title}</b><span>{v.ch}</span><span>{v.views} · {v.age}</span></span>
          </Press>
        ))}
        {vids.length === 0 && <Empty>Aucune vidéo</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}

function Watch({ pid }: { pid: string }) {
  const os = useOS();
  const { id = "" } = useParams();
  const v = useValue<Video>(`phones/${pid}/data/youtubeVideos/${pid}/${id}`) ?? {};
  return (
    <div className={`app yt ${os}`}>
      <StatusBar />
      <Bar back={`/${pid}/youtube`} />
      <div className="yt-player" style={{ background: v.thumb ?? "#000" }}>
        {v.thumbImg && <img src={img(v.thumbImg)} alt="" />}
        <span className="yt-play"><Glyph i={mdiPlay} size={30} /></span>
        <div className="yt-progress"><i /></div>
      </div>
      <div className="yt-scroll yt-detail">
        <h2>{v.title}</h2>
        <div className="yt-views">{v.views} · {v.age}</div>
        <div className="yt-like">
          <span><Glyph i={mdiThumbUp} size={18} /> Like</span>
          <span><Glyph i={mdiThumbDown} size={18} /></span>
          <span><Glyph i={mdiShareVariant} size={18} /> Share</span>
        </div>
        <div className="yt-ch"><span className="yt-chav">{v.chAvatar}</span><b>{v.ch}</b><button>Subscribe</button></div>
      </div>
    </div>
  );
}
