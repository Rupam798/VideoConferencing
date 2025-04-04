import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { tempo } from "tempo-devtools/dist/vite";
import fs from "fs";

const conditionalPlugins = [];

if (process.env.TEMPO === "true") {
  conditionalPlugins.push(["tempo-devtools/swc", {}]);
}

// https://vitejs.dev/config/
// Check if node_modules/.vite exists and create it if not
if (!fs.existsSync("./node_modules/.vite")) {
  try {
    fs.mkdirSync("./node_modules/.vite", { recursive: true });
  } catch (e) {
    console.error("Error creating .vite directory:", e);
  }
}

export default defineConfig({
  base:
    process.env.NODE_ENV === "development"
      ? "/"
      : process.env.VITE_BASE_PATH || "/",
  optimizeDeps: {
    entries: ["src/main.jsx"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  define: {
    global: "window",
  },
  plugins: [
    react({
      plugins: [...conditionalPlugins],
    }),
    tempo(),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: true,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
  },
  cacheDir: "node_modules/.vite",
  clearScreen: false,
  build: {
    target: "es2015", // Ensure compatibility with older browsers
  },
});
