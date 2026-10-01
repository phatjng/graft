import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { graft, type GraftOptions } from "@phatjng/graft/vite";
import type { Browser, Page } from "playwright";
import { createBuilder, createServer, type ViteDevServer } from "vite";

export interface DevServer {
  server: ViteDevServer;
  /** The server's origin, e.g. `http://localhost:5174`. */
  origin: string;
  close(): Promise<void>;
}

/**
 * Starts a Vite dev server for `root` on a free port. Uses the app's own
 * vite.config.ts when `configFile` is set, otherwise just `graft(graftOptions)`.
 */
export async function startDevServer(
  root: string,
  {
    configFile = false,
    graftOptions = {},
  }: { configFile?: boolean; graftOptions?: GraftOptions } = {},
): Promise<DevServer> {
  // Test files run in parallel, often on the same app. Sharing Vite's
  // dependency cache would let one server's re-optimization break another's
  // page loads ("504 Outdated Optimize Dep"), so each server gets its own.
  const cacheDir = path.join(root, "node_modules/.cache", `vite-${randomUUID()}`);

  const server = await createServer({
    root,
    ...(configFile
      ? { configFile: `${root}/vite.config.ts` }
      : { configFile: false, plugins: [graft(graftOptions)] }),
    cacheDir,
    logLevel: "silent",
    server: { port: 0 },
  });

  await server.listen();
  const origin = new URL(server.resolvedUrls!.local[0]!).origin;

  return {
    server,
    origin,
    async close() {
      await server.close();
      rmSync(cacheDir, { recursive: true, force: true });
    },
  };
}

const cli = fileURLToPath(new URL("../packages/graft/dist/cli.js", import.meta.url));

/** Builds the app at `root` into `outDir` with `vite build`, like a user would. */
export async function buildApp(
  root: string,
  outDir: string,
  { configFile = false } = {},
): Promise<void> {
  const builder = await createBuilder({
    root,
    ...(configFile
      ? { configFile: `${root}/vite.config.ts` }
      : { configFile: false, plugins: [graft()] }),
    logLevel: "silent",
    build: { outDir },
  });
  await builder.buildApp();
}

export interface StartedApp {
  origin: string;
  process: ChildProcess;
  /** Everything the server has printed so far. */
  output(): string;
}

/** Runs `graft start <dir> --port 0` and resolves once it's listening. */
export function graftStart(dir: string): Promise<StartedApp> {
  const child = spawn(process.execPath, [cli, "start", dir, "--port", "0"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";

  return new Promise((resolve, reject) => {
    const onData = (data: Buffer): void => {
      output += data;
      const match = /running at \S*(http:\/\/localhost:\d+)/.exec(
        output.replace(/\x1b\[\d+m/g, ""),
      );

      if (match) resolve({ origin: match[1]!, process: child, output: () => output });
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);

    child.once("exit", (code) => reject(new Error(`graft start exited with ${code}:\n${output}`)));
  });
}

/**
 * Opens `url` in a new page and waits until React has started hydrating it.
 * Clicking the server-rendered HTML before then does nothing: its event
 * handlers aren't attached yet. After it, React replays early clicks.
 */
export async function openHydrated(
  browser: Browser,
  url: string,
): Promise<{ page: Page; errors: string[] }> {
  const page = await browser.newPage();
  const errors: string[] = [];

  // Console errors are where hydration mismatches show up.
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  page.on("pageerror", (error) => errors.push(error.message));

  const failedRequests: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(url);

  try {
    await waitForHydration(page);
  } catch (error) {
    throw new Error(
      `${url} never started hydrating.\nErrors: ${JSON.stringify(errors)}\nFailed requests: ${JSON.stringify(failedRequests)}`,
      { cause: error },
    );
  }

  return { page, errors };
}

export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Object.keys(document).some((key) => key.startsWith("__reactContainer$")),
    null,
    {
      timeout: 10_000,
    },
  );
}
