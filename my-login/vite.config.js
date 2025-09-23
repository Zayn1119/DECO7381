// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// 更稳妥的写法：用绝对路径做别名
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // 如果你还有 assets 之类的快捷别名，可以继续加：
      // "~assets": path.resolve(__dirname, "src/assets"),
    },
  },
  server: {
    port: 5500,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
