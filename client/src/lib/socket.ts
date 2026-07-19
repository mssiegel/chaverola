import { io, type Socket } from "socket.io-client";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  StudentAuth,
  TeacherAuth,
} from "@chaverola/shared";

import { API_BASE_URL } from "./api";

/*
  The client end of the lobby socket (contract in @chaverola/shared's
  socket.ts). socket.io-client is a deliberate ~13KB-gz bundle add — the
  join flow is the product.

  Deliberately a factory, never a module-level auto-connecting singleton:
  the demo (join code 1234) must stay structurally zero-network, so a
  socket only exists while a surface that owns one is mounted, and only
  for real activities.
*/

export type LobbySocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Build a lobby socket against the API origin, not yet connected.
 *
 * `auth` is a callback on purpose: socket.io-client re-invokes it before
 * EVERY connection attempt, auto-reconnects included, so each attempt
 * carries the freshest session state (the seat token `lobby:welcome`
 * persisted, not the one from page load).
 */
export function createLobbySocket(
  auth: () => StudentAuth | TeacherAuth
): LobbySocket {
  return io(API_BASE_URL, {
    autoConnect: false,
    auth: (cb) => cb(auth()),
  });
}
