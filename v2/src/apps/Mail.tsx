// Mail iOS 6 (boîtes, liste à points bleus, message) / Gmail Android 4.1.
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useList, useValue } from "../data/hooks";
import { AppFrame, BackButton } from "../phone/IOSChrome";
import { useOS } from "../phone/common";
import { AddButton, Cell, Empty, Grouped, Plain, Section, Toolbar, useEditor } from "../kit/kit";
import { Glyph } from "../kit/glyph";
import {
  mdiArchiveArrowDownOutline, mdiDeleteOutline, mdiEmailOutline, mdiFileDocumentEditOutline, mdiFolderMove, mdiInboxArrowDown, mdiMagnify, mdiPencil,
  mdiRefresh, mdiReply, mdiSend, mdiSquareEditOutline, mdiStar, mdiStarOutline, mdiTagOutline, mdiTrashCan, mdiEmailPlusOutline,
} from "@mdi/js";
import "./mail.css";

type MailItem = { from?: string; to?: string; subj?: string; preview?: string; body?: string; time?: string; unread?: boolean; order?: number; deleted?: boolean };
const BOXES: { id: string; ios: string; and: string; icon: string }[] = [
  { id: "inbox", ios: "Inbox", and: "Inbox", icon: mdiInboxArrowDown },
  { id: "drafts", ios: "Drafts", and: "Brouillons", icon: mdiFileDocumentEditOutline },
  { id: "sent", ios: "Sent", and: "Sent", icon: mdiSend },
  { id: "trash", ios: "Trash", and: "Corbeille", icon: mdiTrashCan },
];
const FIELDS = ["from", "to", "subj", "preview", "body", "time", "unread"];

export default function MailApp({ pid }: { pid: string }) {
  return (
    <Routes>
      <Route index element={<Mailboxes pid={pid} />} />
      <Route path=":box" element={<Box pid={pid} />} />
      <Route path=":box/:id" element={<Message pid={pid} />} />
    </Routes>
  );
}

function Mailboxes({ pid }: { pid: string }) {
  const os = useOS();
  const nav = useNavigate();
  const counts = BOXES.map((b) => useList<MailItem>(`phones/${pid}/data/mail/${b.id}`));
  const email = useValue<string>(`phones/${pid}/data/mailEmail`);
  if (os === "android") return <Box pid={pid} forced="inbox" />;
  return (
    <AppFrame title="Mailboxes" left={<BackButton to={`/${pid}/home`} label="Home" />}>
      <Grouped>
        <Section title={email ?? "UMA"}>
          {BOXES.map((b, i) => {
            const unread = b.id === "inbox" ? counts[i].filter(([, m]) => m.unread).length : counts[i].length;
            return <Cell key={b.id} icon={<span className="ml-box"><Glyph i={b.icon} size={22} /></span>} title={b.ios} chevron onClick={() => nav(b.id)}
              accessory={unread ? <span className="ml-count">{unread}</span> : undefined} />;
          })}
        </Section>
      </Grouped>
    </AppFrame>
  );
}

function Box({ pid, forced }: { pid: string; forced?: string }) {
  const params = useParams();
  const box = forced ?? params.box ?? "inbox";
  const os = useOS();
  const nav = useNavigate();
  const path = `phones/${pid}/data/mail/${box}`;
  const list = useList<MailItem>(path, { newest: "time" });
  const ed = useEditor(pid);
  const meta = BOXES.find((b) => b.id === box) ?? BOXES[0];
  const unread = list.filter(([, m]) => m.unread).length;
  return (
    <AppFrame title={os === "ios" ? `${meta.ios}${box === "inbox" && unread ? ` (${unread})` : ""}` : meta.and}
      left={<BackButton to={os === "ios" ? `/${pid}/gmail` : `/${pid}/home`} label={os === "ios" ? "Mailboxes" : "Home"} />}
      right={<AddButton show={ed.canEdit} onClick={() => ed.add(path, { from: "", subj: "", preview: "", body: "", time: "08:00", unread: true }, { atStart: true, title: "Nouveau mail", fields: FIELDS })} />}
      bodyClass={`ml ${os} k-body-tabbed`}>
      <div className="k-tab-scroll">
        <Plain>
          {list.map(([id, m]) => (
            <button key={id} className={`ml-row ${m.unread ? "unread" : ""}`} onClick={() => { if (m.unread && ed.canEdit) ed.write({ [`${path}/${id}/unread`]: false }); nav(`/${pid}/gmail/${box}/${id}`); }}
              onContextMenu={(e) => { e.preventDefault(); ed.itemLong(path, id, { fields: FIELDS, label: m.subj })?.(); }}>
              {os === "android" ? <span className="ml-label" /> : <span className="ml-dot">{m.unread && <i />}</span>}
              <span className="ml-main">
                <span className="ml-top"><b>{m.from}</b><span>{m.time}</span></span>
                <span className="ml-subj">{m.subj}</span>
                <span className="ml-prev">{m.preview}</span>
              </span>
              {os === "android" && <span className="ml-star"><Glyph i={m.unread ? mdiStar : mdiStarOutline} size={20} /></span>}
            </button>
          ))}
          {list.length === 0 && <Empty>No Mail</Empty>}
        </Plain>
      </div>
      {os === "ios"
        ? <Toolbar><button aria-label="Check mail"><Glyph i={mdiRefresh} size={22} /></button><span className="ml-upd">Updated Just Now</span><button aria-label="New message"><Glyph i={mdiSquareEditOutline} size={22} /></button></Toolbar>
        : <Toolbar><button aria-label="New message"><Glyph i={mdiEmailPlusOutline} size={24} /></button><button aria-label="Search"><Glyph i={mdiMagnify} size={24} /></button><button aria-label="Labels"><Glyph i={mdiTagOutline} size={24} /></button><button aria-label="Refresh"><Glyph i={mdiRefresh} size={24} /></button></Toolbar>}
      {ed.ui}
    </AppFrame>
  );
}

function Message({ pid }: { pid: string }) {
  const { box = "inbox", id = "" } = useParams();
  const os = useOS();
  const m = useValue<MailItem>(`phones/${pid}/data/mail/${box}/${id}`) ?? {};
  const email = useValue<string>(`phones/${pid}/data/mailEmail`);
  const ed = useEditor(pid);
  return (
    <AppFrame title={os === "ios" ? "" : m.subj} left={<BackButton to={`/${pid}/gmail/${box}`} label={BOXES.find((b) => b.id === box)?.ios ?? "Inbox"} />}
      right={ed.canEdit ? <button className="barbtn" aria-label="Edit" onClick={() => ed.edit({ path: `phones/${pid}/data/mail/${box}/${id}`, fields: FIELDS, title: "Mail" })}>{os === "ios" ? "Edit" : <Glyph i={mdiPencil} size={22} />}</button> : undefined}
      bodyClass={`ml-msg ${os} k-body-tabbed`}>
      <div className="k-tab-scroll">
        <div className="ml-head">
          <div><span>From:</span> <b className="ml-from">{m.from}</b></div>
          <div><span>To:</span> <b className="ml-to">{m.to ?? email ?? "Me"}</b></div>
          <h2>{m.subj}</h2>
          <div className="ml-date">{m.time}</div>
        </div>
        <div className="ml-body">{m.body || m.preview}</div>
      </div>
      {os === "ios"
        ? <Toolbar><button aria-label="Move"><Glyph i={mdiFolderMove} size={22} /></button><button aria-label="Delete"><Glyph i={mdiTrashCan} size={22} /></button><button aria-label="Reply"><Glyph i={mdiReply} size={24} /></button><button aria-label="New message"><Glyph i={mdiSquareEditOutline} size={22} /></button></Toolbar>
        : <Toolbar><button aria-label="Archive"><Glyph i={mdiArchiveArrowDownOutline} size={24} /></button><button aria-label="Delete"><Glyph i={mdiDeleteOutline} size={24} /></button><button aria-label="Labels"><Glyph i={mdiTagOutline} size={24} /></button><button aria-label="Mark as unread"><Glyph i={mdiEmailOutline} size={24} /></button></Toolbar>}
      {ed.ui}
    </AppFrame>
  );
}
