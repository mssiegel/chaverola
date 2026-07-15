import path from "node:path";
import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts on purpose: the tests are pure logic
// (lib/ and the host page's world model), so they run in a plain node
// environment with no React plugins, compiler pass, or DOM.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
