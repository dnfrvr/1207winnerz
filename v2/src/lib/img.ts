// Résout une image vers sa version optimisée (WebP, 1080 px max) quand elle existe.
// Le manifeste est généré par `npm run optimize-images` ; les originaux restent intacts.
import manifest from "./img-manifest.json";

const M = manifest as Record<string, string>;
export const img = (src?: string | null): string | undefined => (src ? M[src] ?? src : undefined);
