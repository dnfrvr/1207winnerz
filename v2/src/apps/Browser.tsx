// Safari iOS 6 (barre d'adresse + champ Google, barre d'outils du bas, signets, historique)
// / Navigateur Android 4.1. Une page s'affiche comme un résultat Google 2012 ou une page simple.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useList } from "../data/hooks";
import { StatusBar } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { Cell, Empty, Plain, PlainHeader, Segmented, useEditor } from "../kit/kit";
import { Icon } from "../kit/icons";
import { Glyph, IOS_ACTION } from "../kit/glyph";
import { mdiBookmarkOutline, mdiBookOpenVariant, mdiClockOutline, mdiEarth, mdiHistory, mdiMenuLeft, mdiMenuRight, mdiRefresh, mdiStarOutline, mdiChevronLeft } from "@mdi/js";
import "./browser.css";

type Link = { title?: string; url?: string; time?: string; order?: number; deleted?: boolean };

export default function BrowserApp({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const bookmarks = useList<Link>(`phones/${pid}/data/browser/bookmarks`);
  const history = useList<Link>(`phones/${pid}/data/browser/history`);
  const ed = useEditor(pid);
  const [page, setPage] = useState<Link | null>(() => history[0]?.[1] ?? null);
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState("bookmarks");
  const open = (l: Link) => { setPage(l); setSheet(false); };
  const fields = ["title", "url", "time"];
  const isSearch = /google\./.test(page?.url ?? "") && /search/.test(page?.url ?? "");

  return (
    <div className={`app br ${os}`}>
      <StatusBar />
      <div className="br-top">
        {os === "ios" ? (
          <>
            <div className="br-title">{page?.title ?? "Untitled"}</div>
            <div className="br-fields">
              <div className="br-url"><span>{page?.url ? `http://${page.url.replace(/^https?:\/\//, "")}` : "Go to this address"}</span><Glyph i={mdiRefresh} size={16} color="#7a7a7a" /></div>
              <div className="br-q"><Icon name="search" size={12} /> Google</div>
            </div>
          </>
        ) : (
          <div className="br-and">
            <span className="br-globe"><Glyph i={mdiEarth} size={20} /></span>
            <div className="br-url">{page?.url ?? "Rechercher ou saisir une URL"}</div>
            <button aria-label="Onglets"><span className="br-tabs-ic">1</span></button>
            <button onClick={() => setSheet(true)} aria-label="Favoris"><Glyph i={mdiBookmarkOutline} size={22} /></button>
          </div>
        )}
      </div>
      <div className="br-page">
        {!page ? <Empty>Aucune page ouverte</Empty> : isSearch ? (
          <div className="br-google">
            <div className="br-glogo"><b style={{ color: "#4285f4" }}>G</b><b style={{ color: "#ea4335" }}>o</b><b style={{ color: "#fbbc05" }}>o</b><b style={{ color: "#4285f4" }}>g</b><b style={{ color: "#34a853" }}>l</b><b style={{ color: "#ea4335" }}>e</b></div>
            <div className="br-gq">{page.title}</div>
            <div className="br-gtabs"><b>Web</b><span>Images</span><span>Maps</span><span>News</span></div>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="br-res"><a>{page.title} {["– Wikipedia, the free encyclopedia", "| Tumblr", "– YouTube", "– News & Photos"][i]}</a><cite>{["en.wikipedia.org", "www.tumblr.com", "www.youtube.com", "www.eonline.com"][i]}/…</cite><p>Résultats pour « {page.title} ». Consultez les dernières informations, photos et vidéos…</p></div>
            ))}
          </div>
        ) : (
          <div className="br-site">
            <div className="br-site-head">{(page.url ?? "").split("/")[0]}</div>
            <h1>{page.title}</h1>
            <p className="br-lorem">{page.url}</p>
            <div className="br-blocks"><i /><i /><i style={{ width: "70%" }} /><i /><i style={{ width: "50%" }} /></div>
          </div>
        )}
      </div>
      {/* Safari iOS 6 : ◀ ▶ action signets onglets. Le navigateur Jelly Bean n'a pas de barre du bas. */}
      {os === "ios" && (
        <div className="br-tools">
          <button onClick={() => nav(`/${pid}/home`)} aria-label="Retour"><Glyph i={mdiMenuLeft} size={38} /></button>
          <button disabled aria-label="Suivant"><Glyph i={mdiMenuRight} size={38} /></button>
          <button aria-label="Partager"><Glyph i={IOS_ACTION} size={24} /></button>
          <button onClick={() => setSheet(true)} aria-label="Signets"><Glyph i={mdiBookOpenVariant} size={24} /></button>
          <button aria-label="Onglets"><span className="br-tabs-ic">1</span></button>
        </div>
      )}
      {sheet && (
        <div className="br-sheet">
          <StatusBar />
          {os === "ios" ? (
            <>
              <div className="navbar"><h1>{tab === "bookmarks" ? "Bookmarks" : "History"}</h1><div className="side r"><button className="barbtn blue" onClick={() => setSheet(false)}>Done</button></div></div>
              <Segmented items={[{ id: "bookmarks", label: "Bookmarks" }, { id: "history", label: "History" }]} value={tab} onChange={setTab} />
            </>
          ) : (
            <>
              <div className="actionbar" style={{ background: "#222" }}>
                <button className="ab-up" aria-label="Retour" onClick={() => setSheet(false)}><Glyph i={mdiChevronLeft} size={22} /><span className="ab-icon"><Glyph i={mdiEarth} size={26} color="#33b5e5" /></span></button>
                <h1>Favoris</h1>
              </div>
              <Segmented items={[{ id: "bookmarks", label: "Favoris" }, { id: "history", label: "Historique" }]} value={tab} onChange={setTab} />
            </>
          )}
          <div className="br-list"><Plain>
            {(tab === "bookmarks" ? bookmarks : history).map(([id, l], i, arr) => {
              const day = l.time?.split(",")[0];
              const head = tab === "history" && day !== arr[i - 1]?.[1].time?.split(",")[0];
              return (
                <div key={id}>
                  {head && <PlainHeader>{day}</PlainHeader>}
                  <Cell icon={<span className="br-ic"><Glyph i={tab === "bookmarks" ? (os === "ios" ? mdiBookOpenVariant : mdiStarOutline) : (os === "ios" ? mdiClockOutline : mdiHistory)} size={22} /></span>} title={l.title} subtitle={l.url} onClick={() => open(l)}
                    onLong={ed.itemLong(`phones/${pid}/data/browser/${tab}`, id, { label: l.title, fields, template: { title: "", url: "", time: l.time ?? "" } })} />
                </div>
              );
            })}
            {(tab === "bookmarks" ? bookmarks : history).length === 0 && <Empty>Vide</Empty>}
            {ed.canEdit && <Cell title={<span className="br-add">+ Ajouter</span>} onClick={() => ed.add(`phones/${pid}/data/browser/${tab}`, { title: "", url: "", time: "Aujourd'hui, 12:00pm" }, { atStart: tab === "history", title: tab === "bookmarks" ? "Signet" : "Historique", fields })} />}
          </Plain></div>
          {ed.ui}
        </div>
      )}
    </div>
  );
}
