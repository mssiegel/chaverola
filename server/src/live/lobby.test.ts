import http from "node:http";
import type { AddressInfo } from "node:net";

import { pino } from "pino";
import { io as connectClient } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_ACTIVITY_SETTINGS } from "@chaverola/shared";
import type {
  ChatSnapshot,
  ChatTranscriptLine,
  ClientToServerEvents,
  QueueEntry,
  ServerToClientEvents,
} from "@chaverola/shared";

import { createActivity, resetForTests } from "../store/activityStore";
import type { StoredActivity } from "../store/activityStore";
import { attachLobby } from "./lobby";
import { createChat, markInactive } from "./matching";
import { markWrappingUp, reapSeat } from "./seats";

/*
  Deliberately light (see the plan doc): the safety invariants and one happy
  path, over real sockets against an ephemeral server. Grace timing, the
  broadcast delay, duplicate-tab takeover, the seat cap, TTL touch, the
  send rate limit, and shutdown are covered by the feature's browser and
  production passes and the deploy logs. Two messaging guards are pinned
  here: the cap's UNIT — code points — because a .length regression would
  eat emoji-heavy messages invisibly in any browser pass, and the teacher
  transcript's ROOM boundary — real names ride chat:transcript-line and
  chats:snapshot, so neither may ever reach a student socket. The typing
  relay's boundary is pinned the same way: chat:peer-typing reaches the
  OTHER chat members only — never the sender, never the teacher room.
  Teacher-initiated ending pins its own invariants: chat:end/chats:end-all
  reach every member (wrappingUp, off the matchable pool), repeats emit
  nothing, and a dropped member's resume re-delivers chat:ended. Pausing
  pins its boundaries the same way: the flip reaches every connected seat,
  a mid-pause welcome carries it, a paused chat:send dies silently, and
  resume lets lines flow again. The clock shift itself is matching.test.ts.
  The peer-drop relay (feature 8) gets the same treatment:
  chat:peer-connection reaches the OTHER chat members only — never the
  affected seat, never the teacher room — with the drop landing past the
  broadcast gate and a resume announcing the return. (That one test runs
  its own lobby at timeScale 8 — the gate wait shrinks to 500ms and the
  scaling mechanism itself gets pinned; grace TIMING stays out, per the
  charter above.)
  The reaped returner (feature 9) pins its wire shape the same way: the
  expiry is simulated store-direct, and the return must replay exactly
  welcome → chat:started → chat:ended {self-timeout}, silently to the room.
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
    { port: 0, nodeEnv: "test", corsOrigins: [], timeScale: 1 },
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
  new Promise<{ studentId: string; token: string; paused: boolean }>(
    (resolve) => {
      socket.once("lobby:welcome", resolve);
    }
  );
const nextActivityPaused = (socket: ClientSocket) =>
  new Promise<{ paused: boolean }>((resolve) => {
    socket.once("activity:paused", resolve);
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
const nextChatLine = (socket: ClientSocket) =>
  new Promise<{
    chatId: string;
    line: { id: string; characterId: string; text: string; sentAt: number };
  }>((resolve) => {
    socket.once("chat:line", resolve);
  });
const nextTranscriptLine = (socket: ClientSocket) =>
  new Promise<{ chatId: string; line: ChatTranscriptLine }>((resolve) => {
    socket.once("chat:transcript-line", resolve);
  });
const nextChatEnded = (socket: ClientSocket) =>
  new Promise<{ reason: "teacher" | "peer-timeout" | "self-timeout" }>(
    (resolve) => {
      socket.once("chat:ended", resolve);
    }
  );
const nextPeerConnection = (socket: ClientSocket) =>
  new Promise<{
    chatId: string;
    characterId: string;
    state: "dropped" | "returned";
    secondsLeft: number | null;
  }>((resolve) => {
    socket.once("chat:peer-connection", resolve);
  });
/** Chats snapshots fire on every seat change too — wait for the one that
 *  matters. */
const chatsSnapshotWhere = (
  socket: ClientSocket,
  predicate: (payload: { chats: ChatSnapshot[]; paused: boolean }) => boolean
) =>
  new Promise<{ chats: ChatSnapshot[]; paused: boolean }>((resolve) => {
    const handler = (payload: { chats: ChatSnapshot[]; paused: boolean }) => {
      if (!predicate(payload)) return;
      socket.off("chats:snapshot", handler);
      resolve(payload);
    };
    socket.on("chats:snapshot", handler);
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

  it("ignores every teacher command from a student socket — chat:start, settings:update, chat:remove, chat:end, chats:end-all, and the pause pair", async () => {
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
    studentA.emit("chat:end", { chatId: chat.id });
    studentA.emit("chats:end-all");
    studentA.emit("chats:pause-all");
    studentA.emit("chats:resume-all");
    await sleep(100);
    expect(chat.status).toBe("active");
    expect(chat.inactiveStudentIds).toEqual([]);
    expect(activity.pausedAt).toBeNull();
  });

  it("chat:end puts every member on the ended screen — chat:ended to both, seats wrappingUp", async () => {
    const teacher = connect({ role: "teacher", hostKey: activity.hostKey });
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
    // `!` — both members are eligible; the chat just built above them.
    const chat = createChat(
      activity,
      [welcomeA.studentId, welcomeB.studentId],
      Date.now()
    )!;

    const endedAtA = nextChatEnded(studentA);
    const endedAtB = nextChatEnded(studentB);
    const endedSnapshot = chatsSnapshotWhere(teacher, (p) =>
      p.chats.some((c) => c.id === chat.id && c.status === "ended")
    );
    teacher.emit("chat:end", { chatId: chat.id });

    const [payloadA, payloadB] = await Promise.all([endedAtA, endedAtB]);
    expect(payloadA).toEqual({ reason: "teacher" });
    expect(payloadB).toEqual({ reason: "teacher" });
    await endedSnapshot;

    expect(chat.status).toBe("ended");
    expect(chat.endReason).toBe("teacher");
    // Nobody left the room — the chat ended around intact membership.
    expect(chat.inactiveStudentIds).toEqual([]);
    // Both stay off the matchable pool until their own Back-to-lobby tap.
    expect(activity.seats.byId.get(welcomeA.studentId)!.wrappingUp).toBe(true);
    expect(activity.seats.byId.get(welcomeB.studentId)!.wrappingUp).toBe(true);
  });

  it("chats:end-all closes every active chat at once, and a repeat is a no-op", async () => {
    const teacher = connect({ role: "teacher", hostKey: activity.hostKey });
    await nextSnapshot(teacher);
    const students = [];
    const welcomes = [];
    for (const [name, nonce] of [
      ["Rachel", "nonce-a"],
      ["Noa", "nonce-b"],
      ["Tamar", "nonce-c"],
      ["Adi", "nonce-d"],
    ] as const) {
      const socket = connect({
        role: "student",
        joinCode: activity.joinCode,
        name,
        nonce,
      });
      students.push(socket);
      welcomes.push(await nextWelcome(socket));
    }
    const now = Date.now();
    // `!` — all four are eligible; the chats just built above them.
    const first = createChat(
      activity,
      [welcomes[0]!.studentId, welcomes[1]!.studentId],
      now
    )!;
    const second = createChat(
      activity,
      [welcomes[2]!.studentId, welcomes[3]!.studentId],
      now
    )!;

    const allEnded = Promise.all(students.map(nextChatEnded));
    // The members' chat:ended emits land before the room's own broadcast —
    // wait for the snapshot too, so the collectors below can't catch it.
    // Both chats present AND ended — an in-flight pre-chat snapshot's empty
    // list would satisfy a bare every().
    const bothEndedSnapshot = chatsSnapshotWhere(
      teacher,
      (p) => p.chats.length === 2 && p.chats.every((c) => c.status === "ended")
    );
    teacher.emit("chats:end-all");
    for (const payload of await allEnded) {
      expect(payload).toEqual({ reason: "teacher" });
    }
    await bothEndedSnapshot;
    expect(first.status).toBe("ended");
    expect(second.status).toBe("ended");

    // A second end-all (zero active) and an end on an already-ended chat
    // emit nothing — the idempotency rule.
    const echoes: unknown[] = [];
    for (const socket of students) {
      socket.on("chat:ended", (p) => echoes.push(p));
    }
    teacher.on("chats:snapshot", (p) => echoes.push(p));
    teacher.emit("chats:end-all");
    teacher.emit("chat:end", { chatId: first.id });
    await sleep(100);
    expect(echoes).toEqual([]);
  });

  it("chats:pause-all freezes the class for everyone, and resume lets lines flow again", async () => {
    const teacher = connect({ role: "teacher", hostKey: activity.hostKey });
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
    const waiter = connect({
      role: "student",
      joinCode: activity.joinCode,
      name: "Tamar",
      nonce: "nonce-c",
    });
    const welcomeA = await nextWelcome(studentA);
    const welcomeB = await nextWelcome(studentB);
    const waiterWelcome = await nextWelcome(waiter);
    expect(waiterWelcome.paused).toBe(false);
    // `!` — both members are eligible; the chat just built above them.
    const chat = createChat(
      activity,
      [welcomeA.studentId, welcomeB.studentId],
      Date.now()
    )!;

    // The pause is activity-wide: chat members AND the lobby waiter hear it,
    // and the teacher's snapshot flips.
    const pausedFlips = Promise.all(
      [studentA, studentB, waiter].map((s) => nextActivityPaused(s))
    );
    const pausedSnapshot = chatsSnapshotWhere(teacher, (p) => p.paused);
    teacher.emit("chats:pause-all");
    for (const flip of await pausedFlips) {
      expect(flip).toEqual({ paused: true });
    }
    await pausedSnapshot;
    expect(activity.pausedAt).not.toBeNull();

    // A send into the frozen room dies silently — no line to anyone.
    const frozenLines: unknown[] = [];
    studentA.on("chat:line", (p) => frozenLines.push(p));
    studentB.on("chat:line", (p) => frozenLines.push(p));
    studentA.emit("chat:send", { text: "anyone?" });
    await sleep(100);
    expect(frozenLines).toEqual([]);
    expect(chat.lines).toEqual([]);

    // A mid-pause join is welcomed frozen.
    const midPause = connect({
      role: "student",
      joinCode: activity.joinCode,
      name: "Adi",
      nonce: "nonce-d",
    });
    const midWelcome = await nextWelcome(midPause);
    expect(midWelcome.paused).toBe(true);

    // Resume flips everyone back and the next send lands.
    const resumeFlips = Promise.all(
      [studentA, studentB, waiter, midPause].map((s) => nextActivityPaused(s))
    );
    teacher.emit("chats:resume-all");
    for (const flip of await resumeFlips) {
      expect(flip).toEqual({ paused: false });
    }
    const lineAtB = nextChatLine(studentB);
    studentA.emit("chat:send", { text: "moving again" });
    expect((await lineAtB).line.text).toBe("moving again");
    expect(activity.pausedAt).toBeNull();
  });

  it("ending around a dropped member arms a fresh grace, and their resume lands on the ended screen", async () => {
    const teacher = connect({ role: "teacher", hostKey: activity.hostKey });
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
    // `!` — both members are eligible; the chat just built above them.
    createChat(activity, [welcomeA.studentId, welcomeB.studentId], Date.now())!;

    studentA.disconnect();
    await sleep(100);

    const endedAtB = nextChatEnded(studentB);
    teacher.emit("chat:end", { chatId: activity.chats[0]!.id });
    await endedAtB;

    // The dropped member still went wrappingUp, with a fresh grace so the
    // seat can't live untimed until activity death.
    const seat = activity.seats.byId.get(welcomeA.studentId)!;
    expect(seat.wrappingUp).toBe(true);
    expect(seat.timers.grace).toBeDefined();

    // A resume lands straight on the ended screen — the wrappingUp branch
    // re-delivers chat:ended.
    const resumed = connect({
      role: "student",
      joinCode: activity.joinCode,
      studentId: welcomeA.studentId,
      token: welcomeA.token,
    });
    const [welcome, ended] = await Promise.all([
      nextWelcome(resumed),
      nextChatEnded(resumed),
    ]);
    expect(welcome.studentId).toBe(welcomeA.studentId);
    expect(ended).toEqual({ reason: "teacher" });
  });

  it("measures the chat:send cap in code points, not UTF-16 units", async () => {
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
    createChat(activity, [welcomeA.studentId, welcomeB.studentId], Date.now())!;

    // 75 emoji: exactly the cap in code points, twice it in .length —
    // a .length guard would silently eat this message. The composer counts
    // the same way (charCount), so what it accepts must land.
    const text = "😀".repeat(75);
    expect(text.length).toBe(150);
    const lineAtB = nextChatLine(studentB);
    studentA.emit("chat:send", { text });

    const payload = await lineAtB;
    expect(payload.line.text).toBe(text);
  });

  it("delivers the transcript line, real name attached, to the teacher room only", async () => {
    const teacher = connect({ role: "teacher", hostKey: activity.hostKey });
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
    // `!` — both members are eligible; the chat just built above them.
    createChat(activity, [welcomeA.studentId, welcomeB.studentId], Date.now())!;

    // The room boundary: names ride chat:transcript-line and chats:snapshot,
    // and a student socket must never hear either.
    const studentLeaks: unknown[] = [];
    for (const socket of [studentA, studentB]) {
      socket.on("chat:transcript-line", (p) => studentLeaks.push(p));
      socket.on("chats:snapshot", (p) => studentLeaks.push(p));
    }

    const transcriptAtTeacher = nextTranscriptLine(teacher);
    const lineAtB = nextChatLine(studentB);
    studentA.emit("chat:send", { text: "Et tu?" });

    const teacherPayload = await transcriptAtTeacher;
    expect(teacherPayload.line).toMatchObject({
      studentId: welcomeA.studentId,
      name: "Rachel",
      text: "Et tu?",
    });
    // Same stored line, two projections: what the teacher reads is exactly
    // what the peers received.
    const peerPayload = await lineAtB;
    expect(teacherPayload.line.id).toBe(peerPayload.line.id);
    expect(teacherPayload.line.characterId).toBe(peerPayload.line.characterId);

    await sleep(100);
    expect(studentLeaks).toEqual([]);
  });

  it("relays chat:typing to the other members only — never the sender, never the teacher", async () => {
    const teacher = connect({ role: "teacher", hostKey: activity.hostKey });
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
    // `!` — both members are eligible; the chat just built above them.
    const chat = createChat(
      activity,
      [welcomeA.studentId, welcomeB.studentId],
      Date.now()
    )!;

    // The room boundary plus the privacy pin: typing reaches the OTHER
    // members only — never back to the sender, never the teacher room.
    const leaks: unknown[] = [];
    teacher.on("chat:peer-typing", (p) => leaks.push(p));
    studentA.on("chat:peer-typing", (p) => leaks.push(p));

    const typingAtB = new Promise<{ chatId: string; characterId: string }>(
      (resolve) => {
        studentB.once("chat:peer-typing", resolve);
      }
    );
    // Once — the min-interval guard eats rapid repeats, so a burst here
    // would deliver exactly this one relay anyway.
    studentA.emit("chat:typing");

    const payload = await typingAtB;
    expect(Object.keys(payload).sort()).toEqual(["characterId", "chatId"]);
    expect(payload.chatId).toBe(chat.id);
    // `!` — the chat was just created with A as a member.
    const memberA = chat.members.find(
      (m) => m.studentId === welcomeA.studentId
    )!;
    expect(payload.characterId).toBe(memberA.characterId);

    await sleep(100);
    expect(leaks).toEqual([]);
  });

  it("a matched seat's drop arms a grace timer, and a resume re-delivers chat:started", async () => {
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
    // `!` — the drop keeps the seat; only a grace expiry reaps it.
    const seat = activity.seats.byId.get(welcomeA.studentId)!;
    expect(seat.connected).toBe(false);
    expect(seat.timers.broadcast).toBeDefined();
    // A matched seat arms the SAME grace a waiting one does. It used to arm
    // none, which meant a student whose lobby:leave died in transit was
    // indistinguishable from one mid-blip, and their partner sat in a dead
    // room until the activity expired (found on a real handset 2026-07-20).
    // What happens when this fires — the seat leaves its chat, not just its
    // seat — is proven by f3p5-leave-offline-repro.mjs against production;
    // grace TIMING stays out of this file by design (see the header).
    expect(seat.timers.grace).toBeDefined();

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

  it("a partner's drop past the broadcast gate reaches the room, and their resume flips it back", async () => {
    // This test runs on its OWN lobby at timeScale 8 — the 4s gate lands in
    // 500ms and grace is a 15s window, so waiting out the gate costs half a
    // second instead of four AND the scaling mechanism itself stays pinned
    // in the automated suite. The scale deliberately does NOT go in the
    // shared beforeEach config: at scale 8 the default 20s auto-match
    // threshold compresses to 2.5s and would quietly auto-pair waiting
    // students mid-test across the rest of the suite. (Both lobbies share
    // the store, so the shared `activity` record works here too.)
    const scaledHttp = http.createServer();
    const scaledIo = attachLobby(
      scaledHttp,
      { port: 0, nodeEnv: "test", corsOrigins: [], timeScale: 8 },
      pino({ level: "silent" })
    );
    await new Promise<void>((resolve) => {
      scaledHttp.listen(0, "127.0.0.1", resolve);
    });
    const scaledPort = (scaledHttp.address() as AddressInfo).port;
    const connectScaled = (auth: Record<string, unknown>): ClientSocket => {
      const socket: ClientSocket = connectClient(
        `http://127.0.0.1:${scaledPort}`,
        { auth, transports: ["websocket"], reconnection: false, forceNew: true }
      );
      clients.push(socket);
      return socket;
    };

    try {
      const teacher = connectScaled({
        role: "teacher",
        hostKey: activity.hostKey,
      });
      const studentA = connectScaled({
        role: "student",
        joinCode: activity.joinCode,
        name: "Rachel",
        nonce: "nonce-a",
      });
      const studentB = connectScaled({
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

      // The boundary: the affected seat and the teacher room never hear it
      // (the teacher's card already carries reconnectingStudentIds).
      const leaks: unknown[] = [];
      teacher.on("chat:peer-connection", (p) => leaks.push(p));
      studentA.on("chat:peer-connection", (p) => leaks.push(p));

      const droppedAtB = nextPeerConnection(studentB);
      studentA.disconnect();
      // Lands past the (scaled) broadcast-delay gate — the gate IS the
      // invariant here.
      const dropped = await droppedAtB;
      expect(Object.keys(dropped).sort()).toEqual([
        "characterId",
        "chatId",
        "secondsLeft",
        "state",
      ]);
      expect(dropped.state).toBe("dropped");
      expect(dropped.chatId).toBe(chat.id);
      // `!` — the chat was just created with A as a member.
      const memberA = chat.members.find(
        (m) => m.studentId === welcomeA.studentId
      )!;
      expect(dropped.characterId).toBe(memberA.characterId);
      // The 15s window minus the 0.5s gate. Slack on both sides: a slow
      // event loop fires the timer late (secondsLeft dips), and Windows
      // timer resolution can fire it a hair EARLY (ceil then lands on the
      // full window — the unscaled version's 117-vs-120 lesson).
      expect(dropped.secondsLeft).toBeGreaterThan(10);
      expect(dropped.secondsLeft).toBeLessThanOrEqual(15);

      const returnedAtB = nextPeerConnection(studentB);
      const resumed = connectScaled({
        role: "student",
        joinCode: activity.joinCode,
        studentId: welcomeA.studentId,
        token: welcomeA.token,
      });
      // The returning student must not hear their own return either.
      resumed.on("chat:peer-connection", (p) => leaks.push(p));
      const returned = await returnedAtB;
      expect(returned.state).toBe("returned");
      expect(returned.chatId).toBe(chat.id);
      expect(returned.characterId).toBe(memberA.characterId);
      expect(returned.secondsLeft).toBeNull();

      await sleep(100);
      expect(leaks).toEqual([]);
    } finally {
      await new Promise<void>((resolve) => {
        scaledIo.close(() => resolve());
      });
    }
  });

  it("a reaped chat member's return replays the ended chat as self-timeout and seats them wrapping up", async () => {
    const teacher = connect({ role: "teacher", hostKey: activity.hostKey });
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
    // `!` — both members are eligible; the chat just built above them.
    const chat = createChat(
      activity,
      [welcomeA.studentId, welcomeB.studentId],
      Date.now()
    )!;

    // One line on the record, delivered — the replay must carry it back.
    const lineAtB = nextChatLine(studentB);
    studentA.emit("chat:send", { text: "Et tu?" });
    await lineAtB;

    studentA.disconnect();
    await sleep(100);

    // Simulate the grace expiry store-direct — onGraceExpiry minus its
    // emits (grace TIMING stays out of this file, per the header; B's own
    // chat:ended {peer-timeout} leg is feature 8's, pinned by its browser
    // pass and matching.test.ts): the chat ends around B, and A's seat is
    // reaped WITH its chat remembered.
    const seatA = activity.seats.byId.get(welcomeA.studentId)!;
    const seatB = activity.seats.byId.get(welcomeB.studentId)!;
    markInactive(activity, chat.id, welcomeA.studentId, "peer-timeout");
    markWrappingUp(seatB);
    reapSeat(activity, seatA, chat.id);
    expect(activity.seats.byId.has(welcomeA.studentId)).toBe(false);

    // The boundary: B — who already saw the ending — hears nothing when
    // the reaped member returns. No ghost chat:started, no return flash.
    const leaksAtB: unknown[] = [];
    studentB.on("chat:started", (p) => leaksAtB.push(p));
    studentB.on("chat:peer-connection", (p) => leaksAtB.push(p));
    studentB.on("chat:ended", (p) => leaksAtB.push(p));

    // The return presents exactly what a real reload persists: the old
    // credentials and the old nonce.
    const resumed = connect({
      role: "student",
      joinCode: activity.joinCode,
      name: "Rachel",
      nonce: "nonce-a",
      studentId: welcomeA.studentId,
      token: welcomeA.token,
    });
    const order: string[] = [];
    let welcome: { studentId: string; token: string } | undefined;
    let started:
      | {
          chatId: string;
          selfCharacterId: string;
          peers: { characterId: string }[];
          lines: { text: string }[];
        }
      | undefined;
    resumed.on("lobby:welcome", (p) => {
      order.push("welcome");
      welcome = p;
    });
    resumed.on("chat:started", (p) => {
      order.push("started");
      started = p;
    });
    const ended = await new Promise((resolve) => {
      resumed.once("chat:ended", (p) => {
        order.push("ended");
        resolve(p);
      });
    });

    // The whole replay, in order, through the OLD chat identity — under a
    // NEW seat identity.
    expect(order).toEqual(["welcome", "started", "ended"]);
    expect(welcome!.studentId).not.toBe(welcomeA.studentId);
    // `!` — the chat was just created with both as members.
    const memberA = chat.members.find(
      (m) => m.studentId === welcomeA.studentId
    )!;
    const memberB = chat.members.find(
      (m) => m.studentId === welcomeB.studentId
    )!;
    expect(started!.chatId).toBe(chat.id);
    expect(started!.selfCharacterId).toBe(memberA.characterId);
    expect(started!.peers).toEqual([{ characterId: memberB.characterId }]);
    expect(started!.lines.map((l) => l.text)).toEqual(["Et tu?"]);
    expect(ended).toEqual({ reason: "self-timeout" });

    // Off the queue until their own tap.
    const newSeat = activity.seats.byId.get(welcome!.studentId)!;
    expect(newSeat.wrappingUp).toBe(true);

    // The tap re-queues them under the new identity — and clears the
    // replay context, so a later ending can't replay this chat again.
    const requeued = snapshotWhere(teacher, (p) =>
      p.students.some((s) => s.id === welcome!.studentId && s.name === "Rachel")
    );
    resumed.emit("lobby:back");
    await requeued;
    expect(newSeat.reapedFromChat).toBeUndefined();

    await sleep(100);
    expect(leaksAtB).toEqual([]);
  }, 15_000);
});
