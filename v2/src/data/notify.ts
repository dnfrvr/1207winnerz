// Notifications envoyées par le MDJ pendant une séance : un vrai message PNJ est écrit dans le
// téléphone du joueur (fil local, `from: "npc"`), la conversation passe en non lue, et une entrée
// `phones/{pid}/notifs/{id}` fait tomber la bannière. Tout part en une seule écriture multi-chemins.
import { loreNowMs, loreToMs, msToLore } from "../lib/loreTime";
import { makeId, type Json, type Patches } from "./store";

export type Notif = {
  app: string;        // id de l'app (« messages »)
  title: string;      // expéditeur affiché
  body: string;       // aperçu (texte seul ; peut être vide si photo seule)
  attach?: number;    // nombre de photos jointes (« Attachment: 1 Image »)
  link: string;       // route dans le téléphone, sans le pid (« messages/t_… »)
  thread?: string;
  msg?: string;       // message qui a déclenché la notif (pour « Annuler l'envoi »)
  at: number;         // horodatage réel (ms)
  seen?: boolean;
};

export type Thread = { kind: "pair" | "group" | "local"; members?: Record<string, boolean>; name?: string; contact?: string | null };
export type InboxEntry = { contact?: string; threadId?: string; unread?: boolean; deleted?: boolean; order?: number };
export type Msg = { from: string; npcName?: string | null; text?: string; img?: string; time?: string; order?: number; deleted?: boolean;
  pair?: string /* photo et texte envoyés ensemble = 2 messages liés */; byMdj?: boolean };

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase().normalize("NFKC");

/** Contacts PNJ (fils locaux) d'un téléphone : [{ tid, contact }], du plus récent au plus ancien. */
export function npcContacts(pid: string, threads: Record<string, Thread> | undefined, inbox: Record<string, InboxEntry> | undefined) {
  const out: { tid: string; contact: string }[] = [];
  for (const [tid, t] of Object.entries(threads ?? {})) {
    if (!t || t.kind !== "local" || !t.members?.[pid]) continue;
    const contact = inbox?.[tid]?.contact || t.contact;
    if (contact) out.push({ tid, contact });
  }
  return out.sort((a, b) => (inbox?.[b.tid]?.order ?? 0) - (inbox?.[a.tid]?.order ?? 0));
}

/** Fil local existant avec ce contact (nom comparé sans casse ni espaces autour). */
export const findNpcThread = (pid: string, contact: string, threads: Record<string, Thread> | undefined, inbox: Record<string, InboxEntry> | undefined) =>
  npcContacts(pid, threads, inbox).find((c) => norm(c.contact) === norm(contact))?.tid ?? null;

/** Heure lore et ordre d'un nouveau message placé à la fin du fil. */
export function nextSlot(msgs: Record<string, Msg> | undefined, lore: string) {
  let lastMs = 0, maxOrder = 0;
  for (const m of Object.values(msgs ?? {})) {
    if (!m || m.deleted) continue;
    lastMs = Math.max(lastMs, loreToMs(m.time) ?? 0);
    maxOrder = Math.max(maxOrder, m.order ?? 0);
  }
  return { time: msToLore(Math.max(loreNowMs(lore), lastMs + 60_000)), order: maxOrder + 1000 };
}

export const notifBody = (text?: string) => text?.trim() ?? "";

/** Patch de la notif seule (réponse du MDJ dans un fil existant). */
export const notifPatch = (pid: string, n: Omit<Notif, "at">): Patches => ({
  [`phones/${pid}/notifs/${makeId("n")}`]: { ...n, at: Date.now() } as Json,
});

/**
 * Message PNJ + notif. `tid` null → nouveau fil local créé avec ce contact.
 * Renvoie les patches et l'id du fil (à passer à `write`).
 */
export function npcMessagePatches(opts: {
  pid: string; contact: string; text: string; img?: string; lore: string;
  tid: string | null; msgs: Record<string, Msg> | undefined;
}): { patches: Patches; tid: string } {
  const { pid, contact, text, img, lore } = opts;
  const tid = opts.tid ?? makeId("t");
  const patches: Patches = {};
  if (!opts.tid) {
    patches[`threads/${tid}`] = { kind: "local", members: { [pid]: true }, contact };
    patches[`phones/${pid}/inbox/${tid}`] = { threadId: tid, contact, order: Date.now(), unread: true };
  } else {
    patches[`phones/${pid}/inbox/${tid}/unread`] = true;
    patches[`phones/${pid}/inbox/${tid}/deleted`] = null;
  }
  const { time, order } = nextSlot(opts.msgs, lore);
  const base = { from: "npc", npcName: contact, time };
  // Comme sur iOS : une photo avec du texte part en deux bulles, la photo d'abord.
  const mid = makeId("m");
  if (img && text) {
    const pid2 = makeId("m");
    patches[`threadMessages/${tid}/${pid2}`] = { ...base, img, order, pair: mid };
    patches[`threadMessages/${tid}/${mid}`] = { ...base, text, order: order + 500, pair: pid2 };
  } else {
    patches[`threadMessages/${tid}/${mid}`] = img ? { ...base, img, order } : { ...base, text, order };
  }
  Object.assign(patches, notifPatch(pid, { app: "messages", title: contact, body: notifBody(text), ...(img ? { attach: 1 } : {}), link: `messages/${tid}`, thread: tid, msg: mid }));
  return { patches, tid };
}

/** Lignes à afficher : texte + mention de pièce jointe, dans la langue du téléphone (anglais, 2012). */
export function notifLines(n: Notif, os: "ios" | "android") {
  // Anciennes notifs : la photo était écrite « 📷 Photo » dans le texte.
  const legacy = n.body === "📷 Photo";
  const text = legacy ? "" : n.body;
  const count = n.attach ?? (legacy ? 1 : 0);
  const attach = !count ? null : os === "android" ? (count > 1 ? `${count} pictures` : "Picture")
    : `Attachment: ${count} Image${count > 1 ? "s" : ""}`;
  return { text, attach, oneLine: text || attach || "" };
}

// ─── Conversations de groupe (fils partagés entre plusieurs téléphones) ─────────
export type GroupSender = { pid: string } | { npc: string };

/** Groupes partagés (au moins 3 membres) : [{ tid, name, members }]. */
export function sharedGroups(threads: Record<string, Thread> | undefined, inboxes: Record<string, Record<string, InboxEntry> | undefined>) {
  return Object.entries(threads ?? {})
    .filter(([, t]) => t && t.kind === "group" && Object.keys(t.members ?? {}).length >= 3)
    .map(([tid, t]) => {
      const members = Object.keys(t.members ?? {});
      const name = t.name || members.map((m) => inboxes[m]?.[tid]?.contact).find(Boolean) || tid;
      return { tid, name, members };
    });
}

/**
 * Message dans un groupe partagé, au nom d'un PNJ ou d'un joueur : notif + « non lu » chez chaque
 * membre sauf l'expéditeur. Photo + texte = deux bulles liées (comme en 1-à-1). `byMdj` marque les
 * messages écrits depuis la régie (« Annuler l'envoi » ne touche qu'à ceux-là).
 */
export function groupMessagePatches(o: {
  tid: string; name: string; members: string[]; sender: GroupSender; senderLabel: string;
  text: string; img?: string; lore: string; msgs: Record<string, Msg> | undefined;
}): Patches {
  const { time, order } = nextSlot(o.msgs, o.lore);
  const base: Record<string, Json> = "pid" in o.sender ? { from: o.sender.pid, time, byMdj: true } : { from: "npc", npcName: o.sender.npc, time, byMdj: true };
  const patches: Patches = {};
  const mid = makeId("m");
  const text = o.text.trim();
  if (o.img && text) {
    const m2 = makeId("m");
    patches[`threadMessages/${o.tid}/${m2}`] = { ...base, img: o.img, order, pair: mid };
    patches[`threadMessages/${o.tid}/${mid}`] = { ...base, text, order: order + 500, pair: m2 };
  } else {
    patches[`threadMessages/${o.tid}/${mid}`] = o.img ? { ...base, img: o.img, order } : { ...base, text, order };
  }
  const who = "pid" in o.sender ? o.senderLabel.split(" ")[0] : o.senderLabel; // joueur : prénom ; PNJ : nom complet
  for (const m of o.members) {
    if ("pid" in o.sender && o.sender.pid === m) continue;
    patches[`phones/${m}/inbox/${o.tid}/unread`] = true;
    patches[`phones/${m}/inbox/${o.tid}/deleted`] = null;
    Object.assign(patches, notifPatch(m, { app: "messages", title: o.name, body: text ? `${who}: ${text}` : `${who}:`, ...(o.img ? { attach: 1 } : {}),
      link: `messages/${o.tid}`, thread: o.tid, msg: mid }));
  }
  return patches;
}
