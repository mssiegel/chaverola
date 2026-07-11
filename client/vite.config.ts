import path from "node:path";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // React Compiler auto-memoizes components and hooks at build time, so we no
    // longer hand-write memo / useCallback / useMemo. In plugin-react v6 the
    // compiler runs as a Babel preset via @rolldown/plugin-babel. See
    // eslint.config.js for the matching Rules-of-React lints.
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
