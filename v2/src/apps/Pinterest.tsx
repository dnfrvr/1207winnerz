// Pinterest pour iPhone (2012) : barre blanche au logo rouge, mosaïque deux colonnes d'épingles.
import { useNavigate } from "react-router-dom";
import { useList } from "../data/hooks";
import { img } from "../lib/img";
import { StatusBar } from "../phone/IOSChrome";
import { Empty, useEditor } from "../kit/kit";
import { Icon } from "../kit/icons";
import { compact } from "./social";
import "./social.css";

type Pin = { board?: string; desc?: string; emoji?: string; img?: string; pinner?: string; repins?: number; tall?: boolean; order?: number; deleted?: boolean };

export default function PinterestApp({ pid }: { pid: string }) {
  const nav = useNavigate();
  const pins = useList<Pin>(`phones/${pid}/data/pinterest`);
  const ed = useEditor(pid);
  const path = `phones/${pid}/data/pinterest`;
  const fields = ["img", "desc", "board", "pinner", "repins", "emoji", "tall"];
  const cols: [string, Pin][][] = [[], []];
  pins.forEach((p, i) => cols[i % 2].push(p));
  return (
    <div className="app pi">
      <StatusBar />
      <div className="pi-bar">
        <button onClick={() => nav(`/${pid}/home`)} aria-label="Retour"><Icon name="back" size={20} /></button>
        <h1>Pinterest</h1>
        <button aria-label="Épingler" disabled={!ed.canEdit} onClick={() => ed.add(path, { img: "", desc: "", board: "", pinner: "", repins: 0, tall: false }, { atStart: true, title: "Nouvelle épingle", fields })}><Icon name="plus" size={20} /></button>
      </div>
      <div className="pi-scroll">
        <div className="pi-cols">
          {cols.map((col, ci) => (
            <div key={ci} className="pi-col">
              {col.map(([id, p]) => (
                <div key={id} className="pi-pin" onContextMenu={(e) => { if (ed.canEdit) { e.preventDefault(); ed.itemLong(path, id, { fields, label: p.desc })?.(); } }}>
                  {p.img ? <img src={img(p.img)} alt="" loading="lazy" style={{ aspectRatio: p.tall ? "3/4" : undefined }} /> : <div className="pi-emoji">{p.emoji}</div>}
                  <p>{p.desc}</p>
                  <div className="pi-stats">{compact(p.repins)} repins</div>
                  <div className="pi-by"><b>{p.pinner}</b> onto {p.board}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        {pins.length === 0 && <Empty>Aucune épingle</Empty>}
      </div>
      {ed.ui}
    </div>
  );
}
