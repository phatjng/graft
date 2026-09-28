import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp, openHydrated, startDevServer } from "./helpers";

// An app with `graft({ adapter: vercel() })` and `base: "/app/"`.
const root = fileURLToPath(new URL("fixtures/vercel", import.meta.url));
const output = path.join(root, ".vercel/output");
const outDir = path.join(root, "node_modules/.cache/graft-vercel");

/**
 * Stands in for Vercel: follows config.json's routes, serving files from
 * static/ and sending the rest to the function, behind a proxy that
 * terminates HTTPS. Runs as its own process, from a copy of the output
 * outside the repo, so the function can't find any node_modules.
 */
const FAKE_VERCEL = `
import { readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const output = process.argv[2];
const read = (file) => JSON.parse(readFileSync(path.join(output, file), "utf8"));
const config = read("config.json");
const fn = read("functions/index.func/.vc-config.json");
const { default: handler } = await import(path.join(output, "functions/index.func", fn.handler));
const types = { ".js": "text/javascript", ".css": "text/css" };

const isFile = (file) => { try { return statSync(file).isFile(); } catch { return false; } };

createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  for (const route of config.routes) {
    if (route.handle === "filesystem") {
      const file = path.join(output, "static", decodeURIComponent(pathname));
      if (!isFile(file)) continue;
      res.setHeader("content-type", types[path.extname(file)] ?? "application/octet-stream");
      return res.end(readFileSync(file));
    }
    if (!new RegExp(route.src).test(pathname)) continue;
    for (const [name, value] of Object.entries(route.headers ?? {})) res.setHeader(name, value);
    if (route.continue) continue;
    if (route.dest === "/index") {
      req.headers["x-forwarded-proto"] = "https";
      return handler(req, res);
    }
  }
  res.statusCode = 404;
  res.end();
}).listen(0, function () {
  console.log("listening on " + this.address().port);
});
`;

function startFakeVercel(dir: string): Promise<{ origin: string; process: ChildProcess }> {
  const script = path.join(dir, "fake-vercel.mjs");
  writeFileSync(script, FAKE_VERCEL);

  const child = spawn(process.execPath, [script, path.join(dir, "output")], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let log = "";
  return new Promise((resolve, reject) => {
    const onData = (data: Buffer): void => {
      log += data;
      const match = /listening on (\d+)/.exec(log);
      if (match) resolve({ origin: `http://localhost:${match[1]}`, process: child });
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("exit", (code) => reject(new Error(`the fake Vercel exited with ${code}:\n${log}`)));
  });
}

/** Every file under `dir`, recursively. */
function files(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

describe("building for Vercel", () => {
  let isolated: string;
  let app: { origin: string; process: ChildProcess };
  let browser: Browser;

  beforeAll(async () => {
    rmSync(outDir, { recursive: true, force: true });
    await buildApp(root, outDir, { configFile: true });

    isolated = path.join(tmpdir(), `graft-vercel-${randomUUID()}`);
    cpSync(output, path.join(isolated, "output"), { recursive: true });

    [app, browser] = await Promise.all([startFakeVercel(isolated), chromium.launch()]);
  });

  afterAll(async () => {
    app?.process.kill();
    await browser?.close();

    for (const dir of [outDir, path.join(root, ".vercel"), isolated]) {
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes .vercel/output in the Build Output API format", () => {
    const config = JSON.parse(readFileSync(path.join(output, "config.json"), "utf8"));
    expect(config.version).toBe(3);

    const fn = path.join(output, "functions/index.func");
    expect(JSON.parse(readFileSync(path.join(fn, ".vc-config.json"), "utf8"))).toMatchObject({
      runtime: "nodejs24.x",
      handler: "vercel.js",
      launcherType: "Nodejs",
    });
    expect(JSON.parse(readFileSync(path.join(fn, "package.json"), "utf8"))).toEqual({
      type: "module",
    });

    // Static files sit under the base; the build manifest isn't among them.
    const assets = readdirSync(path.join(output, "static/app/assets"));
    expect(assets.some((file) => file.endsWith(".js"))).toBe(true);
    expect(assets.some((file) => file.endsWith(".css"))).toBe(true);
    expect(existsSync(path.join(output, "static/app/.vite"))).toBe(false);
  });

  it("keeps server code out of the static files", () => {
    for (const file of files(path.join(output, "static"))) {
      expect(readFileSync(file, "utf8"), file).not.toContain("vercel-fixture-secret");
    }
  });

  it("serves pages from the function, which sees the https URL", async () => {
    const response = await fetch(`${app.origin}/app/`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain(`<p id="url">https://localhost:`);

    expect((await fetch(`${app.origin}/app/about`)).status).toBe(200);
    expect((await fetch(`${app.origin}/app/nope`)).status).toBe(404);
    expect((await fetch(`${app.origin}/about`)).status).toBe(404);
  });

  it("serves hashed assets with a long-lived cache", async () => {
    const html = await (await fetch(`${app.origin}/app/`)).text();
    const script = /<script type="module" src="(\/app\/assets\/[^"]+)"/.exec(html)![1]!;

    const response = await fetch(`${app.origin}${script}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it("answers data requests and runs actions without JavaScript", async () => {
    const data = await fetch(`${app.origin}/app/about?_graft_data=1`);
    expect(data.status).toBe(200);

    const response = await fetch(`${app.origin}/app/`, {
      method: "POST",
      headers: { origin: app.origin },
      body: new URLSearchParams({ message: "hi" }),
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("you said <!-- -->hi");
  });

  it("hydrates, navigates and submits forms in the browser", async () => {
    const { page, errors } = await openHydrated(browser, `${app.origin}/app/`);

    await page.getByRole("button", { name: "Clicked 0 times" }).click();
    await page.getByRole("button", { name: "Clicked 1 times" }).waitFor();
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toBe("monospace");

    await page.getByLabel("message").fill("hello");
    await page.getByRole("button", { name: "say" }).click();
    await page.getByText("you said hello").waitFor();

    await page.getByRole("link", { name: "about" }).click();
    await page.getByRole("heading", { name: "about" }).waitFor();
    expect(page.url()).toBe(`${app.origin}/app/about`);

    expect(errors).toEqual([]);

    await page.close();
  });
});

describe("the Vercel adapter in dev", () => {
  it("leaves the dev server as it was", async () => {
    const dev = await startDevServer(root, { configFile: true });

    try {
      const response = await fetch(`${dev.origin}/app/`);

      expect(response.status).toBe(200);
      expect(await response.text()).toContain("<h1>home</h1>");
    } finally {
      await dev.close();
    }
  });
});
