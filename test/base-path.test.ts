import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Browser, type Page } from "playwright";
import { createLogger, preview } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp, graftStart, openHydrated, startDevServer } from "./helpers";

// An app built with `base: "/app/"`: its assets and its pages live under /app/.
const root = fileURLToPath(new URL("fixtures/base", import.meta.url));
const outDir = path.join(root, "node_modules/.cache/graft-base-path");

let browser: Browser;
let built: Promise<void>;

beforeAll(async () => {
  rmSync(outDir, { recursive: true, force: true });
  built = buildApp(root, outDir, { configFile: true });
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  rmSync(outDir, { recursive: true, force: true });
});

async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => ((window as { graftMark?: boolean }).graftMark = true));
}

async function isSamePage(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as { graftMark?: boolean }).graftMark === true);
}

describe.each([
  ["dev", async () => startDevServer(root, { configFile: true })],
  [
    "a production build",
    async () => {
      await built;
      const app = await graftStart(outDir);
      return { origin: app.origin, close: async () => void app.process.kill() };
    },
  ],
] as const)("an app under a base path, in %s", (_name, start) => {
  let app: { origin: string; close(): Promise<void> };

  beforeAll(async () => {
    app = await start();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("serves pages under the base, with links and forms that include it", async () => {
    const home = await fetch(`${app.origin}/app/`);
    expect(home.status).toBe(200);

    const html = await home.text();
    expect(html).toContain('<a href="/app/about">about</a>');
    expect(html).toMatch(/<script type="module" src="\/app\//);

    const about = await (await fetch(`${app.origin}/app/about`)).text();
    // Loaders see the URL the browser asked for.
    expect(about).toContain("loader saw <!-- -->/app/about");
    // usePathname() leaves the base out, like the paths <Link> takes.
    expect(about).toContain('<p id="pathname">/about</p>');
    expect(about).toContain('action="/app/about?_graft_action=about%2Fpage"');
  });

  it("doesn't serve pages outside the base", async () => {
    expect((await fetch(`${app.origin}/about`)).status).toBe(404);
  });

  it("serves the page's CSS and scripts under the base", async () => {
    const html = await (await fetch(`${app.origin}/app/`)).text();
    const urls = [...html.matchAll(/(?:href|src)="(\/app\/[^"]+\.(?:css|js|tsx|ts))"/g)].map(
      (match) => match[1]!,
    );

    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect((await fetch(`${app.origin}${url}`)).status, url).toBe(200);
  });

  it("adds the base to redirects from loaders and actions", async () => {
    const fromLoader = await fetch(`${app.origin}/app/private`, { redirect: "manual" });
    expect(fromLoader.status).toBe(302);
    expect(fromLoader.headers.get("location")).toBe("/app/about");

    const fromAction = await fetch(`${app.origin}/app/about`, {
      method: "POST",
      body: new URLSearchParams({ intent: "leave" }),
      redirect: "manual",
    });

    expect(fromAction.headers.get("location")).toBe("/app/");
  });

  it("hydrates and navigates without reloading", async () => {
    const { page, errors } = await openHydrated(browser, `${app.origin}/app/`);
    await page.getByRole("button", { name: "Clicked 0 times" }).click();
    await page.getByRole("button", { name: "Clicked 1 times" }).waitFor();

    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toBe("monospace");

    await markPage(page);

    await page.getByRole("link", { name: "about" }).click();
    await page.getByText("loader saw /app/about").waitFor();
    expect(page.url()).toBe(`${app.origin}/app/about`);
    expect(await page.locator("#pathname").textContent()).toBe("/about");

    // The loader redirects to "/about", which is /app/about.
    await page.getByRole("link", { name: "home" }).click();
    await page.getByRole("heading", { name: "home" }).waitFor();

    await page.getByRole("link", { name: "private" }).click();
    await page.getByText("loader saw /app/about").waitFor();
    expect(page.url()).toBe(`${app.origin}/app/about`);

    expect(await isSamePage(page)).toBe(true);
    expect(errors).toEqual([]);
    await page.close();
  });

  it("submits forms to the action under the base", async () => {
    const { page, errors } = await openHydrated(browser, `${app.origin}/app/about`);
    await markPage(page);

    await page.getByLabel("message").fill("hi");
    await page.getByRole("button", { name: "say" }).click();
    await page.getByText("you said hi").waitFor();

    expect(page.url()).toBe(`${app.origin}/app/about`);

    await page.getByRole("button", { name: "leave" }).click();
    await page.getByRole("heading", { name: "home" }).waitFor();

    expect(page.url()).toBe(`${app.origin}/app/`);

    expect(await isSamePage(page)).toBe(true);
    expect(errors).toEqual([]);

    await page.close();
  });
});

describe("vite preview", () => {
  it("explains that Graft apps are previewed with graft start", async () => {
    await built;

    const warnings: string[] = [];
    const logger = createLogger("silent");
    logger.warn = (message) => void warnings.push(message);

    const server = await preview({
      root,
      configFile: `${root}/vite.config.ts`,
      build: { outDir },
      customLogger: logger,
      preview: { port: 0 },
    });

    try {
      expect(warnings.join("\n")).toContain("graft start");

      const response = await fetch(`${server.resolvedUrls!.local[0]!}about`);
      expect(response.status).toBe(501);
      expect(await response.text()).toContain("graft start");
    } finally {
      await server.close();
    }
  });
});
