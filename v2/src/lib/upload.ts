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

/** Codec vidéo déclaré dans le conteneur MP4/MOV (boîte moov, souvent en fin de fichier) : « hvc1 »/« hev1 » = HEVC, « avc1 »/« avc3 » = H.264. */
export function moovCodec(b: Uint8Array): string | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const tag = (i: number) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
  let off = 0;
  while (off + 8 <= b.length) {
    let size = dv.getUint32(off), head = 8;
    if (size === 1 && off + 16 <= b.length) { size = Number(dv.getBigUint64(off + 8)); head = 16; }
    else if (size === 0) size = b.length - off;
    if (size < head) return null; // fichier abîmé : on laisse le test de lecture décider
    if (tag(off + 4) === "moov") {
      for (let i = off + head; i + 4 <= Math.min(b.length, off + size); i++) { const t = tag(i); if (t === "hvc1" || t === "hev1" || t === "avc1" || t === "avc3") return t; }
      return null;
    }
    off += size;
  }
  return null;
}
const codecOf = async (f: Blob) => moovCodec(new Uint8Array(await f.arrayBuffer()));
export const isHevc = async (f: Blob) => { const c = await codecOf(f); return c === "hvc1" || c === "hev1"; };

/** Réencode en H.264 (MP4) dans le navigateur : la vidéo est lue muette dans un canvas filmé par
 *  MediaRecorder — sans dépendance, mais en temps réel (une vidéo de 20 s prend 20 s) et sans le son
 *  (toutes les vidéos de l'app sont muettes). Ne marche que si ce navigateur décode la source. */
async function toH264(file: File, max = 1280): Promise<Blob> {
  const mimeType = typeof MediaRecorder === "undefined" ? undefined
    : ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
  if (!mimeType) throw new Error("Ce navigateur ne sait pas convertir la vidéo en H.264 : essaie depuis Safari (iPhone) ou un Chrome récent.");
  const v = document.createElement("video");
  const url = URL.createObjectURL(file);
  v.muted = true; v.playsInline = true; v.src = url;
  try {
    await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error("Vidéo illisible")); });
    const k = Math.min(1, max / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * k / 2) * 2; c.height = Math.round(v.videoHeight * k / 2) * 2; // H.264 : dimensions paires
    const ctx = c.getContext("2d")!;
    const draw = () => ctx.drawImage(v, 0, 0, c.width, c.height);
    draw();
    const rec = new MediaRecorder(c.captureStream(30), { mimeType, videoBitsPerSecond: 2_500_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise((r) => { rec.onstop = r; });
    // shortcut: rAF s'arrête si l'onglet passe en arrière-plan (images figées) ; passer à WebCodecs si ça gêne.
    let raf = 0; const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    rec.start(1000); loop();
    await v.play();
    await new Promise<void>((res) => { v.onended = () => res(); setTimeout(res, (v.duration || 60) * 1000 + 5000); });
    cancelAnimationFrame(raf); rec.stop(); await stopped;
    const out = new Blob(chunks, { type: "video/mp4" });
    if (out.size < 1000) throw new Error("Conversion interrompue : garde l'onglet ouvert au premier plan pendant la préparation");
    const codec = await codecOf(out);
    if (codec && codec !== "avc1" && codec !== "avc3") throw new Error("Conversion impossible dans ce navigateur (codec " + codec + ")");
    return out;
  } finally { v.removeAttribute("src"); URL.revokeObjectURL(url); }
}

/** Renvoie l'URL publique de la vidéo envoyée (30 Mo max ; le HEVC des iPhone est d'abord converti en H.264). */
export async function uploadVideo(file: File, pid: string): Promise<string> {
  if (!file.type.startsWith("video/")) throw new Error("Ce n'est pas une vidéo");
  if (file.size > MAX_VIDEO) throw new Error("Vidéo trop lourde (30 Mo max) : raccourcis-la ou compresse-la");
  if (!(await canPlay(file))) throw new Error("Vidéo illisible dans ce navigateur (souvent le format HEVC des iPhone) : envoie-la depuis l'iPhone lui-même, ou réexporte-la en H.264 (MP4).");
  // HEVC (iPhone) : illisible chez une partie des joueurs (Firefox, beaucoup de PC) → converti même si CE navigateur le lit.
  if (await isHevc(file)) {
    const out = await toH264(file);
    if (out.size > MAX_VIDEO) throw new Error("Vidéo trop lourde une fois convertie (30 Mo max) : raccourcis-la");
    return send(out, pid, "mp4");
  }
  return send(file, pid, (file.name.split(".").pop() || "mp4").toLowerCase());
}
