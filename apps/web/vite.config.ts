import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// apps/web (#93 移行中): src/ を Vite SPA 化。
// - パスエイリアス(@/*)は tsconfig.json の "paths" を唯一の正とする。
//   Vite+ がネイティブに解決するため resolve.tsconfigPaths を有効化(プラグイン不要)。
// - server.proxy: /api/* を Next backend(:3000) へ転送する暫定シム。
//   これにより token-cache の credentials:'same-origin' が成立する(#94 で Hono へ差し替え)。
// - tanstackRouter は react プラグインより前に置く(公式要件)。
export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
    allowedHosts: ["enjoying-hash-native.ngrok-free.dev"],
  },
});
