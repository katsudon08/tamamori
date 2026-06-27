import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// apps/web の最小構成。画面移植・Tailwind/Three/SWR 投入・ルーティングは #93 で行う。
export default defineConfig({
  plugins: [react()],
});
