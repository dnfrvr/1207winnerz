// Envoi d'une photo de l'appareil vers le stockage Supabase (bucket public « uploads », le même
// que l'ancienne app) par l'API REST — pas de SDK. La photo est réduite (1280 px, JPEG) avant
// l'envoi pour ménager le quota. Sans VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY : désactivé.
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const REMOTE = !!(URL_ && KEY);
// Mode démo (sans Firebase) : les fichiers restent dans le navigateur, pour pouvoir tester.
const DEMO = !import.meta.env.VITE_FIREBASE_DATABASE_URL;
export const canUpload = REMOTE || DEMO;
const toDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b); });

async function shrink(file: File, max = 1280): Promise<Blob> {
  if (file.type === "image/gif") return file; // garder l'animation
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("conversion"))), "image/jpeg", 0.85));
}

async function send(blob: Blob, pid: string, ext: string): Promise<string> {
  // shortcut: en démo, vidéo = URL blob: (perdue au rechargement), image = data URL ; vrai stockage = Supabase.
  if (!REMOTE) { if (DEMO) return blob.type.startsWith("video/") ? URL.createObjectURL(blob) : toDataUrl(blob); throw new Error("Stockage non configuré"); }
  const path = `v2/${pid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await fetch(`${URL_}/storage/v1/object/uploads/${path}`, {
    method: "POST", body: blob,
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, "Content-Type": blob.type, "x-upsert": "false" },
  });
  if (!res.ok) throw new Error(`Envoi refusé (${res.status})`);
  return `${URL_}/storage/v1/object/public/uploads/${path}`;
}

/** Renvoie l'URL publique de la photo envoyée (réduite avant l'envoi). */
export async function uploadImage(file: File, pid: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Ce n'est pas une image");
  const blob = await shrink(file);
  return send(blob, pid, blob.type === "image/gif" ? "gif" : "jpg");
}

const MAX_VIDEO = 30 * 1024 * 1024; // vidéos courtes du viseur : au-delà, le quota part vite
/** Renvoie l'URL publique de la vidéo envoyée (telle quelle, 30 Mo max). */
/** Le navigateur arrive-t-il à décoder une image de la vidéo ? (HEVC d'iPhone : souvent non sur PC.) */
function canPlay(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    let settled = false;
    const done = (ok: boolean) => { if (settled) return; settled = true; URL.revokeObjectURL(url); v.removeAttribute("src"); resolve(ok); };
    v.muted = true; v.preload = "auto";
    v.onloadeddata = () => done(v.videoWidth > 0);
    v.onerror = () => done(false);
    setTimeout(() => done(v.videoWidth > 0), 8000);
    v.src = url;
  });
}

/** Codec HEVC déclaré dans le conteneur MP4/MOV (« hvc1 » ou « hev1 », dans la boîte moov, souvent en fin de fichier). */
export async function isHevc(file: Blob): Promise<boolean> {
  return hevcInMoov(new Uint8Array(await file.arrayBuffer()));
}

/** Parcourt les boîtes de premier niveau et cherche le codec seulement dans « moov » (pas dans les données vidéo). */
export function hevcInMoov(b: Uint8Array): boolean {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const tag = (i: number) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
  let off = 0;
  while (off + 8 <= b.length) {
    let size = dv.getUint32(off), head = 8;
    if (size === 1 && off + 16 <= b.length) { size = Number(dv.getBigUint64(off + 8)); head = 16; }
    else if (size === 0) size = b.length - off;
    if (size < head) return false; // fichier abîmé : on laisse le test de lecture décider
    if (tag(off + 4) === "moov") {
      for (let i = off + head; i + 4 <= Math.min(b.length, off + size); i++) { const t = tag(i); if (t === "hvc1" || t === "hev1") return true; }
      return false;
    }
    off += size;
  }
  return false;
}

export async function uploadVideo(file: File, pid: string): Promise<string> {
  if (!file.type.startsWith("video/")) throw new Error("Ce n'est pas une vidéo");
  if (file.size > MAX_VIDEO) throw new Error("Vidéo trop lourde (30 Mo max) : raccourcis-la ou compresse-la");
  // HEVC (iPhone) : illisible chez une partie des joueurs (Firefox, beaucoup de PC) → refusé même si CE navigateur le lit.
  if (await isHevc(file) || !(await canPlay(file))) throw new Error("Vidéo illisible dans le navigateur (souvent le format HEVC des iPhone). Sur iPhone : Réglages › Appareil photo › Formats › « Le plus compatible », ou réexporte-la en H.264 (MP4).");
  return send(file, pid, (file.name.split(".").pop() || "mp4").toLowerCase());
}
