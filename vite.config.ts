import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  appType: "spa",
  plugins: [react()],
  resolve: {
    alias: {
      "@": frontendRoot,
    },
  },
});
