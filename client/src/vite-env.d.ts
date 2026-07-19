/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * The API base URL (no trailing slash), baked in at build time. Optional
   * in dev — lib/api.ts falls back to the local server; required for
   * production builds. See client/.env.example.
   */
  readonly VITE_API_URL?: string;
}
