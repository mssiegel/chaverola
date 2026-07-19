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
import { createChat } from "./matching";

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
const nextChatStarted = (socket: ClientSocket) =>
  new Promise<{
    chatId: string;
    selfCharacterId: string;
    peers: { characterId: string }[];
  }>((resolve) => {
    socket.once("chat:started", resolve);
  });
/** Queue snapshots also fire on every join — wait for the one that matters. */
const snapshotWhere = (
  socket: ClientSocket,
  predicate: (payload: { students: QueueEntry[] }) => boolean
) =>
  new Promise<{ students: QueueEntry[] }>((resolve) => {
    const handler = (payload: { students: QueueEntry[] }) => {
      if (!predicate(payload)) return;
      socket.off("queue:snapshot", handler);
      resolve(payload);
    };
    socket.on("queue:snapshot", handler);
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

  it("chat:start delivers targeted chat:started and empties the queue", async () => {
    const teacher = connect({ role: "teacher", hostKey: activity.hostKey });
    // In the room before anyone joins — later snapshots can't race past us.
    await nextSnapshot(teacher);
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
    const welcomeA = await nextWelcome(studentA);
    const welcomeB = await nextWelcome(studentB);

    const startedA = nextChatStarted(studentA);
    const startedB = nextChatStarted(studentB);
    // Every snapshot from here carries 1–2 waiting students until the match
    // empties the queue — an empty one can only be chat:start's.
    const emptyQueue = snapshotWhere(teacher, (p) => p.students.length === 0);
    teacher.emit("chat:start", {
      studentIds: [welcomeA.studentId, welcomeB.studentId],
    });

    const [payloadA, payloadB] = await Promise.all([startedA, startedB]);
    expect(payloadA.chatId).toBe(payloadB.chatId);
    expect(payloadA.selfCharacterId).not.toBe(payloadB.selfCharacterId);
    expect(payloadA.peers).toEqual([{ characterId: payloadB.selfCharacterId }]);

    // The occupancy rule: matched students leave the waiting queue.
    await emptyQueue;
  });

  it("ignores chat:start, settings:update, and chat:remove from a student socket", async () => {
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
    const welcomeA = await nextWelcome(studentA);
    const welcomeB = await nextWelcome(studentB);
    const started: unknown[] = [];
    studentA.on("chat:started", (payload) => started.push(payload));
    studentB.on("chat:started", (payload) => started.push(payload));

    studentA.emit("chat:start", {
      studentIds: [welcomeA.studentId, welcomeB.studentId],
    });
    studentA.emit("settings:update", {
      settings: { ...DEFAULT_ACTIVITY_SETTINGS, autoMatch: false },
    });
    await sleep(100);
    expect(activity.chats).toEqual([]);
    expect(activity.settings).toEqual(DEFAULT_ACTIVITY_SETTINGS);
    expect(started).toEqual([]);

    // `!` — both members are eligible; the chat just built above them.
    const chat = createChat(
      activity,
      [welcomeA.studentId, welcomeB.studentId],
      Date.now()
    )!;
    studentA.emit("chat:remove", {
      chatId: chat.id,
      studentId: welcomeB.studentId,
    });
    await sleep(100);
    expect(chat.status).toBe("active");
    expect(chat.inactiveStudentIds).toEqual([]);
  });

  it("a matched seat's drop arms no grace timer, and a resume re-delivers chat:started", async () => {
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
    const welcomeA = await nextWelcome(studentA);
    const welcomeB = await nextWelcome(studentB);
    // `!` — both members are eligible; the chat just built above them.
    const chat = createChat(
      activity,
      [welcomeA.studentId, welcomeB.studentId],
      Date.now()
    )!;

    studentA.disconnect();
    await sleep(100);
    // `!` — the drop keeps the seat; only a grace expiry could reap it.
    const seat = activity.seats.byId.get(welcomeA.studentId)!;
    expect(seat.connected).toBe(false);
    expect(seat.timers.broadcast).toBeDefined();
    expect(seat.timers.grace).toBeUndefined();

    const resumed = connect({
      role: "student",
      joinCode: activity.joinCode,
      studentId: welcomeA.studentId,
      token: welcomeA.token,
    });
    const [welcome, startedAgain] = await Promise.all([
      nextWelcome(resumed),
      nextChatStarted(resumed),
    ]);
    expect(welcome.studentId).toBe(welcomeA.studentId);
    expect(startedAgain.chatId).toBe(chat.id);
  });
});
