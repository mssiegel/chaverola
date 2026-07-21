// The verification-stack launcher: client on 5199 (strict), server on 3001
// with CHAVEROLA_TIME_SCALE from --scale (default 10; use --scale 1 when a
// run needs real timings). Prints one READY line when both answer; tears
// both down on exit. Agents run this in the background.
//
// If something already holds 3001 it is identified via /healthz (pid,
// timeScale, commit) instead of the old Get-NetTCPConnection ritual — and
// unless its scale matches the request, we refuse and print the exact kill
// line rather than auto-killing someone else's server.
import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const WEB = "http://localhost:5199";
const API = "http://localhost:3001";
const isWin = process.platform === "win32";

async function probe(url, ms = 1500) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

const children = [];
let shuttingDown = false;
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    if (c.exitCode !== null) continue;
    if (isWin) {
      // c.pid is the cmd shim; /T takes the whole vite/tsx tree with it.
      try {
        execSync(`taskkill /PID ${c.pid} /T /F`, { stdio: "ignore" });
      } catch {
        /* already gone */
      }
    } else {
      c.kill("SIGTERM");
    }
  }
  process.exit(exitCode);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function run(tag, args, extraEnv = {}) {
  // On Windows pnpm is a .cmd shim, which Node refuses to spawn directly —
  // it needs a shell, and a shell wants one pre-joined command string
  // (DEP0190). None of our args carry spaces, so joining is safe.
  const child = spawn(
    isWin ? ["pnpm", ...args].join(" ") : "pnpm",
    isWin ? [] : args,
    {
      cwd: repoRoot,
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
      shell: isWin,
    }
  );
  const relay = (stream) =>
    stream.on("data", (buf) => {
      for (const line of buf.toString().split(/\r?\n/))
        if (line.trim()) console.log(`[${tag}] ${line}`);
    });
  relay(child.stdout);
  relay(child.stderr);
  child.on("exit", (code) => {
    if (!shuttingDown) {
      console.error(`[${tag}] exited early (code ${code}) — tearing down`);
      shutdown(1);
    }
  });
  children.push(child);
  return child;
}

// Exit paths that spawned nothing set process.exitCode and return instead
// of calling process.exit() — hard-exiting right after fetch trips a libuv
// assert on Windows (UV_HANDLE_CLOSING in async.c).
async function main() {
  const argv = process.argv.slice(2);
  let scale = 10;
  const scaleIdx = argv.indexOf("--scale");
  if (scaleIdx !== -1) {
    scale = Number(argv[scaleIdx + 1]);
    if (!Number.isFinite(scale) || scale < 1 || scale > 100) {
      console.error(
        `bad --scale ${argv[scaleIdx + 1]} (want a number in [1, 100])`
      );
      process.exitCode = 1;
      return;
    }
  }

  // --- who's already up? -----------------------------------------------
  let needServer = true;
  const health = await probe(`${API}/healthz`);
  if (health) {
    const body = await health.json().catch(() => ({}));
    const runningScale = body.timeScale ?? 1;
    console.log(
      `3001 already answers: pid=${body.pid} timeScale=${runningScale}` +
        (body.commit ? ` commit=${String(body.commit).slice(0, 10)}` : "")
    );
    if (runningScale !== scale) {
      console.error(
        `refusing: that server runs at scale ${runningScale}, this run wants ${scale}.`
      );
      console.error(`kill it first:  taskkill /PID ${body.pid} /F`);
      process.exitCode = 1;
      return;
    }
    console.log("scale matches — reusing the running server.");
    needServer = false;
  }
  const needClient = !(await probe(`${WEB}/`));
  if (!needClient)
    console.log("5199 already answers — reusing the running client.");

  // --- spawn what's missing --------------------------------------------
  if (needClient)
    run("web", [
      "--filter",
      "@chaverola/client",
      "exec",
      "vite",
      "--port",
      "5199",
      "--strictPort",
    ]);
  if (needServer)
    run(
      "api",
      [
        "--filter",
        "@chaverola/server",
        "exec",
        "tsx",
        "watch",
        "--clear-screen=false",
        "src/index.ts",
      ],
      { CHAVEROLA_TIME_SCALE: String(scale) }
    );

  // --- wait for both, then announce ------------------------------------
  const deadline = Date.now() + 90_000;
  for (;;) {
    const [web, api] = await Promise.all([
      probe(`${WEB}/`),
      probe(`${API}/healthz`),
    ]);
    if (web && api) {
      const body = await api.json().catch(() => ({}));
      const running = body.timeScale ?? 1;
      if (running !== scale) {
        console.error(
          `server came up at scale ${running}, wanted ${scale} — check CHAVEROLA_TIME_SCALE handling`
        );
        shutdown(1);
      }
      console.log(`READY web=${WEB} api=${API} scale=${scale} pid=${body.pid}`);
      break;
    }
    if (Date.now() > deadline) {
      console.error(
        `stack never came up (web=${!!web} api=${!!api} after 90s) — tearing down`
      );
      shutdown(1);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  if (children.length === 0)
    console.log("nothing was spawned (full stack already running) — exiting.");
  // Otherwise the spawned children keep the event loop alive until killed.
}

await main();
