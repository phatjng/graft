import { readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  buildApp,
  graftStart,
  openHydrated,
  startDevServer,
  type DevServer,
  type StartedApp,
} from "./helpers";

const fixture = (name: string): string =>
  fileURLToPath(new URL(`fixtures/${name}`, import.meta.url));
const loaders = fixture("loaders");

describe("loaders in dev", () => {
  let dev: DevServer;
  let browser: Browser;

  beforeAll(async () => {
    [dev, browser] = await Promise.all([startDevServer(loaders), chromium.launch()]);
  });

  afterAll(async () => {
    await Promise.all([dev?.close(), browser?.close()]);
  });

  it("renders loader data from the page and every layout", async () => {
    const html = await (await fetch(`${dev.origin}/`)).text();

    expect(html).toContain(`<body data-site="fixture">`);
    expect(html).toContain(`<p id="date">2026-01-02T03:04:05.000Z</p>`);
    expect(html).toContain(`<p id="map">42</p>`);
    expect(html).toContain(`<p id="big">12345678901234567891</p>`);
  });

  it("escapes loader data so it can't break out of its script tag", async () => {
    const html = await (await fetch(`${dev.origin}/`)).text();
    const script = /<script[^>]*>self\.__graftData=(.*?)<\/script>/s.exec(html)![1]!;

    expect(script).not.toContain("<");
    // The rendered text is escaped by React as usual.
    expect(html).not.toContain("<script>window.pwned");
  });

  it("delivers the same data to the browser, types and all, without running injected code", async () => {
    const { page, errors } = await openHydrated(browser, `${dev.origin}/`);

    await page.getByRole("button", { name: "not yet" }).click();
    await page.getByRole("button", { name: "hydrated" }).waitFor();

    // Hydration succeeded, so the browser rendered the same text as the server:
    // the Date, Map, Set, BigInt and undefined all survived the trip.
    expect(await page.locator("#xss").textContent()).toBe(
      "</script><script>window.pwned = true</script><!--",
    );
    expect(await page.locator("#set").textContent()).toBe("a,b");
    expect(await page.locator("#missing").textContent()).toBe("undefined");
    expect(await page.evaluate(() => (window as { pwned?: boolean }).pwned)).toBeUndefined();
    expect(errors).toEqual([]);

    await page.close();
  });

  it("follows a thrown or returned redirect", async () => {
    const thrown = await fetch(`${dev.origin}/redirect-thrown`, { redirect: "manual" });

    expect(thrown.status).toBe(302);
    expect(thrown.headers.get("location")).toBe("/");

    const returned = await fetch(`${dev.origin}/redirect-returned`, { redirect: "manual" });

    expect(returned.status).toBe(303);
    expect(returned.headers.get("location")).toBe("/");
  });

  it("lets a layout's redirect win over the page's error", async () => {
    const response = await fetch(`${dev.origin}/guarded/inner`, { redirect: "manual" });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  it("runs the layout's and the page's loaders in parallel", async () => {
    // The layout's loader waits for the page's to start, so running them one
    // after the other would never finish.
    const html = await (
      await fetch(`${dev.origin}/parallel`, { signal: AbortSignal.timeout(5000) })
    ).text();

    expect(html).toContain("layout: <!-- -->done");
    expect(html).toContain("page: <!-- -->done");
  });

  it("passes undefined to files without a loader", async () => {
    expect(await (await fetch(`${dev.origin}/no-loader`)).text()).toContain("<p>undefined</p>");
  });

  it("shows loader errors in Vite's error page in dev", async () => {
    const response = await fetch(`${dev.origin}/broken`);

    expect(response.status).toBe(500);
    expect(await response.text()).toContain("loader exploded");
  });

  it("explains data that can't be sent to the browser", async () => {
    const response = await fetch(`${dev.origin}/unserializable`);
    expect(response.status).toBe(500);

    const text = await response.text();
    expect(text).toContain("Loader or action data can't be sent to the browser");
    expect(text).toContain("callback");
  });

  it("serves route files to the browser without loaders or server-only imports", async () => {
    const code = await (await fetch(`${dev.origin}/app/page.tsx`)).text();

    expect(code).not.toContain("secret.server");
    expect(code).not.toContain("LOADER_ONLY_c91e");
    expect(code).not.toMatch(/function loader/);
  });
});

describe("loaders in a production build", () => {
  const outDir = path.join(loaders, "node_modules/.cache/graft-loaders");
  let prod: StartedApp;

  beforeAll(async () => {
    rmSync(outDir, { recursive: true, force: true });
    await buildApp(loaders, outDir);
    prod = await graftStart(outDir);
  });

  afterAll(() => {
    prod?.process.kill();
  });

  it("keeps loader code and server-only modules out of the client bundle", () => {
    const assets = path.join(outDir, "client/assets");
    const files = readdirSync(assets);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const code = readFileSync(path.join(assets, file), "utf8");
      expect(code, file).not.toContain("SERVER_SECRET_7f3a");
      expect(code, file).not.toContain("LOADER_ONLY_c91e");
      expect(code, file).not.toContain("ACTION_ONLY_5d2b");
      expect(code, file).not.toContain("loader exploded");
    }

    // They're in the server bundle, where they belong.
    const server = readdirSync(path.join(outDir, "server"), { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".js"))
      .map((file) => readFileSync(path.join(outDir, "server", file), "utf8"))
      .join("\n");

    expect(server).toContain("SERVER_SECRET_7f3a");
    expect(server).toContain("LOADER_ONLY_c91e");
    expect(server).toContain("ACTION_ONLY_5d2b");
  });

  it("renders loader data", async () => {
    const html = await (await fetch(`${prod.origin}/`)).text();

    expect(html).toContain(`<p id="date">2026-01-02T03:04:05.000Z</p>`);
  });

  it("serves the plain 500 page for loader errors, and logs them", async () => {
    const response = await fetch(`${prod.origin}/broken`);
    expect(response.status).toBe(500);

    const html = await response.text();
    expect(html).toContain("500: Something went wrong.");
    expect(html).not.toContain("loader exploded");

    await expect.poll(() => prod.output()).toContain("loader exploded");
  });
});

describe("server-only modules", () => {
  it("fails the build when browser code imports a .server file", async () => {
    const root = fixture("server-only-leak");
    const outDir = path.join(root, "node_modules/.cache/graft-leak");

    await expect(buildApp(root, outDir)).rejects.toThrow(
      "app/page.tsx imports app/secret.server.ts, which is server-only, into code that runs in the browser",
    );

    rmSync(outDir, { recursive: true, force: true });
  });
});
