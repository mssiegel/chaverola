// Shared harness for Chaverola verification passes (born as feature 3's
// prod harness; repo code since the speedup plan, prompt 2).
// Every driver imports this so the common parts are correct once.
//
// Targets: the local stack by default (5199 / 3001 — `pnpm verify:up`
// starts it), `--prod` on any driver's argv for chaverola.com, or
// CHAVEROLA_WEB / CHAVEROLA_API env overrides for anything else.
//
// Prod truths baked in here:
//  - ?fast does nothing (demoTime.ts returns 1 unless import.meta.env.DEV)
//  - setOffline does not sever an established websocket in this Chromium;
//    goto("about:blank") is the prod-proven drop (see dropConnection)
//  - the pairing panel is mounted TWICE (aside + lg:hidden collapsible), so
//    every rail selector must be scoped to the aside
//  - chat cards are section.shadow-md; ended ones add .opacity-95
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const prod = process.argv.includes("--prod");
export const CLIENT =
  process.env.CHAVEROLA_WEB ??
  (prod ? "https://chaverola.com" : "http://localhost:5199");
export const API =
  process.env.CHAVEROLA_API ??
  (prod ? "https://api.chaverola.com" : "http://localhost:3001");

// --- result collection: never exit on first failure, a run is expensive ---
const results = [];
export function check(cond, label, detail = "") {
  results.push({ ok: !!cond, label, detail });
  console.log(
    `${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`
  );
  return !!cond;
}
export function note(msg) {
  console.log(`NOTE ${msg}`);
}
export function summary(title) {
  const bad = results.filter((r) => !r.ok);
  console.log(`\n===== ${title} =====`);
  console.log(`${results.length - bad.length}/${results.length} passed`);
  for (const b of bad)
    console.log(`  FAIL ${b.label}${b.detail ? ` — ${b.detail}` : ""}`);
  return bad.length;
}
export function exitWith(title) {
  process.exit(summary(title) ? 1 : 0);
}

export async function launch() {
  return chromium
    .launch({ channel: "chrome", headless: true })
    .catch(() => chromium.launch({ channel: "msedge", headless: true }));
}

const SHOTS_DIR = fileURLToPath(new URL("shots/", import.meta.url));
export const SHOT = (name) => {
  mkdirSync(SHOTS_DIR, { recursive: true });
  return `${SHOTS_DIR}${name}.png`;
};

// --- activity minting -------------------------------------------------
export async function createActivity({
  hostName = "Ms. Prod",
  characters = ["Herzl", "Ben-Gurion"],
  settings = {},
} = {}) {
  const res = await fetch(`${API}/activities`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      hostName,
      characters: characters.map((name) => ({ name, description: "" })),
      settings: {
        revealNames: true,
        rematchWarning: true,
        autoMatch: false,
        autoMatchSeconds: 5,
        ...settings,
      },
    }),
  });
  if (res.status !== 201) throw new Error(`create failed: ${res.status}`);
  const body = await res.json();
  const activity = body.activity ?? body;
  return {
    joinCode: activity.joinCode,
    hostKey: body.hostKey ?? activity.hostKey,
    activity,
  };
}

// --- teacher ----------------------------------------------------------
export async function openTeacher(browser, hostKey, label = "teacher") {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  let sawSocket = false;
  page.on("websocket", (ws) => {
    if (ws.url().includes("/socket.io/")) sawSocket = true;
  });
  await page.goto(`${CLIENT}/activity/host/${hostKey}`);
  await page
    .getByRole("heading", { level: 1, name: "Your activity is live" })
    .waitFor({ timeout: 25000 });
  return { ctx, page, label, sawSocket: () => sawSocket };
}

/** The pairing rail. Scope EVERY queue selector to this. */
export const rail = (page) => page.locator("aside");

export const queueRow = (page, name) =>
  rail(page).locator("li", { hasText: name }).first();

export const selectRow = (page, name) =>
  rail(page).locator("li button[aria-pressed]", { hasText: name }).first();

/**
 * Wait until the teacher queue holds at least `n` rows. The lobby renders
 * before the seat lands, so asserting a row right after a join is a race —
 * always go through this.
 */
export async function waitForQueueRows(page, n, timeout = 15000) {
  const rows = rail(page).locator("li");
  const deadline = Date.now() + timeout;
  for (;;) {
    const count = await rows.count();
    if (count >= n) return count;
    if (Date.now() > deadline)
      throw new Error(
        `queue rows: wanted ${n}, still ${count} after ${timeout}ms`
      );
    await sleep(150);
  }
}

/** Live cards only (ended cards carry .opacity-95). */
export const liveCard = (page, ...names) => {
  let loc = page.locator("section.shadow-md:not(.opacity-95)", {
    hasText: names[0],
  });
  for (const n of names.slice(1)) loc = loc.filter({ hasText: n });
  return loc.first();
};

export const endedCard = (page, ...names) => {
  let loc = page.locator("section.shadow-md.opacity-95", { hasText: names[0] });
  for (const n of names.slice(1)) loc = loc.filter({ hasText: n });
  return loc.first();
};

// --- students ---------------------------------------------------------
export async function joinStudent(browser, joinCode, name) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(`${CLIENT}/activity/join/${joinCode}`);
  await page.getByPlaceholder("Your name").waitFor({ timeout: 25000 });
  await page.getByPlaceholder("Your name").fill(name);
  await page.getByRole("button", { name: "Join Activity" }).click();
  await page.getByText("Waiting for your match").waitFor({ timeout: 25000 });
  return { ctx, page, name };
}

/** The canonical proof a student is seated in a chat room. (Was
 * /No messages yet/ in the feature-3 era of disabled composers — a stale
 * probe that cost a run on 2026-07-21.) */
export const seated = (page) => page.getByPlaceholder(/Talk as/);

export async function inRoom(page, timeout = 20000) {
  try {
    await seated(page).waitFor({ timeout });
    return true;
  } catch {
    return false;
  }
}

export async function isInRoom(page) {
  return (await seated(page).count()) > 0;
}

export const endedHeading = (page) =>
  page.getByRole("heading", { name: "Your teacher ended the chat" });

export const backToLobby = (page) =>
  page.getByRole("button", { name: /Back to the lobby/ });

/**
 * The privacy pin: the student wire carries characterIds only. Returns the
 * room's visible text so a caller can assert no real name leaked into it.
 */
export async function roomText(page) {
  return (
    (await page
      .locator("main")
      .innerText()
      .catch(() => "")) || ""
  );
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Sever a page's connection for real. CDP setOffline never severs an
 * established websocket in this Chromium — navigating away is the
 * prod-proven drop.
 */
export async function dropConnection(page) {
  await page.goto("about:blank");
}

/**
 * For demo zero-socket sweeps: attach BEFORE navigating, then ask the
 * returned function whether any /socket.io/ traffic (websocket or
 * polling fallback) ever left the page.
 */
export function watchForSocketTraffic(page) {
  let saw = false;
  page.on("websocket", (ws) => {
    if (ws.url().includes("/socket.io/")) saw = true;
  });
  page.on("request", (req) => {
    if (req.url().includes("/socket.io/")) saw = true;
  });
  return () => saw;
}
