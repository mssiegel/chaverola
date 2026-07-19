import http from "node:http";
import type { AddressInfo } from "node:net";

import { pino } from "pino";
import { io as connectClient } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_ACTIVITY_SETTINGS } from "@chaverola/shared";
import type {
  ClientToServerEvents,
  QueueEntry,
  ServerToClientEvents,
} from "@chaverola/shared";

import { createActivity, resetForTests } from "../store/activityStore";
import type { StoredActivity } from "../store/activityStore";
import { attachLobby } from "./lobby";

/*
  Deliberately light (see the plan doc): the safety invariants and one happy
  path, over real sockets against an ephemeral server. Grace timing, the
  broadcast delay, duplicate-tab takeover, the cap, TTL touch, and shutdown
  are covered by the feature's browser passes and the deploy logs.
*/

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type Lobby = ReturnType<typeof attachLobby>;

let httpServer: http.Server;
let io: Lobby;
let port: number;
let clients: ClientSocket[];
let activity: StoredActivity;

beforeEach(async () => {
  resetForTests();
  clients = [];
  httpServer = http.createServer();
  io = attachLobby(
    httpServer,
    { port: 0, nodeEnv: "test", corsOrigins: [] },
    pino({ level: "silent" })
  );
  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", resolve);
  });
  port = (httpServer.address() as AddressInfo).port;
  activity = createActivity({
    hostName: "Ms. Cohen",
    characters: [{ name: "Brutus" }, { name: "Caesar" }],
    settings: { ...DEFAULT_ACTIVITY_SETTINGS },
  });
});

afterEach(async () => {
  for (const socket of clients) socket.disconnect();
  await new Promise<void>((resolve) => {
    io.close(() => resolve());
  });
});

function connect(auth: Record<string, unknown>): ClientSocket {
  const socket: ClientSocket = connectClient(`http://127.0.0.1:${port}`, {
    auth,
    transports: ["websocket"],
    reconnection: false,
    forceNew: true,
  });
  clients.push(socket);
  return socket;
}

const nextSnapshot = (socket: ClientSocket) =>
  new Promise<{ students: QueueEntry[] }>((resolve) => {
    socket.once("queue:snapshot", resolve);
  });
const nextWelcome = (socket: ClientSocket) =>
  new Promise<{ studentId: string; token: string }>((resolve) => {
    socket.once("lobby:welcome", resolve);
  });
const connectError = (socket: ClientSocket) =>
  new Promise<Error>((resolve) => {
    socket.once("connect_error", resolve);
  });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("the live lobby", () => {
  it("seats a student into the teacher's snapshot — and never into the student's", async () => {
    const teacher = connect({ role: "teacher", hostKey: activity.hostKey });
    const emptySnapshot = await nextSnapshot(teacher);
    expect(emptySnapshot.students).toEqual([]);

    const laterSnapshot = nextSnapshot(teacher);
    const student = connect({
      role: "student",
      joinCode: activity.joinCode,
      name: "Rachel",
      nonce: "nonce-1",
    });
    const studentSnapshots: unknown[] = [];
    student.on("queue:snapshot", (payload) => studentSnapshots.push(payload));

    const welcome = await nextWelcome(student);
    expect(welcome.studentId).toBeTruthy();
    expect(welcome.token).toBeTruthy();

    const snapshot = await laterSnapshot;
    expect(snapshot.students).toHaveLength(1);
    expect(snapshot.students[0]).toMatchObject({
      id: welcome.studentId,
      name: "Rachel",
      connection: "connected",
    });

    // The occupancy-mystery rule: students never see the queue.
    await sleep(100);
    expect(studentSnapshots).toEqual([]);
  });

  it("a 4-digit code structurally cannot open a teacher socket", async () => {
    const impostor = connect({ role: "teacher", hostKey: activity.joinCode });
    const error = await connectError(impostor);
    expect(error.message).toBe("activity_gone");
  });

  it("ignores queue:remove from a student socket", async () => {
    const studentA = connect({
      role: "student",
      joinCode: activity.joinCode,
      name: "Rachel",
      nonce: "nonce-a",
    });
    const studentB = connect({
      role: "student",
      joinCode: activity.joinCode,
      name: "Noa",
      nonce: "nonce-b",
    });
    await nextWelcome(studentA);
    const welcomeB = await nextWelcome(studentB);

    studentA.emit("queue:remove", { studentId: welcomeB.studentId });
    await sleep(100);

    expect(activity.seats.byId.size).toBe(2);
    expect(studentB.connected).toBe(true);
  });

  it("a stale disconnect never reaps a resumed seat (the currentSocketId guard)", async () => {
    const first = connect({
      role: "student",
      joinCode: activity.joinCode,
      name: "Rachel",
      nonce: "nonce-1",
    });
    const welcome = await nextWelcome(first);

    // The refresh race: the new socket resumes the seat BEFORE the old
    // socket's disconnect arrives.
    const second = connect({
      role: "student",
      joinCode: activity.joinCode,
      studentId: welcome.studentId,
      token: welcome.token,
      name: "Rachel",
    });
    const resumed = await nextWelcome(second);
    expect(resumed.studentId).toBe(welcome.studentId);

    first.disconnect();
    await sleep(100);

    // `!` — the happy path just resumed this exact seat.
    const seat = activity.seats.byId.get(welcome.studentId)!;
    expect(seat.connected).toBe(true);
    expect(seat.timers.broadcast).toBeUndefined();
    expect(seat.timers.grace).toBeUndefined();
  });
});
