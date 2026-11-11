// Appel entrant (lancé par le MDJ depuis la régie) : écran par-dessus tout le téléphone.
// iOS 6 : verrouillé → « slide to answer » ; déverrouillé → Decline / Answer. Android 4.1 : refuser /
// décrocher. Décroché : chrono + « End ». Sonnerie et vibration pour le ou la propriétaire du
// téléphone (et le MDJ qui le regarde). Sans réponse au bout de 30 s : appel manqué.
import { mdiAccountBox, mdiDialpad, mdiMicrophoneOff, mdiPhone, mdiPhoneHangup, mdiPlus, mdiVideo, mdiVolumeHigh } from "@mdi/js";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { answerPatches, callPath, duration, endCallPatches, RING_MS, type CallResult, type LiveCall } from "../data/call";
import { useCanEdit, useData, useValue, useWriter } from "../data/hooks";
import { Glyph } from "../kit/glyph";
import { img } from "../lib/img";
import { LORE_DATE_DEFAULT, type OS } from "./common";
import { SlideToUnlock, StatusBar } from "./IOSChrome";
import "./call.css";

type Profile = { wallpaper?: string };

/** Sonnerie synthétisée (aucun fichier) : « Marimba » (iOS) / deux tons (Android), en boucle. */
function useRingtone(on: boolean, os: OS) {
  useEffect(() => {
    if (!on) return;
    let ctx: AudioContext | null = null;
    try { ctx = new AudioContext(); } catch { return; }
    const notes = os === "android" ? [[880, 0], [660, 0.18], [880, 0.36], [660, 0.54]] : [[1047, 0], [1319, 0.12], [1568, 0.24], [1319, 0.36], [1047, 0.6], [1319, 0.72], [1568, 0.84], [2093, 0.96]];
    const ring = () => {
      if (!ctx) return;
      for (const [f, t0] of notes) {
        const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + t0;
        o.type = os === "android" ? "square" : "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(os === "android" ? 0.05 : 0.16, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.22);
      }
      try { navigator.vibrate?.([400, 200, 400]); } catch { /* rien */ }
    };
    ring();
    const h = setInterval(ring, 2200);
    return () => { clearInterval(h); try { navigator.vibrate?.(0); } catch { /* rien */ } ctx?.close(); };
  }, [on, os]);
}

/** Chrono qui avance chaque seconde. */
function useNow(on: boolean) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { if (!on) return; const h = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(h); }, [on]);
  return now;
}

const bg = (wallpaper?: string) => (wallpaper && /^(\/|https?:|data:)/.test(wallpaper) ? { backgroundImage: `url(${img(wallpaper)})` } : undefined);

export function IncomingCall({ pid, os }: { pid: string; os: OS }) {
  const call = useValue<LiveCall>(callPath(pid));
  const profile = useValue<Profile>(`phones/${pid}/profile`);
  const lore = useValue<string>("meta/loreDate") || LORE_DATE_DEFAULT;
  const canEdit = useCanEdit(pid);
  const { session } = useData();
  const { write } = useWriter(pid);
  const loc = useLocation();
  const locked = !loc.pathname.split("/").filter(Boolean)[1];
  const ringing = call?.state === "ringing";
  const now = useNow(!!call && call.state !== "ended");
  const [gone, setGone] = useState<string | null>(null); // écran « Call Ended » déjà fermé pour cet appel
  const ended = useRef<string | null>(null);

  // Sonne chez le ou la propriétaire du téléphone (et le MDJ qui le regarde).
  useRingtone(ringing && (session.phone === pid || session.role === "mdj"), os);

  const end = (result: CallResult) => {
    if (!call || !canEdit || ended.current === call.id) return;
    ended.current = call.id;
    write(endCallPatches(pid, call, result, lore));
  };
  // Sans réponse : appel manqué (écrit par le téléphone de son propriétaire, la régie fait de même).
  useEffect(() => {
    if (!ringing || !call || session.phone !== pid) return;
    const left = RING_MS - (Date.now() - call.startedAt);
    const t = setTimeout(() => end("missed"), Math.max(0, left));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringing, call?.id]);
  // « Call Ended » reste affiché 1,5 s.
  useEffect(() => {
    if (call?.state !== "ended") return;
    const t = setTimeout(() => setGone(call.id), Math.max(0, 1500 - (Date.now() - (call.endedAt ?? 0))));
    return () => clearTimeout(t);
  }, [call?.state, call?.id, call?.endedAt]);

  if (!call || gone === call.id) return null;
  if (call.state === "ended" && Date.now() - (call.endedAt ?? 0) > 1500) return null;
  // Un vieil appel qui sonne encore (régie fermée, téléphone hors ligne) : on ne le ressort pas.
  if (ringing && Date.now() - call.startedAt > RING_MS + 15_000) return null;

  const answer = () => canEdit && write(answerPatches(pid));
  const active = call.state === "active";
  const status = call.state === "ended" ? (os === "ios" ? "call ended" : "Call ended")
    : active ? duration(now - (call.answeredAt ?? now))
    : os === "ios" ? "mobile" : "Incoming call";

  if (os === "android") return (
    <div className="incall and">
      <StatusBar variant="opaque" />
      <div className="incall-top"><b>{call.contact}</b><span>{status}</span></div>
      <div className="incall-photo"><span>{call.contact.trim()[0]?.toUpperCase() ?? "?"}</span></div>
      {ringing ? (
        <div className="incall-ring">
          <button className="no" onClick={() => end("declined")} disabled={!canEdit} aria-label="Decline"><Glyph i={mdiPhoneHangup} size={30} /></button>
          <span className="hint">‹ decline · answer ›</span>
          <button className="yes" onClick={answer} disabled={!canEdit} aria-label="Answer"><Glyph i={mdiPhone} size={30} /></button>
        </div>
      ) : (
        <button className="incall-end" onClick={() => end("ended")} disabled={!canEdit || !active} aria-label="Hang up"><Glyph i={mdiPhoneHangup} size={32} /></button>
      )}
    </div>
  );

  return (
    <div className={`incall ios ${ringing && locked ? "locked" : ""}`} style={ringing ? bg(profile?.wallpaper) : undefined}>
      <StatusBar variant="translucent" locked={ringing && locked} />
      <div className="incall-top"><b>{call.contact}</b><span>{status}</span></div>
      <div className="incall-mid">
        {active && (
          <div className="incall-grid">{([["mute", mdiMicrophoneOff], ["keypad", mdiDialpad], ["speaker", mdiVolumeHigh], ["add call", mdiPlus], ["FaceTime", mdiVideo], ["contacts", mdiAccountBox]] as const)
            .map(([l, g]) => <button key={l} tabIndex={-1}><Glyph i={g} size={34} />{l}</button>)}</div>
        )}
      </div>
      {ringing && locked ? (
        <div className="incall-bottom">
          <SlideToUnlock label="slide to answer" onUnlock={answer} />
        </div>
      ) : ringing ? (
        <div className="incall-bottom two">
          <button className="decline" onClick={() => end("declined")} disabled={!canEdit}>Decline</button>
          <button className="answer" onClick={answer} disabled={!canEdit}><Glyph i={mdiPhone} size={20} /> Answer</button>
        </div>
      ) : (
        <div className="incall-bottom"><button className="end" onClick={() => end("ended")} disabled={!canEdit || !active}><Glyph i={mdiPhoneHangup} size={30} /> End</button></div>
      )}
    </div>
  );
}
