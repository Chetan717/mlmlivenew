import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const port = Number(process.env.PORT) || 5173;

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@firebase-config": path.resolve(import.meta.dirname, "src/Firebase"),
    },
    dedupe: ["react", "react-dom"],
  },
  // @ffmpeg/ffmpeg spawns an internal worker that breaks Vite's dep optimizer.
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util", "@ffmpeg/core"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port,
    host: true,
  },
  preview: {
    port,
    host: true,
  },
});
