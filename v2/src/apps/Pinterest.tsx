// Pinterest pour iPhone (1.x, 2012) : barre blanche au logo manuscrit rouge, mosaïque deux
// colonnes d'épingles, barre d'onglets sombre avec le bouton « Pin » rouge au centre.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { mdiAccount, mdiCamera, mdiCompassOutline, mdiHome, mdiMessageText, mdiPlus, mdiPin } from "@mdi/js";
import { useList } from "../data/hooks";
import { img } from "../lib/img";
import { StatusBar, BarBack } from "../phone/IOSChrome";
import { Empty, useEditor } from "../kit/kit";
import { Glyph } from "../kit/glyph";
import { compact, Press } from "./social";
import "./social.css";

type Pin = { board?: string; desc?: string; emoji?: string; img?: string; pinner?: string; repins?: number; tall?: boolean; order?: number; deleted?: boolean };

export default function PinterestApp({ pid }: { pid: string }) {
  const nav = useNavigate();
  const pins = useList<Pin>(`phones/${pid}/data/pinterest`);
  const ed = useEditor(pid);
  const [tab, setTab] = useState("home");
  const path = `phones/${pid}/data/pinterest`;
  const fields = ["img", "desc", "board", "pinner", "repins", "emoji", "tall"];
  const template = { img: "", desc: "", board: "", pinner: "", repins: 0, tall: false };
  const cols: [string, Pin][][] = [[], []];
  pins.forEach((p, i) => cols[i % 2].push(p));
  const add = () => ed.add(path, template, { atStart: true, title: "Nouvelle épingle", fields });
  return (
    <div className="app pi">
      <StatusBar />
      <div className="pi-bar">
        <BarBack onClick={() => nav(`/${pid}/home`)} label="Accueil" tone="light" />
        <h1>Pinterest</h1>
        <button aria-label="Épingler" disabled={!ed.canEdit} onClick={add}><Glyph i={mdiPlus} size={22} /></button>
      </div>
      <div className="pi-scroll">
        <div className="pi-cols">
          {cols.map((col, ci) => (
            <div key={ci} className="pi-col">
              {col.map(([id, p]) => (
                <Press key={id} className="pi-pin" onLong={ed.itemLong(path, id, { fields, label: p.desc, template })}>
                  {p.img ? <img src={img(p.img)} alt="" loading="lazy" style={{ aspectRatio: p.tall ? "3/4" : undefined }} /> : <div className="pi-emoji">{p.emoji}</div>}
                  <p>{p.desc}</p>
                  <div className="pi-stats"><Glyph i={mdiPin} size={11} /> {compact(p.repins)} repins</div>
                  <div className="pi-by"><b>{p.pinner}</b> onto <b>{p.board}</b></div>
                </Press>
              ))}
            </div>
          ))}
        </div>
        {pins.length === 0 && <Empty>Aucune épingle</Empty>}
      </div>
      <div className="pi-tabs">
        <button className={tab === "home" ? "on" : ""} onClick={() => setTab("home")}><Glyph i={mdiHome} size={24} /><span>Home</span></button>
        <button className={tab === "explore" ? "on" : ""} onClick={() => setTab("explore")}><Glyph i={mdiCompassOutline} size={24} /><span>Explore</span></button>
        <button className="pi-cam" onClick={() => nav(`/${pid}/camera`)} aria-label="Pin it"><Glyph i={mdiCamera} size={22} /></button>
        <button className={tab === "news" ? "on" : ""} onClick={() => setTab("news")}><Glyph i={mdiMessageText} size={24} /><span>News</span></button>
        <button className={tab === "me" ? "on" : ""} onClick={() => setTab("me")}><Glyph i={mdiAccount} size={24} /><span>Profile</span></button>
      </div>
      {ed.ui}
    </div>
  );
}
