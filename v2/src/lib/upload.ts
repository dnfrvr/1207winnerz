// Envoi d'une photo de l'appareil vers le stockage Supabase (bucket public « uploads », le même
// que l'ancienne app) par l'API REST — pas de SDK. La photo est réduite (1280 px, JPEG) avant
// l'envoi pour ménager le quota. Sans VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY : désactivé.
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const canUpload = !!(URL_ && KEY);

async function shrink(file: File, max = 1280): Promise<Blob> {
  if (file.type === "image/gif") return file; // garder l'animation
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("conversion"))), "image/jpeg", 0.85));
}

/** Renvoie l'URL publique de la photo envoyée. */
export async function uploadImage(file: File, pid: string): Promise<string> {
  if (!canUpload) throw new Error("Stockage non configuré");
  if (!file.type.startsWith("image/")) throw new Error("Ce n'est pas une image");
  const blob = await shrink(file);
  const ext = blob.type === "image/gif" ? "gif" : "jpg";
  const path = `v2/${pid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await fetch(`${URL_}/storage/v1/object/uploads/${path}`, {
    method: "POST", body: blob,
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, "Content-Type": blob.type, "x-upsert": "false" },
  });
  if (!res.ok) throw new Error(`Envoi refusé (${res.status})`);
  return `${URL_}/storage/v1/object/public/uploads/${path}`;
}
