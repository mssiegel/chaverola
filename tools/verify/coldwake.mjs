// Cold-start wake UX, run as a prod session's FIRST contact
// (`node tools/verify/coldwake.mjs --prod`). Opportunistic: if the server is
// warm we say so and move on; we never manufacture a spin-down. It reports
// the live commit rather than asserting one (hardcoded commits go stale).
// Runs against localhost too, where it only ever proves the warm path.
import { API, CLIENT as BASE, launch } from "./lib.mjs";

const browser = await launch();
const page = await browser.newPage();

const t0 = Date.now();
let healthzMs = null;
let healthzCommit = null;
page.on("response", async (r) => {
  if (r.url().includes(API) && r.url().includes("/healthz") && r.ok()) {
    if (healthzMs === null) {
      healthzMs = Date.now() - t0;
      try {
        healthzCommit = (await r.json()).commit;
      } catch {
        /* body may be gone on late reads */
      }
    }
  }
});

let hostSocket = false;
page.on("websocket", (ws) => {
  if (ws.url().includes("/socket.io/")) hostSocket = true;
});

// 1. Homepage fires the warm-up ping at a (maybe) spun-down instance.
await page.goto(BASE, { timeout: 60000 });

// 2. Straight into the create form like a teacher at the start of class, and
//    submit while the server is still waking.
await page.goto(`${BASE}/activity/create`);
await page.getByPlaceholder("Caesar's ghost").fill("Herzl");
await page.getByPlaceholder("Brutus").fill("Ben-Gurion");
await page.locator("#setup-host-name").fill("Mr. Cold Start");
const tCreate = Date.now();

// Both observations race the navigation, never precede it (trap paid for
// 2026-07-20).
const urlPromise = page
  .waitForURL(/\/activity\/host\/[A-Za-z0-9_-]{24}$/, { timeout: 150000 })
  .then(() => Date.now() - tCreate);

let pendingAt = null;
let patienceAt = null;
page
  .waitForSelector("text=Setting up your activity", { timeout: 150000 })
  .then(() => (pendingAt = Date.now() - tCreate))
  .catch(() => {});
page
  .waitForSelector("text=Chaverola is just waking up", { timeout: 150000 })
  .then(() => (patienceAt = Date.now() - tCreate))
  .catch(() => {});

await page
  .getByRole("button", { name: /Host the Activity/ })
  .last()
  .click();
const createMs = await urlPromise;

const sawPending = pendingAt !== null;
const sawPatience = patienceAt !== null;
console.log(
  sawPending
    ? `PASS pending button 'Setting up your activity…' at +${pendingAt}ms`
    : "NOTE pending button never observed (create resolved inside one frame)"
);
console.log(
  sawPatience
    ? `PASS patience copy appeared at +${patienceAt}ms into the create`
    : "NOTE patience copy never showed (create beat the 5s hint — server warm)"
);
console.log(
  `PASS cold create landed on ${new URL(page.url()).pathname} in ${createMs}ms`
);

// 3. The live host page: real grid, no demo furniture, a real teacher socket.
await page.waitForSelector("text=Your activity is live", { timeout: 15000 });
await page.waitForSelector("text=Pair your students >> visible=true", {
  timeout: 10000,
});
await page.waitForSelector("text=Chats in progress >> visible=true", {
  timeout: 10000,
});
if ((await page.getByText(/This is the demo/).count()) > 0)
  throw new Error("demo banner on a real activity");
console.log("PASS host page is the live page (real grid, no demo)");

await page.waitForTimeout(1500);
console.log(
  hostSocket
    ? "PASS teacher host page opened a real websocket (/socket.io/)"
    : "FAIL teacher host page never opened a /socket.io/ websocket"
);

const warm = createMs < 5000 && !sawPatience;
console.log(
  `\nwake summary: ${
    warm
      ? "server was ALREADY WARM this session — cold-start UX path not exercised (opportunistic, acceptable)"
      : `server was COLD — create took ${createMs}ms, pending=${sawPending}, patience=${sawPatience}`
  }`
);
console.log(
  `deployed commit: ${healthzCommit ? healthzCommit.slice(0, 10) : "not resolved before create finished"}` +
    `${healthzMs === null ? "" : ` (healthz in ${healthzMs}ms)`}`
);
await browser.close();
