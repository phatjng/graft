import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Browser, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  buildApp,
  graftStart,
  openHydrated,
  startDevServer,
  type DevServer,
  type StartedApp,
} from "./helpers";

const basic = fileURLToPath(new URL("../examples/basic", import.meta.url));
const navigation = fileURLToPath(new URL("fixtures/navigation", import.meta.url));

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
});

/** Marks the current page. The mark only survives if nothing reloads the page. */
async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => ((window as { graftMark?: boolean }).graftMark = true));
}

async function isSamePage(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as { graftMark?: boolean }).graftMark === true);
}

/** Records the page's requests for documents and for data. */
function recordRequests(page: Page): { documents: string[]; data: string[] } {
  const requests = { documents: [] as string[], data: [] as string[] };
  page.on("request", (request) => {
    if (request.resourceType() === "document") requests.documents.push(request.url());
    if (request.url().includes("_graft_data")) requests.data.push(request.url());
  });

  return requests;
}

describe.each([
  ["dev", async () => startDevServer(basic, { configFile: true })],
  [
    "a production build",
    async () => {
      const outDir = path.join(basic, "node_modules/.cache/graft-navigation");
      rmSync(outDir, { recursive: true, force: true });
      await buildApp(basic, outDir, { configFile: true });

      const app = await graftStart(outDir);
      return { origin: app.origin, close: async () => void app.process.kill() };
    },
  ],
] as const)("navigating examples/basic in %s", (_name, start) => {
  let app: { origin: string; close(): Promise<void> };

  beforeAll(async () => {
    app = await start();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("navigates between posts without reloading the page", async () => {
    const { page, errors } = await openHydrated(browser, `${app.origin}/`);
    const requests = recordRequests(page);
    await markPage(page);

    await page.getByRole("link", { name: "Dates stay dates" }).click();
    await page.getByRole("heading", { name: "Dates stay dates" }).waitFor();
    expect(page.url()).toBe(`${app.origin}/blog/dates-stay-dates`);
    expect(await page.title()).toBe("Dates stay dates · Graft");
    // The loader's Date made it through the data request too.
    expect(await page.locator("time").textContent()).toBe("September 20, 2026");

    await page.getByRole("link", { name: "Back home" }).click();
    await page.getByRole("heading", { name: "Graft" }).waitFor();
    await page.getByRole("link", { name: "Hello, world" }).click();
    await page.getByRole("heading", { name: "Hello, world" }).waitFor();

    expect(await isSamePage(page)).toBe(true);
    expect(requests.documents).toEqual([]);
    expect(requests.data).toHaveLength(3);
    expect(errors).toEqual([]);

    await page.close();
  });

  it("follows a loader redirect on the first load", async () => {
    const response = await fetch(`${app.origin}/blog/first-post`, { redirect: "manual" });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("/blog/hello-world");
  });

  it("follows a loader redirect during client navigation", async () => {
    const { page } = await openHydrated(browser, `${app.origin}/`);
    await markPage(page);

    await page.getByRole("link", { name: "An old link" }).click();
    await page.getByRole("heading", { name: "Hello, world" }).waitFor();
    expect(page.url()).toBe(`${app.origin}/blog/hello-world`);
    expect(await isSamePage(page)).toBe(true);

    // The redirect didn't leave /blog/first-post in history: Back goes home.
    await page.goBack();
    await page.getByRole("heading", { name: "Graft" }).waitFor();
    expect(await isSamePage(page)).toBe(true);

    await page.close();
  });

  it("supports Back and Forward without reloading", async () => {
    const { page } = await openHydrated(browser, `${app.origin}/`);
    await markPage(page);

    await page.getByRole("link", { name: "Hello, world" }).click();
    await page.getByRole("heading", { name: "Hello, world" }).waitFor();

    await page.goBack();
    await page.getByRole("heading", { name: "Graft" }).waitFor();
    await page.goForward();
    await page.getByRole("heading", { name: "Hello, world" }).waitFor();

    expect(await isSamePage(page)).toBe(true);
    await page.close();
  });
});

describe("navigation edge cases", () => {
  let dev: DevServer;

  beforeAll(async () => {
    dev = await startDevServer(navigation);
  });

  afterAll(async () => {
    await dev?.close();
  });

  it("answers data requests with loader data, and loaders never see the marker", async () => {
    const response = await fetch(`${dev.origin}/about?from=test&_graft_data=1`);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");

    const text = await response.text();
    expect(text).toContain(`${dev.origin}/about?from=test`);
    expect(text).not.toContain("_graft_data");
  });

  it("answers a data request for a redirect with the location, not a real redirect", async () => {
    const response = await fetch(`${dev.origin}/redirect?_graft_data=1`, { redirect: "manual" });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("/about?from=redirect");
  });

  it("falls back to a full page load for a URL with no route", async () => {
    const { page } = await openHydrated(browser, `${dev.origin}/`);
    await markPage(page);

    await page.getByRole("link", { name: "missing" }).click();
    await page.getByText("404: This page could not be found.").waitFor();

    expect(await isSamePage(page)).toBe(false);

    await page.close();
  });

  it("falls back to a full page load when the data request fails", async () => {
    const { page } = await openHydrated(browser, `${dev.origin}/`);
    const requests = recordRequests(page);
    await markPage(page);

    await page.getByRole("link", { name: "broken" }).click();
    await page.waitForURL(`${dev.origin}/broken`);

    await expect.poll(() => requests.documents).toEqual([`${dev.origin}/broken`]);
    expect(requests.data).toHaveLength(1);

    await page.close();
  });

  it("restores the scroll position on Back, and starts new pages at the top", async () => {
    const { page } = await openHydrated(browser, `${dev.origin}/long`);
    await page.getByRole("link", { name: "about, from the bottom" }).scrollIntoViewIfNeeded();
    const scrolled = await page.evaluate(() => window.scrollY);
    expect(scrolled).toBeGreaterThan(1000);

    await page.getByRole("link", { name: "about, from the bottom" }).click();
    await page.getByRole("heading", { name: "about" }).waitFor();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await page.goBack();
    await page.getByRole("heading", { name: "long" }).waitFor();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrolled);

    await page.close();
  });

  it("lets the browser restore the scroll position on a reload, before hydration", async () => {
    const { page } = await openHydrated(browser, `${dev.origin}/long`);
    await page.getByRole("link", { name: "about, from the bottom" }).scrollIntoViewIfNeeded();
    const scrolled = await page.evaluate(() => window.scrollY);
    expect(scrolled).toBeGreaterThan(1000);

    // Graft restoring the position itself would only happen after hydration,
    // with the top of the page painted first.
    await page.addInitScript(() => {
      (window as { restoration?: string }).restoration = window.history.scrollRestoration;
    });
    await page.reload();

    expect(await page.evaluate(() => (window as { restoration?: string }).restoration)).toBe(
      "auto",
    );
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrolled);

    await page.close();
  });

  it("leaves links to a spot on the same page to the browser", async () => {
    const { page } = await openHydrated(browser, `${dev.origin}/long`);
    const requests = recordRequests(page);

    await page.getByRole("link", { name: "to the bottom" }).click();
    await page.waitForURL(`${dev.origin}/long#bottom`);

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
    expect(requests.data).toEqual([]);

    await page.close();
  });

  it("gives usePathname() the path, on the server and after navigating", async () => {
    const html = await (await fetch(`${dev.origin}/about?from=test`)).text();
    expect(html).toContain('<p id="pathname">/about</p>');

    const { page, errors } = await openHydrated(browser, `${dev.origin}/`);
    const pathname = page.locator("#pathname");
    expect(await pathname.textContent()).toBe("/");

    await page.getByRole("link", { name: "about" }).click();
    await page.getByRole("heading", { name: "about" }).waitFor();
    expect(await pathname.textContent()).toBe("/about");

    await page.goBack();
    await expect.poll(() => pathname.textContent()).toBe("/");
    expect(errors).toEqual([]);

    await page.close();
  });

  it("starts loading a page's code when its link is hovered", async () => {
    const { page } = await openHydrated(browser, `${dev.origin}/`);
    const modules: string[] = [];
    page.on("request", (request) => modules.push(new URL(request.url()).pathname));

    await page.getByRole("link", { name: "about" }).hover();
    await expect.poll(() => modules).toContain("/app/about/page.tsx");

    await page.close();
  });
});
