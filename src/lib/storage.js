// ─── SUPABASE STORAGE (remplace Firebase Storage) ────────────────────────────
// Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY à définir dans Netlify
// et dans .env.local. Le bucket public "uploads" doit exister dans Supabase.
import { createClient } from "@supabase/supabase-js";

let supabaseClient = null;
try {
  const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  } else {
    console.warn("[storage] Pas de config Supabase détectée — les images repasseront en base64 (plus lourd).");
  }
} catch (e) {
  console.error("[storage] Échec d'initialisation Supabase :", e);
}

// ─── UPLOAD READER ─────────────────────────────────────────────────────────────
// Remplaçant "drop-in" de FileReader pour toutes les images de l'app : même interface
// (on lui assigne .onload puis on appelle .readAsDataURL(file)), mais au lieu d'encoder
// l'image en base64 dans la donnée (lourd, lent à synchroniser), elle est envoyée vers
// Supabase Storage (bucket public "uploads") et c'est l'URL publique (quelques octets)
// qui est renvoyée dans ev.target.result.
// Si Supabase n'est pas configuré, ou si l'upload échoue, on retombe sur base64.
class UploadReader {
  constructor() { this.onload = null; this.onerror = null; }
  _fallbackToBase64(file) {
    const fr = new FileReader();
    fr.onload  = (ev) => { if (this.onload) this.onload(ev); };
    fr.onerror = (ev) => { if (this.onerror) this.onerror(ev); };
    fr.readAsDataURL(file);
  }
  readAsDataURL(file) {
    if (!supabaseClient) { this._fallbackToBase64(file); return; }
    const safeName = (file.name||"img").replace(/[^a-zA-Z0-9._-]/g,"_");
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`;
    supabaseClient.storage
      .from("uploads")
      .upload(path, file, { cacheControl: "3600", upsert: false })
      .then(({ data, error }) => {
        if (error) throw error;
        const { data: urlData } = supabaseClient.storage
          .from("uploads")
          .getPublicUrl(data.path);
        if (this.onload) this.onload({ target: { result: urlData.publicUrl } });
      })
      .catch((err) => {
        console.error("[storage] Upload vers Supabase Storage échoué, on retombe en base64 :", err);
        this._fallbackToBase64(file);
      });
  }
}

// ─── MIGRATION BASE64 → SUPABASE STORAGE ─────────────────────────────────────
// Convertit une data URI base64 ("data:image/png;base64,...") en Blob binaire,
// pour pouvoir l'uploader vers Supabase Storage exactement comme un vrai fichier.
const dataUriToBlob = (dataUri) => {
  const [header, base64] = dataUri.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

// Upload un Blob (image déjà décodée) vers Supabase Storage. Retourne l'URL publique,
// ou null si l'upload échoue (Supabase non configuré, bucket manquant, policy refusée...).
const uploadBlobToSupabase = async (blob) => {
  if (!supabaseClient) return null;
  try {
    const ext = (blob.type.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "") || "png";
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}_migrated.${ext}`;
    const { data, error } = await supabaseClient.storage
      .from("uploads")
      .upload(path, blob, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data: urlData } = supabaseClient.storage.from("uploads").getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (err) {
    console.error("[migrate] Échec d'upload vers Supabase :", err);
    return null;
  }
};

// Parcourt récursivement tout l'arbre de données (persos + sharedThreads) et renvoie la liste
// de toutes les chaînes base64 trouvées ("data:image/...") avec leur chemin Firebase exact
// (ex: "glinda/gallery/3/src"). Sert à migrer en masse les images restées en base64 — que ce
// soit d'anciens uploads tombés en fallback avant que Supabase soit configuré, ou tout autre cas.
const findBase64Images = (obj, path = []) => {
  const found = [];
  if (obj == null) return found;
  if (typeof obj === "string") {
    if (obj.startsWith("data:image/")) found.push({ path: path.join("/"), value: obj });
    return found;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => found.push(...findBase64Images(v, [...path, i])));
    return found;
  }
  if (typeof obj === "object") {
    Object.keys(obj).forEach(k => found.push(...findBase64Images(obj[k], [...path, k])));
  }
  return found;
};

export { supabaseClient, UploadReader, dataUriToBlob, uploadBlobToSupabase, findBase64Images };
