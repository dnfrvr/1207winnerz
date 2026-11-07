import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Les assets seed (avatars, fonds, icônes) restent dans ../public pour ne pas les dupliquer.
export default defineConfig({
  plugins: [react()],
  publicDir: "../public",
  server: { port: 5174, strictPort: true },
});
