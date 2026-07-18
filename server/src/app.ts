import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import type { ApiErrorResponse } from "@chaverola/shared";

import type { Config } from "./config";
import { HttpError, invalidJson, notFound } from "./lib/httpErrors";
import { activitiesRouter } from "./routes/activities";

/*
  buildApp returns the app WITHOUT listening: supertest targets it directly,
  and the Socket.IO feature will wrap it in an http.Server (see index.ts).
*/

/**
 * 429s use the shared envelope. The ApiErrorCode union has no rate-limit
 * code on purpose (the client treats every non-2xx the same); `capacity`
 * is the honest fit — "too much right now, back off" — and the 429 vs 503
 * status keeps the two cases distinguishable.
 */
function rateLimited(_req: Request, res: Response): void {
  const body: ApiErrorResponse = {
    error: {
      code: "capacity",
      message: "Too many requests from this address. Wait a bit, then retry.",
    },
  };
  res.status(429).json(body);
}

// Rate limits are sized for one school NAT: 20 simultaneous classes × 30
// students = 600 users on one IP.
const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // 20 teachers starting class at once, ×3 headroom.
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimited,
});
const getLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  // 600 students × ~2 lookups in a join burst, ×2 headroom. Residual
  // exposure: a full 9,000-code sweep from one IP takes ~37 minutes —
  // accepted, since the student projection is public-by-assumption.
  limit: 1200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimited,
});

/** Body-parser failures mapped per the contract — never a mislabeled 500. */
function asBodyParserError(err: object): HttpError | undefined {
  if (!("type" in err)) return undefined;
  switch (err.type) {
    case "entity.parse.failed":
      return invalidJson();
    case "entity.too.large":
      return new HttpError(
        400,
        "invalid_request",
        "The body exceeds the 16kb limit."
      );
    default:
      return undefined;
  }
}

export function buildApp(config: Config): express.Express {
  const app = express();
  // Exactly one proxy (Render's) sits in front — needed so the rate
  // limiters see real client IPs, not Render's.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({ origin: config.corsOrigins, credentials: false, maxAge: 86400 })
  );
  app.use(pinoHttp({ autoLogging: config.nodeEnv !== "test" }));

  // Before the limiters: this is the warm-up ping every visitor fires and
  // Render's health check — neither should burn limiter budget.
  app.get("/healthz", (_req, res) => {
    // `commit` comes from Render's injected env; JSON drops it locally.
    res.json({ ok: true, commit: process.env.RENDER_GIT_COMMIT });
  });

  // The two GET lookups (joinCode + hostKey) share one limiter.
  app.use("/activities", (req, res, next) => {
    (req.method === "POST" ? postLimiter : getLimiter)(req, res, next);
  });

  app.use(express.json({ limit: "16kb" }));
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.use("/activities", activitiesRouter);

  // Unknown routes get the envelope too.
  app.use((_req, res) => {
    res.status(404).json(notFound().toBody());
  });

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const known =
      err instanceof HttpError
        ? err
        : typeof err === "object" && err !== null
          ? asBodyParserError(err)
          : undefined;
    if (known) {
      res.status(known.status).json(known.toBody());
      return;
    }

    req.log.error(err);
    const body: ApiErrorResponse = {
      error: { code: "internal", message: "Something broke on our end." },
    };
    res.status(500).json(body);
  });

  return app;
}
