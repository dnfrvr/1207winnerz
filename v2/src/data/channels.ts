// Apps (autres que Messages) dont le MDJ peut envoyer une notif depuis la régie. Chaque « canal »
// sait écrire le vrai contenu dans le téléphone (message, mail, snap, appel manqué…) et la notif
// qui va avec, en une seule écriture. Les notifs gardent l'id de ce qu'elles annoncent (`msg`),
// pour « Annuler l'envoi ».
import { loreNowMs, msToLore } from "../lib/loreTime";
import { makeId, type Json, type Patches } from "./store";
import { notifPatch, type Notif } from "./notify";

export type Field = "contact" | "sender" | "text" | "img" | "subject" | "action";
export type SendInput = { contact: string; text: string; img?: string; sender?: string; subject?: string; action?: string };
type Item = Record<string, Json> & { order?: number; deleted?: boolean };
type List = Record<string, Item> | undefined;

/** Message affiché dans le suivi en direct de la régie. */
export type LiveMsg = { npc: boolean; who?: string; text?: string; img?: string; time?: string };

export type Channel = {
  app: string;              // id de l'app sur le téléphone (icône, pastille, lien)
  label: string;            // nom affiché dans la régie
  fields: Field[];
  contactLabel: string;
  contactHint: string;
  /** Liste où vivent les conversations / éléments de l'app. */
  listPath: (pid: string) => string;
  /** Noms existants proposés dans le champ « De la part de ». */
  names: (list: List) => string[];
  send: (pid: string, input: SendInput, list: List, lore: string) => { patches: Patches; key: string };
  /** Lien de la notif / du bouton « Voir dans le téléphone ». */
  link: (key: string) => string;
  /** Conversation suivie en direct (sinon : simple élément, sans réponse). */
  messages?: (item: Item | undefined) => [string, LiveMsg][];
  msgPath?: (pid: string, key: string, mid: string) => string;
  titleOf: (item: Item | undefined) => string;
};

const norm = (s?: unknown) => String(s ?? "").trim().toLowerCase().normalize("NFKC");
const now = (lore: string) => new Date(loreNowMs(lore));
/** « 7:21pm » (Messenger, GroupMe, Kik). */
const clock12 = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}${d.getHours() < 12 ? "am" : "pm"}`;
/** « 7:21 PM » (Mail, Grindr). */
const clockAP = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const alive = (list: List) => Object.entries(list ?? {}).filter(([, it]) => it && typeof it === "object" && !it.deleted);
const minOrder = (list: List) => Math.min(1000, ...alive(list).map(([, it]) => Number(it.order ?? 0))) - 1000;
const maxOrder = (map: unknown) => Math.max(0, ...Object.values((map ?? {}) as Record<string, Item>).map((m) => Number(m?.order ?? 0)));
const byName = (list: List, field: string, name: string) => alive(list).find(([, it]) => norm(it[field]) === norm(name))?.[0] ?? null;
const sortedMsgs = (map: unknown) => Object.entries((map ?? {}) as Record<string, Item>).filter(([, m]) => m && !m.deleted)
  .sort((a, b) => Number(a[1].order ?? 0) - Number(b[1].order ?? 0));

/**
 * Conversation à fil (Messenger, GroupMe, Kik, Grindr) : trouve ou crée la conversation, ajoute le
 * message du PNJ, remonte la conversation en tête de liste. `seed` = dernier message connu d'une
 * conversation sans fil enregistré (on l'enregistre d'abord, comme le fait l'app).
 */
function threadSend(o: {
  pid: string; list: List; base: string; nameField: string; name: string; msgsField: string;
  msg: Item; newConv: Item; update: (conv: Item) => Item; seed?: (conv: Item) => Item | null;
}) {
  const found = byName(o.list, o.nameField, o.name);
  const key = found ?? makeId("c");
  const cpath = `${o.base}/${key}`;
  const mid = makeId("m");
  const patches: Patches = {};
  const order = minOrder(o.list);
  if (!found) {
    patches[cpath] = { ...o.newConv, [o.nameField]: o.name, order, [o.msgsField]: { [mid]: { ...o.msg, order: 1000 } } } as Json;
  } else {
    const conv = o.list![key];
    const msgs = conv[o.msgsField] as Record<string, Item> | undefined;
    let next = maxOrder(msgs) + 1000;
    if (!sortedMsgs(msgs).length && o.seed) {
      const s = o.seed(conv);
      if (s) { patches[`${cpath}/${o.msgsField}/m0`] = { ...s, order: 1000 } as Json; next = 2000; }
    }
    patches[`${cpath}/${o.msgsField}/${mid}`] = { ...o.msg, order: next } as Json;
    patches[`${cpath}/order`] = order;
    for (const [k, v] of Object.entries(o.update(conv))) patches[`${cpath}/${k}`] = v;
  }
  return { patches, key, mid };
}

const withNotif = (pid: string, r: { patches: Patches; key: string; mid: string }, n: Omit<Notif, "at">) => ({
  patches: { ...r.patches, ...notifPatch(pid, { ...n, msg: r.mid }) }, key: r.key,
});

export const CHANNELS: Channel[] = [
  {
    app: "messenger", label: "Messenger (Facebook)", fields: ["contact", "text", "img"], contactLabel: "De la part de", contactHint: "ex. Cynthia",
    listPath: (pid) => `phones/${pid}/data/messenger`,
    names: (list) => alive(list).map(([, c]) => String(c.name ?? "")).filter(Boolean),
    send: (pid, i, list, lore) => {
      const t = clock12(now(lore));
      const text = i.text.trim();
      const r = threadSend({ pid, list, base: `phones/${pid}/data/messenger`, nameField: "name", name: i.contact, msgsField: "messages",
        msg: { from: i.contact, me: false, text, time: t, ...(i.img ? { img: i.img } : {}) },
        newConv: { last: text || "📷", time: t, unread: true },
        update: () => ({ last: text || "📷", time: t, unread: true }),
        seed: (c) => (c.last ? { text: c.last, time: c.time ?? "", me: false } : null) });
      return withNotif(pid, r, { app: "messenger", title: i.contact, body: text, ...(i.img ? { attach: 1 } : {}), link: `messenger/c/${r.key}` });
    },
    link: (key) => `messenger/c/${key}`,
    messages: (c) => sortedMsgs(c?.messages).map(([id, m]) => [id, { npc: !m.me, text: m.text as string, img: m.img as string, time: m.time as string }]),
    msgPath: (pid, key, mid) => `phones/${pid}/data/messenger/${key}/messages/${mid}`,
    titleOf: (c) => String(c?.name ?? "?"),
  },
  {
    app: "groupme", label: "GroupMe", fields: ["contact", "sender", "text"], contactLabel: "Groupe", contactHint: "ex. UMA Éco 2012 🎓",
    listPath: (pid) => `phones/${pid}/data/groupmeGroups`,
    names: (list) => alive(list).map(([, g]) => String(g.name ?? "")).filter(Boolean),
    send: (pid, i, list, lore) => {
      const t = clock12(now(lore));
      const who = i.sender?.trim() || "?";
      const last = `${who.split(" ")[0]}: ${i.text.trim()}`;
      const r = threadSend({ pid, list, base: `phones/${pid}/data/groupmeGroups`, nameField: "name", name: i.contact, msgsField: "messages",
        msg: { from: who, me: false, text: i.text.trim(), time: t, likes: 0 },
        newConv: { last, time: t, n: 1, members: 2 },
        update: (g) => ({ last, time: t, n: Number(g.n ?? 0) + 1 }),
        seed: (g) => { const m = String(g.last ?? "").match(/^([^:]{1,30}):\s*(.+)$/); return g.last ? { from: m?.[1] ?? "", text: m?.[2] ?? String(g.last), time: g.time ?? "", likes: 0, me: false } : null; } });
      return withNotif(pid, r, { app: "groupme", title: i.contact, body: last, link: `groupme/g/${r.key}` });
    },
    link: (key) => `groupme/g/${key}`,
    messages: (g) => sortedMsgs(g?.messages).map(([id, m]) => [id, { npc: !m.me, who: m.from as string, text: m.text as string, img: m.img as string, time: m.time as string }]),
    msgPath: (pid, key, mid) => `phones/${pid}/data/groupmeGroups/${key}/messages/${mid}`,
    titleOf: (g) => String(g?.name ?? "?"),
  },
  {
    app: "kik", label: "Kik", fields: ["contact", "text"], contactLabel: "De la part de", contactHint: "ex. Niall",
    listPath: (pid) => `phones/${pid}/data/kik`,
    names: (list) => alive(list).map(([, c]) => String(c.name ?? "")).filter(Boolean),
    send: (pid, i, list, lore) => {
      const t = clock12(now(lore));
      const r = threadSend({ pid, list, base: `phones/${pid}/data/kik`, nameField: "name", name: i.contact, msgsField: "messages",
        msg: { from: "them", text: i.text.trim(), time: t },
        newConv: { last: i.text.trim(), time: t, unread: 1 },
        update: (c) => ({ last: i.text.trim(), time: t, unread: Number(c.unread ?? 0) + 1 }) });
      return withNotif(pid, r, { app: "kik", title: i.contact, body: i.text.trim(), link: `kik/c/${r.key}` });
    },
    link: (key) => `kik/c/${key}`,
    messages: (c) => sortedMsgs(c?.messages).map(([id, m]) => [id, { npc: m.from === "them", text: m.text as string, time: m.time as string }]),
    msgPath: (pid, key, mid) => `phones/${pid}/data/kik/${key}/messages/${mid}`,
    titleOf: (c) => String(c?.name ?? "?"),
  },
  {
    app: "grindr", label: "Grindr", fields: ["contact", "text"], contactLabel: "De la part de", contactHint: "ex. Jackson",
    listPath: (pid) => `phones/${pid}/data/grindrDms`,
    names: (list) => alive(list).map(([, c]) => String(c.name ?? "")).filter(Boolean),
    send: (pid, i, list, lore) => {
      const r = threadSend({ pid, list, base: `phones/${pid}/data/grindrDms`, nameField: "name", name: i.contact, msgsField: "thread",
        msg: { from: "them", text: i.text.trim(), time: clockAP(now(lore)) },
        newConv: { distance: "", online: true },
        update: () => ({ online: true }) });
      return withNotif(pid, r, { app: "grindr", title: i.contact, body: i.text.trim(), link: `grindr/chat/${r.key}` });
    },
    link: (key) => `grindr/chat/${key}`,
    messages: (c) => sortedMsgs(c?.thread).map(([id, m]) => [id, { npc: m.from === "them", text: m.text as string, time: m.time as string }]),
    msgPath: (pid, key, mid) => `phones/${pid}/data/grindrDms/${key}/thread/${mid}`,
    titleOf: (c) => String(c?.name ?? "?"),
  },
  {
    app: "gmail", label: "Mail", fields: ["contact", "subject", "text"], contactLabel: "Expéditeur", contactHint: "ex. UMA Registrar",
    listPath: (pid) => `phones/${pid}/data/mail/inbox`,
    names: (list) => [...new Set(alive(list).map(([, m]) => String(m.from ?? "")).filter(Boolean))],
    send: (pid, i, list, lore) => {
      const key = makeId("l");
      const body = i.text.trim();
      const patches: Patches = {
        [`phones/${pid}/data/mail/inbox/${key}`]: { from: i.contact, subj: i.subject?.trim() || "(sans objet)", preview: body.slice(0, 90), body,
          time: clockAP(now(lore)), unread: true, order: minOrder(list) },
      };
      return { patches: { ...patches, ...notifPatch(pid, { app: "gmail", title: i.contact, body: [i.subject?.trim(), body].filter(Boolean).join(" — "), link: `gmail/inbox/${key}`, msg: key }) }, key };
    },
    link: (key) => `gmail/inbox/${key}`,
    titleOf: (m) => `${m?.from ?? "?"} · ${m?.subj ?? ""}`,
  },
  {
    app: "snapchat", label: "Snapchat", fields: ["contact"], contactLabel: "De la part de", contactHint: "ex. Cynthia",
    listPath: (pid) => `phones/${pid}/data/snaps`,
    names: (list) => [...new Set(alive(list).map(([, s]) => String(s.contact ?? "")).filter(Boolean))],
    send: (pid, i, list, lore) => {
      const key = makeId("s");
      const d = now(lore);
      const time = `${MONTHS[d.getMonth()]} ${d.getDate()} at ${clockAP(d).replace(" ", "")}`;
      return { key, patches: {
        [`phones/${pid}/data/snaps/${key}`]: { contact: i.contact, opened: false, sent: false, time, order: minOrder(list) },
        ...notifPatch(pid, { app: "snapchat", title: i.contact, body: "vous a envoyé un Snap 👻", link: "snapchat", msg: key }),
      } };
    },
    link: () => "snapchat",
    titleOf: (s) => `Snap de ${s?.contact ?? "?"}`,
  },
  {
    app: "phone", label: "Téléphone (appel manqué)", fields: ["contact"], contactLabel: "Qui appelle", contactHint: "ex. Maman",
    listPath: (pid) => `phones/${pid}/data/calls`,
    names: (list) => [...new Set(alive(list).map(([, c]) => String(c.contact ?? "")).filter(Boolean))],
    send: (pid, i, list, lore) => {
      const key = makeId("k");
      return { key, patches: {
        [`phones/${pid}/data/calls/${key}`]: { contact: i.contact, type: "missed", time: msToLore(loreNowMs(lore)), duration: "", order: minOrder(list) },
        ...notifPatch(pid, { app: "phone", title: "Missed Call", body: i.contact, link: "phone", msg: key }),
      } };
    },
    link: () => "phone",
    titleOf: (c) => `Appel manqué · ${c?.contact ?? "?"}`,
  },
  {
    app: "insta", label: "Instagram (activité)", fields: ["contact", "action"], contactLabel: "Compte", contactHint: "ex. jungkook97",
    listPath: (pid) => `phones/${pid}/data/notifications`,
    names: (list) => [...new Set(alive(list).filter(([, n]) => n.app === "insta").map(([, n]) => String(n.title ?? "")).filter(Boolean))],
    send: (pid, i, list, lore) => {
      const key = makeId("a");
      const action = i.action?.trim() || "liked your photo.";
      return { key, patches: {
        [`phones/${pid}/data/notifications/${key}`]: { app: "insta", title: i.contact, text: action, time: msToLore(loreNowMs(lore)), order: minOrder(list) },
        ...notifPatch(pid, { app: "insta", title: "Instagram", body: `${i.contact} ${action}`, link: "insta?tab=news", msg: key }),
      } };
    },
    link: () => "insta?tab=news",
    titleOf: (n) => `${n?.title ?? "?"} ${n?.text ?? ""}`,
  },
];

export const channelOf = (app?: string) => CHANNELS.find((c) => c.app === app);

/** Actions Instagram proposées (textes de l'app en 2012). */
export const INSTA_ACTIONS = ["liked your photo.", "started following you.", "commented: ", "mentioned you in a comment: "];
