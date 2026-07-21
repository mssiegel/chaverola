/*
  All env reading happens here — the rest of the server takes a Config. No
  dotenv on purpose: dev needs zero env vars (the defaults below), and Render
  injects the production ones.
*/

export interface Config {
  /** Render injects PORT; dev defaults to 3001. */
  port: number;
  nodeEnv: string;
  /** The CORS allowlist, from allowedOrigins(). */
  corsOrigins: Array<string | RegExp>;
  /** The dev-only clock compressor, from readTimeScale(). 1 in production,
   *  always. */
  timeScale: number;
}

/**
 * Vercel preview deployments, e.g.
 * https://chaverola-hp56pdmmv-moshe-siegels-projects.vercel.app
 * (hostname copied off a real preview deployment — the team slug is real).
 */
const VERCEL_PREVIEW_ORIGIN =
  /^https:\/\/chaverola-[a-z0-9-]+-moshe-siegels-projects\.vercel\.app$/;

/**
 * The browser-origin allowlist, used by CORS now and Socket.IO later.
 * CORS is NOT a security boundary here (curl ignores it entirely) — the
 * unguessable hostKey is. This list just keeps other websites' frontend
 * code from quietly calling the API from visitors' browsers.
 */
export function allowedOrigins(
  env: NodeJS.ProcessEnv = process.env
): Array<string | RegExp> {
  const override = env.CLIENT_ORIGINS?.trim();
  if (override) {
    return override
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  const production: Array<string | RegExp> = [
    "https://chaverola.com",
    "https://www.chaverola.com",
    VERCEL_PREVIEW_ORIGIN,
  ];
  if (env.NODE_ENV === "production") return production;
  // 5173 is Vite's default; 5174 is where Vite lands when another repo's
  // dev server already holds 5173 — a daily occurrence on this machine.
  // 5199 is the designated verification port (tools/verify pins it with
  // --strictPort), so harness launches need no CLIENT_ORIGINS override.
  return [
    ...production,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5199",
    "http://127.0.0.1:5199",
  ];
}

/**
 * CHAVEROLA_TIME_SCALE compresses the lobby's real-flow clocks (grace,
 * broadcast gate, ping cycle, auto-match — see live/timing.ts) so localhost
 * verification doesn't wait out real-world minutes. Dev-only by two locks:
 * Render never sets the var, and production forces 1 even if it leaks in.
 */
export function readTimeScale(env: NodeJS.ProcessEnv = process.env): number {
  if (env.NODE_ENV === "production") return 1;
  const scale = Number(env.CHAVEROLA_TIME_SCALE);
  if (!Number.isFinite(scale)) return 1;
  return Math.min(100, Math.max(1, scale));
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT);
  return {
    port: Number.isInteger(port) && port > 0 ? port : 3001,
    nodeEnv: env.NODE_ENV ?? "development",
    corsOrigins: allowedOrigins(env),
    timeScale: readTimeScale(env),
  };
}
