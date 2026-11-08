// Photos (iOS 6) / Galerie (Android 4.1). Pellicule, albums, « Récemment supprimés » (photos
// supprimées dans la fiction), visionneuse plein écran.
import { useState } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useList } from "../data/hooks";
import { img } from "../lib/img";
import { loreToMs } from "../lib/loreTime";
import { AppFrame, BackButton, StatusBar } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { AddButton, Empty, useEditor } from "../kit/kit";
import { Icon } from "../kit/icons";
import "./photos.css";

type Photo = { src?: string; date?: string; album?: string | null; color?: string; deleted?: boolean; order?: number };

const ROLL = "camera-roll", DELETED = "deleted";
// Image injoignable (stockage externe hors ligne) : on la masque plutôt que d'afficher l'icône cassée.
const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.visibility = "hidden"; };

function usePhotos(pid: string) {
  const all = useList<Photo>(`phones/${pid}/data/gallery`, { withDeleted: true });
  // Pellicule : de la plus ancienne (en haut) à la plus récente (en bas), comme sur iOS.
  const sorted = [...all].sort((a, b) => (loreToMs(a[1].date) ?? 0) - (loreToMs(b[1].date) ?? 0) || (a[1].order ?? 0) - (b[1].order ?? 0));
  const live = sorted.filter(([, p]) => !p.deleted);
  const albums = [...new Set(live.map(([, p]) => p.album).filter((a): a is string => !!a))];
  const pick = (album: string) => album === ROLL ? live : album === DELETED ? sorted.filter(([, p]) => p.deleted) : live.filter(([, p]) => p.album === album);
  return { live, albums, pick, deletedCount: sorted.length - live.length };
}

export default function PhotosApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<Albums pid={pid} />} />
      <Route path=":album" element={<Grid pid={pid} />} />
      <Route path=":album/:photo" element={<Viewer pid={pid} />} />
    </Routes>
  );
}

function Albums({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const { live, albums, pick, deletedCount } = usePhotos(pid);
  const ed = useEditor(pid);
  const rows = [
    { id: ROLL, name: os === "ios" ? "Camera Roll" : "Camera", n: live.length },
    ...albums.map((a) => ({ id: a, name: a, n: pick(a).length })),
    ...(deletedCount ? [{ id: DELETED, name: os === "ios" ? "Recently Deleted" : "Corbeille", n: deletedCount }] : []),
  ];
  const cover = (id: string) => { const l = pick(id); return l[l.length - 1]?.[1].src; };
  return (
    <AppFrame title={os === "ios" ? "Albums" : "Gallery"} left={<BackButton to={`/${pid}/home`} label="Accueil" />}
      right={<AddButton show={ed.canEdit} onClick={() => ed.add(`phones/${pid}/data/gallery`, { src: "", date: "6 oct, 12:00pm", album: null, deleted: false }, { title: "Nouvelle photo", fields: ["src", "date", "album"] })} />}
      bodyClass={os === "ios" ? "ph-albums" : "ph-albums and"}>
      {os === "ios" ? (
        <ul className="ph-album-list">
          {rows.map((r) => (
            <li key={r.id}><button onClick={() => nav(encodeURIComponent(r.id))}>
              <span className="thumb">{cover(r.id) ? <img src={img(cover(r.id))} alt="" loading="lazy" onError={hideBroken} /> : null}</span>
              <span className="name">{r.name}</span><span className="count">({r.n})</span><span className="chev">›</span>
            </button></li>
          ))}
        </ul>
      ) : (
        <div className="ph-album-grid">
          {rows.map((r) => (
            <button key={r.id} onClick={() => nav(encodeURIComponent(r.id))}>
              {cover(r.id) ? <img src={img(cover(r.id))} alt="" loading="lazy" onError={hideBroken} /> : <span className="ph-none" />}
              <span className="lbl"><b>{r.name}</b><i>{r.n}</i></span>
            </button>
          ))}
        </div>
      )}
      {ed.ui}
    </AppFrame>
  );
}

function Grid({ pid }: { pid: string }) {
  const { album = ROLL, app = "photos" } = useParams();
  const os = useOS();
  const nav = useNavigate();
  const { pick } = usePhotos(pid);
  const list = pick(decodeURIComponent(album));
  const ed = useEditor(pid);
  const name = album === ROLL ? (os === "ios" ? "Camera Roll" : "Camera") : album === DELETED ? (os === "ios" ? "Recently Deleted" : "Corbeille") : decodeURIComponent(album);
  return (
    <AppFrame title={name} left={<BackButton to={`/${pid}/${app}`} label="Albums" />}
      bodyClass={`ph-grid-wrap ${os}`}>
      {album === DELETED && <div className="ph-note">{os === "ios" ? "These photos will be deleted after 30 days." : "Les éléments seront supprimés définitivement après 30 jours."}</div>}
      <div className="ph-grid">
        {list.map(([id, p], i) => (
          <PhotoThumb key={id} p={p} onClick={() => nav(String(i))}
            onLong={ed.itemLong(`phones/${pid}/data/gallery`, id, { fields: ["src", "date", "album", "deleted"],
              extra: p.deleted ? [{ label: "Restaurer", onPress: () => ed.write({ [`phones/${pid}/data/gallery/${id}/deleted`]: false }) }] : [] })} />
        ))}
      </div>
      {list.length === 0 ? <Empty>No Photos</Empty> : <div className="ph-count">{list.length} Photo{list.length > 1 ? "s" : ""}</div>}
      {ed.ui}
    </AppFrame>
  );
}

function PhotoThumb({ p, onClick, onLong }: { p: Photo; onClick: () => void; onLong?: () => void }) {
  const [lp] = useState(() => ({ t: 0 as ReturnType<typeof setTimeout> | 0, fired: false }));
  return (
    <button className="ph-cell" style={{ background: p.color ?? "#222" }}
      onPointerDown={() => { lp.fired = false; if (onLong) lp.t = setTimeout(() => { lp.fired = true; onLong(); }, 450); }}
      onPointerUp={() => lp.t && clearTimeout(lp.t)} onPointerLeave={() => lp.t && clearTimeout(lp.t)}
      onContextMenu={(e) => { e.preventDefault(); if (onLong) { lp.fired = true; onLong(); } }}
      onClick={() => { if (!lp.fired) onClick(); }}>
      {p.src && <img src={img(p.src)} alt="" loading="lazy" draggable={false} onError={hideBroken} />}
    </button>
  );
}

function Viewer({ pid }: { pid: string }) {
  const { album = ROLL, photo = "0", app: appId = "photos" } = useParams();
  const os = useOS();
  const nav = useNavigate();
  const { pick } = usePhotos(pid);
  const list = pick(decodeURIComponent(album));
  const i = Math.min(Number(photo), Math.max(0, list.length - 1));
  const p = list[i]?.[1];
  const [chrome, setChrome] = useState(true);
  const go = (d: number) => { const j = i + d; if (j >= 0 && j < list.length) nav(`/${pid}/${appId}/${album}/${j}`, { replace: true }); };
  return (
    <div className={`app ph-viewer ${chrome ? "" : "bare"}`}>
      <StatusBar variant="translucent" />
      <div className="ph-vbar">
        <button onClick={() => nav(`/${pid}/${appId}/${album}`)}>{os === "ios" ? "‹ Retour" : <Icon name="back" size={22} />}</button>
        <h1>{i + 1} of {list.length}</h1>
        <span />
      </div>
      <div className="ph-stage" onClick={() => setChrome((c) => !c)}>
        {p?.src ? <img src={img(p.src)} alt="" /> : <div className="ph-blank" style={{ background: p?.color }} />}
      </div>
      <div className="ph-vtools">
        <button onClick={() => go(-1)} disabled={i === 0}><Icon name="prev" /></button>
        <span className="ph-date">{p?.date}</span>
        <button onClick={() => go(1)} disabled={i >= list.length - 1}><Icon name="next" /></button>
      </div>
    </div>
  );
}
