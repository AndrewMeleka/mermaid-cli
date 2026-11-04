import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: [
          [
            "@stylexjs/babel-plugin",
            {
              dev: mode !== "production",
              runtimeInjection: false,
              treeshakeCompensation: true,
              unstable_moduleResolution: { type: "commonJS", rootDir: __dirname },
            },
          ],
        ],
      },
    }),
  ],
  build: {
    outDir: "../internal/web/dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
  },
  server: {
    host: true,
    port: 5173,
    // The Go binary owns the API; in dev run `go run . serve <dir>` next to this.
    proxy: {
      "/api": { target: "http://localhost:9510", changeOrigin: false },
    },
  },
}));
