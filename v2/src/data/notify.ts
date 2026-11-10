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
export type Msg = { from: string; npcName?: string | null; text?: string; img?: string; time?: string; order?: number; deleted?: boolean };

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
  const msg: Record<string, Json> = { from: "npc", npcName: contact, text, time, order };
  if (img) msg.img = img;
  const mid = makeId("m");
  patches[`threadMessages/${tid}/${mid}`] = msg;
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
