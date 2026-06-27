import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// apps/web (#93 移行中): src/ を Vite SPA 化。
// - alias @ → ./src で FSD の @/ import を温存。
// - server.proxy: /api/* を Next backend(:3000) へ転送する暫定シム。
//   これにより token-cache の credentials:'same-origin' が成立する(#94 で Hono へ差し替え)。
// - TanStack Router プラグインは Phase 3(routes 追加時)で導入する。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
    allowedHosts: ["enjoying-hash-native.ngrok-free.dev"],
  },
});
