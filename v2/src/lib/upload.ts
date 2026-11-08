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
export async function uploadVideo(file: File, pid: string): Promise<string> {
  if (!file.type.startsWith("video/")) throw new Error("Ce n'est pas une vidéo");
  if (file.size > MAX_VIDEO) throw new Error("Vidéo trop lourde (30 Mo max) : raccourcis-la ou compresse-la");
  return send(file, pid, (file.name.split(".").pop() || "mp4").toLowerCase());
}
