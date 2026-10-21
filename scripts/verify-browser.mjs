import { spawn } from "node:child_process";

// Run the production build on a separate port, then stop only this test server.
const port = process.env.PIP_TEST_PORT || "3100";
const url = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", port],
  { stdio: "pipe", windowsHide: true },
);
let serverLog = "";
server.stdout.on("data", (data) => {
  serverLog += data.toString();
});
server.stderr.on("data", (data) => {
  serverLog += data.toString();
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null)
      throw new Error(`Test server exited: ${serverLog}`);
    try {
      ready = (
        await fetch(`${url}/assistant`, { signal: AbortSignal.timeout(1_000) })
      ).ok;
    } catch {
      /* Server is still starting. */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error(`Test server did not become ready: ${serverLog}`);
  const test = spawn(process.execPath, ["tests/browser-smoke.mjs"], {
    env: { ...process.env, PIP_TEST_URL: url },
    stdio: "inherit",
    windowsHide: true,
  });
  const status = await new Promise((resolve, reject) => {
    test.on("exit", resolve);
    test.on("error", reject);
  });
  if (status !== 0) process.exitCode = 1;
} finally {
  server.kill();
}
