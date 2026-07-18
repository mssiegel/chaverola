import http from "node:http";

import { buildApp } from "./app";
import { readConfig } from "./config";
import { startSweep } from "./store/activityStore";

/*
  The only side-effectful file, and the Socket.IO seam: a later feature
  attaches `new SocketIOServer(server, ...)` to this http.Server — which is
  why it's http.createServer(app) and never app.listen().
*/

const config = readConfig();
const server = http.createServer(buildApp(config));

startSweep();

server.listen(config.port, "0.0.0.0", () => {
  console.log(`@chaverola/server listening on port ${config.port}`);
});

// Render sends SIGTERM on every deploy. Stop accepting connections, let
// in-flight requests finish, exit. Nothing to flush — the store is
// in-memory by design and deploys wipe it.
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
