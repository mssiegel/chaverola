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
  return [...production, "http://localhost:5173", "http://127.0.0.1:5173"];
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT);
  return {
    port: Number.isInteger(port) && port > 0 ? port : 3001,
    nodeEnv: env.NODE_ENV ?? "development",
    corsOrigins: allowedOrigins(env),
  };
}
