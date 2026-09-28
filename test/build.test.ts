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

const root = fileURLToPath(new URL("../examples/basic", import.meta.url));

/** Removes the tags that legitimately differ between dev and a build: CSS links, preloads and scripts. */
function withoutAssetTags(html: string): string {
  return html.replace(/<link [^>]*\/>/g, "").replace(/<script [^>]*><\/script>/g, "");
}

describe("production build of examples/basic", () => {
  let outDir: string;
  let prod: StartedApp;
  let dev: DevServer;
  let browser: Browser;

  beforeAll(async () => {
    // Inside the app, like dist/ would be: the server bundle imports react and
    // react-dom at runtime, so it has to find the app's node_modules.
    outDir = path.join(root, "node_modules/.cache/graft-build");
    rmSync(outDir, { recursive: true, force: true });
    await buildApp(root, outDir, { configFile: true });

    [prod, dev, browser] = await Promise.all([
      graftStart(outDir),
      startDevServer(root, { configFile: true }),
      chromium.launch(),
    ]);
  });

  afterAll(async () => {
    prod?.process.kill();
    await Promise.all([dev?.close(), browser?.close()]);
    rmSync(outDir, { recursive: true, force: true });
  });

  it("writes the client and server builds", () => {
    expect(readdirSync(path.join(outDir, "server"))).toContain("index.js");
    expect(
      readdirSync(path.join(outDir, "client/assets")).some((file) => file.endsWith(".css")),
    ).toBe(true);
  });

  it.each(["/", "/blog/hello-world", "/nope"])(
    "serves the same page as dev for %s",
    async (pathname) => {
      const [fromDev, fromProd] = await Promise.all([
        fetch(`${dev.origin}${pathname}`),
        fetch(`${prod.origin}${pathname}`),
      ]);

      expect(fromProd.status).toBe(fromDev.status);
      expect(fromProd.headers.get("content-type")).toBe(fromDev.headers.get("content-type"));
      expect(withoutAssetTags(await fromProd.text())).toBe(withoutAssetTags(await fromDev.text()));
    },
  );

  it("links hashed CSS and preloads hashed modules", async () => {
    const html = await (await fetch(`${prod.origin}/`)).text();

    expect(html).toMatch(
      /<link rel="stylesheet" href="\/assets\/[\w-]+\.css" data-precedence="default"\/>/,
    );
    expect(html).toMatch(/<link rel="modulepreload" href="\/assets\/page-[\w-]+\.js"\/>/);
    expect(html).toMatch(/<script type="module" src="\/assets\/client-[\w-]+\.js"/);
    expect(html).not.toContain("/@vite/client");
  });

  it("serves assets with a long-lived cache, and not the build manifest", async () => {
    const html = await (await fetch(`${prod.origin}/`)).text();
    const css = /href="(\/assets\/[\w-]+\.css)"/.exec(html)![1]!;

    const response = await fetch(`${prod.origin}${css}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/css");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");

    expect((await fetch(`${prod.origin}/.vite/manifest.json`)).status).toBe(404);
  });

  it("hydrates in the browser", async () => {
    const { page, errors } = await openHydrated(browser, `${prod.origin}/`);
    await page.getByRole("button", { name: "Clicked 0 times" }).click();
    await page.getByRole("button", { name: "Clicked 1 times" }).waitFor();

    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toBe(
      "system-ui, sans-serif",
    );
    expect(errors).toEqual([]);

    await page.close();
  });

  it("keeps Graft's server runtime portable: no node:* imports in the server bundle", () => {
    const bundle = readFileSync(path.join(outDir, "server/index.js"), "utf8");

    expect(bundle).toContain("renderToReadableStream");
    expect(bundle).not.toMatch(/from ["']node:/);
  });

  it("keeps server rendering out of the client bundle", () => {
    const assets = path.join(outDir, "client/assets");
    for (const file of readdirSync(assets).filter((file) => file.endsWith(".js"))) {
      const code = readFileSync(path.join(assets, file), "utf8");
      expect(code, file).not.toContain("renderToReadableStream");
    }
  });
});
