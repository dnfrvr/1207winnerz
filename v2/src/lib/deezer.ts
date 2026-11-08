// Recherche dans le catalogue Deezer (API publique, sans clé) en JSONP : l'API n'envoie pas
// d'en-têtes CORS, mais accepte `output=jsonp`. Sert aux pochettes, aux infos d'album et aux
// extraits de 30 s (URL signées qui expirent : ne pas les enregistrer en base).
export type DzTrack = { title: string; artist: string; album: string; cover: string; duration: string; preview: string };

const cache = new Map<string, Promise<DzTrack[]>>();
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
type Raw = { title?: string; duration?: number; preview?: string; artist?: { name?: string }; album?: { title?: string; cover_big?: string; cover_medium?: string } };

export function deezerSearch(q: string, limit = 10): Promise<DzTrack[]> {
  const key = `${limit}:${q.trim().toLowerCase()}`;
  if (!q.trim()) return Promise.resolve([]);
  if (!cache.has(key)) cache.set(key, new Promise((resolve) => {
    const w = window as unknown as Record<string, unknown>;
    const cb = `dz_${Math.random().toString(36).slice(2)}`;
    const s = document.createElement("script");
    let settled = false;
    const done = (list: DzTrack[]) => {
      if (settled) return;
      settled = true; delete w[cb]; s.remove(); resolve(list);
      if (!list.length) cache.delete(key); // échec réseau : on pourra réessayer
    };
    w[cb] = (r: { data?: Raw[] }) => done((r?.data ?? []).map((d) => ({
      title: d.title ?? "", artist: d.artist?.name ?? "", album: d.album?.title ?? "",
      cover: d.album?.cover_big ?? d.album?.cover_medium ?? "", duration: d.duration ? mmss(d.duration) : "", preview: d.preview ?? "",
    })));
    s.onerror = () => done([]);
    setTimeout(() => done([]), 6000);
    s.src = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${limit}&output=jsonp&callback=${cb}`;
    document.head.appendChild(s);
  }));
  return cache.get(key)!;
}

/** Meilleur résultat pour un morceau connu (artiste + titre). */
export const deezerMatch = (artist?: string, title?: string) =>
  deezerSearch(`${artist ?? ""} ${title ?? ""}`, 3).then((l) => l[0] ?? null);
