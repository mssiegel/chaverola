// First contact with a freshly deployed instance
// (`node tools/verify/coldwake.mjs --prod`): the deployed build boots, answers,
// and a teacher can create an activity through the real form and land on a live
// host page with a real socket. Reports the live commit rather than asserting
// one (hardcoded commits go stale). Runs against localhost too.
//
// It no longer measures an idle spin-down wake. The API moved off Render's Free
// instance type (DECISIONS.md → "The API runs on a paid Render instance"), so
// the server does not sleep after 15 idle minutes and there is no ~1-minute
// wake to observe or reassure anyone about. A deploy still boots a cold
// process, which is what this driver now covers, so it no longer has to be a
// session's first prod contact.
import { API, CLIENT as BASE, check, exitWith, launch, note } from "./lib.mjs";

const browser = await launch();
const page = await browser.newPage();

// Probe /healthz directly. This used to piggyback on the client's warm-up ping,
// which was deleted along with the spin-down it existed for.
const t0 = Date.now();
let healthzCommit = null;
let healthzMs = null;
try {
  const res = await fetch(`${API}/healthz`, {
    signal: AbortSignal.timeout(60000),
  });
  healthzMs = Date.now() - t0;
  const body = await res.json();
  healthzCommit = body.commit ?? null;
  check(res.ok, `/healthz answered in ${healthzMs}ms`);
} catch (err) {
  check(false, "/healthz answered", String(err));
}

let hostSocket = false;
page.on("websocket", (ws) => {
  if (ws.url().includes("/socket.io/")) hostSocket = true;
});

// A teacher at the start of class: straight into the create form and submit.
await page.goto(`${BASE}/activity/create`, { timeout: 60000 });
await page.getByPlaceholder("Caesar's ghost").fill("Herzl");
await page.getByPlaceholder("Brutus").fill("Ben-Gurion");
await page.locator("#setup-host-name").fill("Mr. First Contact");
const tCreate = Date.now();

// The observation races the navigation, never precedes it (trap paid for
// 2026-07-20).
const urlPromise = page
  .waitForURL(/\/activity\/host\/[A-Za-z0-9_-]{24}$/, { timeout: 60000 })
  .then(() => Date.now() - tCreate);

await page
  .getByRole("button", { name: /Host the Activity/ })
  .last()
  .click();
const createMs = await urlPromise;
check(true, `create through the real form landed in ${createMs}ms`);

// The live host page: real grid, no demo furniture, a real teacher socket.
await page.waitForSelector("text=Your activity is live", { timeout: 15000 });
await page.waitForSelector("text=Pair your students >> visible=true", {
  timeout: 10000,
});
await page.waitForSelector("text=Chats in progress >> visible=true", {
  timeout: 10000,
});
check(
  (await page.getByText(/This is the demo/).count()) === 0,
  "host page is the live page (real grid, no demo furniture)"
);

await page.waitForTimeout(1500);
check(hostSocket, "teacher host page opened a real websocket (/socket.io/)");

note(
  `deployed commit: ${healthzCommit ? healthzCommit.slice(0, 10) : "unknown"}`
);
await browser.close();
exitWith("coldwake");
