import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// apps/web (#93 移行中): src/ を Vite SPA 化。
// - パスエイリアス(@/*)は tsconfig.json の "paths" を唯一の正とし、
//   vite-tsconfig-paths プラグインが dev/build/test すべてに反映する(二重定義しない)。
// - server.proxy: /api/* を Next backend(:3000) へ転送する暫定シム。
//   これにより token-cache の credentials:'same-origin' が成立する(#94 で Hono へ差し替え)。
// - TanStack Router プラグインは Phase 3(routes 追加時)で導入する。
export default defineConfig({
  plugins: [tsconfigPaths(), react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
    allowedHosts: ["enjoying-hash-native.ngrok-free.dev"],
  },
});
