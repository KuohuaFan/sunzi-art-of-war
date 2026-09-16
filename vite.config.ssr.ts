import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: import.meta.dirname,
  mode: "production",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "import.meta.env.VITE_STATIC_EXPORT": JSON.stringify(process.env.VITE_STATIC_EXPORT || "false"),
    "import.meta.env.BASE_URL": JSON.stringify(process.env.PAGES_BASE_PATH || "/"),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  build: {
    ssr: path.resolve(import.meta.dirname, "client/src/entry-server.tsx"),
    outDir: path.resolve(import.meta.dirname, process.env.PAGES_SSR_OUT_DIR || "dist/server-ssr"),
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: "entry-server.js" } },
  },
});
