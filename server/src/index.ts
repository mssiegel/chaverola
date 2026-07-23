import http from "node:http";

import { pino } from "pino";

import { buildApp } from "./app";
import { readConfig } from "./config";
import { createMailer } from "./email/mailer";
import { attachLobby } from "./live/lobby";
import { startSweep } from "./store/activityStore";

/*
  The only side-effectful file. One pino logger serves both layers —
  pino-http for Express, the lobby for sockets (engine.io bypasses Express,
  so pino-http never sees a handshake). The http.Server seam exists exactly
  so attachLobby can wrap it — app.ts stays listen-free.
*/

const config = readConfig();
const logger = pino();
// The transcript mailer is built here (the composition root) and threaded
// into the lobby; it logs its chosen mode once. Unused until feature 11's
// End activity lands — created now so that prompt stays pure feature.
const mailer = createMailer(config, logger);
const server = http.createServer(buildApp(config, logger));
const io = attachLobby(server, config, logger, mailer);

startSweep();

server.listen(config.port, "0.0.0.0", () => {
  logger.info(`@chaverola/server listening on port ${config.port}`);
});

// Render sends SIGTERM on every deploy. io.close() is the single owner of
// shutdown: it disconnects every socket AND closes the attached http.Server
// (Socket.IO v4) — a bare server.close() would never finish while WebSocket
// connections stay open. Nothing to flush — the store is in-memory by
// design and deploys wipe it.
process.on("SIGTERM", () => {
  io.close(() => process.exit(0));
});
