// Répondre, retweeter et mettre en favori (Twitter 2012).
//   Réponse  → nouveau tweet partagé  feeds/tweets/{id}  { author, text: "@pseudo …", replyTo: chemin, replyToH }
//   Retweet  → nouveau tweet partagé  feeds/tweets/{id}  { author, rtOf: chemin, rtSnap: { name, h, av, text, time } }
//              (rtSnap : copie du tweet, pour l'afficher sur un téléphone où l'original n'existe pas)
//   Favori   → phones/{pid}/data/twFavs/{clé du chemin}: true   (chacun ses favoris ; compteur = total des 4 téléphones)
// Les compteurs affichés = valeur saisie dans le tweet + actions des joueurs. Le perso dont le tweet est
// retweeté / mis en favori / reçoit une réponse reçoit une notif Twitter.
import { useEffect, useMemo, useState } from "react";
import { mdiRepeat, mdiReply, mdiStar } from "@mdi/js";
import { useData, useList, useValue, useWriter } from "../data/hooks";
import { notifPatch } from "../data/notify";
import type { Json, Patches } from "../data/store";
import { loreNowMs, msToLore } from "../lib/loreTime";
import { LORE_DATE_DEFAULT } from "../phone/common";
import { Brand, Glyph } from "../kit/glyph";
import { HoloBar, PIDS, useChars } from "./social";

export type RtSnap = { name?: string; h?: string; av?: string; text?: string; time?: string };
export type Tweet = { author?: string; name?: string; h?: string; av?: string; text?: string; time?: string; rt?: number; fav?: number; rp?: number;
  order?: number; deleted?: boolean; replyTo?: string; replyToH?: string; rtOf?: string; rtSnap?: RtSnap };
/** Ce qu'il faut savoir d'un tweet pour agir dessus. */
export type Target = { path: string; t: Tweet; who: { name: string; h: string; av?: string } };

/** Clé Firebase d'un chemin de tweet (« / » interdit dans une clé). */
export const favKey = (path: string) => path.replace(/\//g, "|");

/** Favoris des 4 téléphones : { pid: { clé: true } }. */
function useAllFavs() {
  const { store } = useData();
  const [favs, setFavs] = useState<Record<string, Record<string, boolean>>>({});
  useEffect(() => {
    const offs = PIDS.map((p) => store.subscribe(`phones/${p}/data/twFavs`, (v) => setFavs((f) => ({ ...f, [p]: (v ?? {}) as Record<string, boolean> }))));
    return () => offs.forEach((o) => o());
  }, [store]);
  return favs;
}

export function useTweetActions(pid: string) {
  const { write } = useWriter(pid);
  const chars = useChars();
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const shared = useList<Tweet>("feeds/tweets");
  const favs = useAllFavs();
  const [replying, setReplying] = useState<Target | null>(null);

  const idx = useMemo(() => {
    const rts = new Map<string, [string, Tweet][]>(), replies = new Map<string, [string, Tweet][]>();
    for (const [id, t] of shared) {
      if (t.rtOf) rts.set(t.rtOf, [...(rts.get(t.rtOf) ?? []), [id, t]]);
      if (t.replyTo) replies.set(t.replyTo, [...(replies.get(t.replyTo) ?? []), [id, t]]);
    }
    return { rts, replies };
  }, [shared]);

  const myRt = (path: string) => idx.rts.get(path)?.find(([, t]) => t.author === pid)?.[0];
  const faved = (path: string) => !!favs[pid]?.[favKey(path)];
  const counts = (path: string, t: Tweet) => ({
    rp: (t.rp ?? 0) + (idx.replies.get(path)?.length ?? 0),
    rt: (t.rt ?? 0) + (idx.rts.get(path)?.length ?? 0),
    fav: (t.fav ?? 0) + PIDS.filter((p) => favs[p]?.[favKey(path)]).length,
  });
  const repliesOf = (path: string) => idx.replies.get(path) ?? [];

  const me = chars[pid];
  const myName = me?.twName ?? me?.name ?? pid;
  /** Notif Twitter au perso auteur du tweet (pas à soi-même, pas aux comptes PNJ). */
  /** `path` = tweet à ouvrir en touchant la notif (le tweet d'origine, où s'affichent les réponses). */
  const tell = (t: Tweet, body: string, path: string): Patches =>
    t.author && t.author !== pid && (PIDS as readonly string[]).includes(t.author)
      ? notifPatch(t.author, { app: "twitter", title: "Twitter", body, link: `twitter?t=${encodeURIComponent(path)}` }) : {};
  const now = () => msToLore(loreNowMs(lore));
  const newId = () => `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

  const toggleFav = (x: Target) => {
    const on = !faved(x.path);
    write({ [`phones/${pid}/data/twFavs/${favKey(x.path)}`]: on ? true : null, ...(on ? tell(x.t, `${myName} favorited your Tweet: ${x.t.text ?? ""}`, x.path) : {}) });
  };
  const toggleRt = (x: Target) => {
    const mine = myRt(x.path);
    if (mine) { write({ [`feeds/tweets/${mine}/deleted`]: true }); return; }
    if (x.t.author === pid) return; // on ne retweete pas ses propres tweets
    const snap: RtSnap = { name: x.who.name, h: x.who.h, ...(x.who.av ? { av: x.who.av } : {}), text: x.t.text ?? "", time: x.t.time ?? "" };
    write({ [`feeds/tweets/${newId()}`]: { author: pid, rtOf: x.path, rtSnap: snap as Json, time: now(), order: Date.now() }, ...tell(x.t, `${myName} retweeted your Tweet: ${x.t.text ?? ""}`, x.path) });
  };
  const sendReply = (x: Target, text: string) => {
    write({ [`feeds/tweets/${newId()}`]: { author: pid, text, replyTo: x.path, replyToH: x.who.h, time: now(), rp: 0, rt: 0, fav: 0, order: Date.now() },
      ...tell(x.t, `${myName}: ${text}`, x.path) });
  };

  return { counts, faved, rtd: (path: string) => !!myRt(path), repliesOf, toggleFav, toggleRt, reply: setReplying, replying, sendReply, closeReply: () => setReplying(null) };
}
export type TweetActions = ReturnType<typeof useTweetActions>;

/** Barre Répondre / Retweeter / Favori sous un tweet. `canAct` : le téléphone est modifiable par la personne connectée. */
export function TweetActs({ x, acts, canAct, own }: { x: Target; acts: TweetActions; canAct: boolean; own?: boolean }) {
  const c = acts.counts(x.path, x.t);
  const fav = acts.faved(x.path), rt = acts.rtd(x.path);
  const stop = (f: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); if (canAct) f(); };
  return (
    <div className="tw-acts" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" aria-label="Reply" disabled={!canAct} onClick={stop(() => acts.reply(x))}><Glyph i={mdiReply} size={15} />{c.rp || ""}</button>
      <button type="button" aria-label="Retweet" className={rt ? "rt" : ""} disabled={!canAct || (own && !rt)} onClick={stop(() => acts.toggleRt(x))}><Glyph i={mdiRepeat} size={15} />{c.rt || ""}</button>
      <button type="button" aria-label="Favorite" className={fav ? "fav" : ""} disabled={!canAct} onClick={stop(() => acts.toggleFav(x))}><Glyph i={mdiStar} size={15} />{c.fav || ""}</button>
    </div>
  );
}

/** Fenêtre « nouveau tweet » / « réponse ». */
export function Compose({ os, onClose, onSend, replyTo, initial = "" }: { os: string; onClose: () => void; onSend: (t: string) => void; replyTo?: Target; initial?: string }) {
  const [t, setT] = useState(initial);
  const send = () => { onSend(t.trim()); onClose(); };
  const title = replyTo ? "Reply" : os === "android" ? "Tweet" : "New Tweet";
  return (
    <div className={`tw-compose ${os}`}>
      {os === "android" ? (
        <HoloBar color="#f3f3f3" dark={false} onUp={onClose} icon={<Brand name="twitter" size={30} color />} title={title}
          actions={<button className="tw-holo-send" disabled={!t.trim()} onClick={send}>{replyTo ? "REPLY" : "TWEET"}</button>} />
      ) : (
        <div className="tw-bar"><button className="tw-txt" onClick={onClose}>Cancel</button><h1>{title}</h1><button className="tw-txt send" disabled={!t.trim()} onClick={send}>{replyTo ? "Reply" : "Tweet"}</button></div>
      )}
      {replyTo && <div className="tw-replyto">In reply to <b>{replyTo.who.name}</b> {replyTo.who.h}<p>{replyTo.t.text}</p></div>}
      <textarea autoFocus value={t} maxLength={140} onChange={(e) => setT(e.target.value)} placeholder="What's happening?"
        onFocus={(e) => { const el = e.currentTarget; el.setSelectionRange(el.value.length, el.value.length); }} />
      <div className="tw-left">{140 - t.length}</div>
    </div>
  );
}

/** Fenêtre de réponse ouverte par `acts.reply(...)` (à rendre une fois dans l'app). */
export function ReplyUI({ acts, os }: { acts: TweetActions; os: string }) {
  const x = acts.replying;
  if (!x) return null;
  const h = x.who.h ? (x.who.h.startsWith("@") ? x.who.h : `@${x.who.h}`) : "";
  return <Compose key={x.path} os={os} replyTo={x} initial={h ? `${h} ` : ""} onClose={acts.closeReply} onSend={(text) => acts.sendReply(x, text)} />;
}
