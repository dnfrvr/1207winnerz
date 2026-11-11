// Sons système activables dans Réglages › Sounds / Son (profile.sounds) : clic du clavier, son de
// verrouillage, son des SMS (« Tri-tone »). Tout est synthétisé (aucun fichier). La sonnerie choisie
// sur Deezer (profile.ringtone) est jouée par l'écran d'appel entrant.
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useData, useValue } from "../data/hooks";
import { deezerMatch } from "../lib/deezer";

export type SoundPrefs = { keys?: boolean; lock?: boolean; sms?: boolean };
export type Ringtone = { title?: string; artist?: string };

/** Réglages par défaut : SMS sonore (comme avant), clavier et verrouillage muets. */
export const soundOn = (p: SoundPrefs | undefined, k: keyof SoundPrefs) => p?.[k] ?? k === "sms";

function blip(notes: [freq: number, at: number, len: number][], type: OscillatorType, vol: number) {
  try {
    const ctx = new AudioContext();
    for (const [f, t0, len] of notes) {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + t0;
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + len + 0.02);
    }
    setTimeout(() => ctx.close(), 600);
  } catch { /* audio indisponible */ }
}
export const keyClick = () => blip([[2400, 0, 0.018]], "square", 0.04);
export const lockSound = () => blip([[180, 0, 0.05], [120, 0.04, 0.07]], "square", 0.12);

/** Clic des touches et son de verrouillage, pour le ou la propriétaire du téléphone. */
export function SystemSounds({ pid }: { pid: string }) {
  const prefs = useValue<SoundPrefs>(`phones/${pid}/profile/sounds`);
  const { session } = useData();
  const loc = useLocation();
  const locked = !loc.pathname.split("/").filter(Boolean)[1];
  const was = useRef(locked);
  const mine = session.phone === pid;
  useEffect(() => {
    if (was.current !== locked && mine && soundOn(prefs, "lock")) lockSound();
    was.current = locked;
  }, [locked, mine, prefs]);
  useEffect(() => {
    if (!mine || !soundOn(prefs, "keys")) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest(".screen") && (t.tagName === "INPUT" || t.tagName === "TEXTAREA") && (e.key.length === 1 || e.key === "Backspace")) keyClick();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [mine, prefs]);
  return null;
}

/** Extrait Deezer de la sonnerie choisie, en boucle (URL signée : recherchée à chaque appel). */
export function playRingtone(r: Ringtone): () => void {
  let audio: HTMLAudioElement | null = null, stopped = false;
  void deezerMatch(r.artist, r.title).then((m) => {
    if (stopped || !m?.preview) return;
    audio = new Audio(m.preview);
    audio.loop = true;
    void audio.play().catch(() => { /* lecture bloquée par le navigateur */ });
  });
  return () => { stopped = true; audio?.pause(); };
}
