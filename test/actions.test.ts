import { fileURLToPath } from "node:url";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { openHydrated, startDevServer, type DevServer } from "./helpers";

const actions = fileURLToPath(new URL("fixtures/actions", import.meta.url));

let dev: DevServer;
let browser: Browser;

beforeAll(async () => {
  [dev, browser] = await Promise.all([startDevServer(actions), chromium.launch()]);
});

afterAll(async () => {
  await Promise.all([dev?.close(), browser?.close()]);
});

async function counts(page: Page): Promise<{ layout: number; page: number }> {
  const text = (await page.locator("#counts").textContent())!;
  const [, layout, pageCount] = /layout (\d+), page (\d+)/.exec(text)!;
  return { layout: Number(layout), page: Number(pageCount) };
}

describe.each([
  ["without JavaScript", false],
  ["with JavaScript", true],
] as const)("forms %s", (_name, javaScriptEnabled) => {
  let context: BrowserContext;

  beforeAll(async () => {
    context = await browser.newContext({ javaScriptEnabled });
  });

  afterAll(async () => {
    await context?.close();
  });

  /** Opens a page, waiting for hydration when JavaScript is on, and marks it to detect reloads. */
  async function open(path: string): Promise<Page> {
    if (!javaScriptEnabled) {
      const page = await context.newPage();
      await page.goto(`${dev.origin}${path}`);
      return page;
    }

    const { page } = await openHydrated(browser, `${dev.origin}${path}`);
    await page.evaluate(() => ((window as { graftMark?: boolean }).graftMark = true));
    return page;
  }

  async function expectNoReload(page: Page): Promise<void> {
    if (javaScriptEnabled) {
      expect(await page.evaluate(() => (window as { graftMark?: boolean }).graftMark)).toBe(true);
    }
  }

  it("runs the page's action from a form on the page, then shows fresh loader data", async () => {
    const page = await open("/dashboard");
    const before = await counts(page);

    await page.getByRole("button", { name: "page action" }).click();
    await expect.poll(() => page.locator("#page-result").textContent()).toBe("page: save");
    expect(await counts(page)).toEqual({ layout: before.layout, page: before.page + 1 });
    expect(new URL(page.url()).pathname).toBe("/dashboard");
    await expectNoReload(page);

    await page.close();
  });

  it("runs the layout's action from a form in the layout, even on a deeper page", async () => {
    const page = await open("/dashboard/settings/profile");
    const before = await counts(page);

    await page.getByRole("button", { name: "layout action" }).click();
    await expect
      .poll(() => page.locator("#layout-result").textContent())
      .toBe("layout: from the layout");
    expect(await counts(page)).toEqual({ layout: before.layout + 1, page: before.page });
    // With JavaScript the page stays put. Without it, the browser shows the
    // response to the layout's URL, like any form post.
    expect(new URL(page.url()).pathname).toBe(
      javaScriptEnabled ? "/dashboard/settings/profile" : "/dashboard",
    );
    await expectNoReload(page);

    await page.close();
  });

  it("keeps a layout's form and its page's form apart, though they share a URL", async () => {
    const page = await open("/dashboard");
    const before = await counts(page);

    await page.getByRole("button", { name: "layout action" }).click();
    await expect
      .poll(() => page.locator("#layout-result").textContent())
      .toBe("layout: from the layout");
    expect(await page.locator("#page-result").count()).toBe(0);
    expect(await counts(page)).toEqual({ layout: before.layout + 1, page: before.page });

    await page.close();
  });

  it("lands on the page named by an explicit action, which runs that page's action", async () => {
    const page = await open("/elsewhere");

    await page.getByRole("button", { name: "save on the dashboard" }).click();
    await expect
      .poll(() => page.locator("#page-result").textContent())
      .toBe("page: from elsewhere");

    expect(new URL(page.url()).pathname).toBe("/dashboard");
    // The result belongs to the dashboard page, not the layout that shares its URL.
    expect(await page.locator("#layout-result").count()).toBe(0);
    await expectNoReload(page);

    if (javaScriptEnabled) {
      // Like the browser without JavaScript, it's a new history entry.
      await page.goBack();
      await page.getByRole("heading", { name: "elsewhere" }).waitFor();
    }

    await page.close();
  });

  it("sends a plain <form method=post> with no marker to the page's action", async () => {
    const page = await open("/plain");

    await page.getByRole("button", { name: "plain form" }).click();
    await expect.poll(() => page.locator("#plain-result").textContent()).toBe("plain page");

    await page.close();
  });

  it("follows a redirect from an action", async () => {
    const page = await open("/redirecting");

    await page.getByRole("button", { name: "save and leave" }).click();
    await page.getByRole("heading", { name: "dashboard" }).waitFor();

    expect(new URL(page.url()).pathname).toBe("/dashboard");
    await expectNoReload(page);

    await page.close();
  });

  it("turns a GET form into a navigation with the fields in the URL", async () => {
    const page = await open("/search");

    await page.getByLabel("query").fill("graft forms");
    await page.getByRole("button", { name: "search" }).click();

    await expect.poll(() => page.locator("#query").textContent()).toBe("query: graft forms");
    expect(new URL(page.url()).search).toBe("?q=graft+forms");
    await expectNoReload(page);

    await page.close();
  });
});

describe("action requests", () => {
  const post = (path: string, headers: Record<string, string> = {}) =>
    fetch(`${dev.origin}${path}`, {
      method: "POST",
      body: new URLSearchParams({ x: "1" }),
      headers,
      redirect: "manual",
    });

  it("answers 405 when the targeted file has no action, without walking up", async () => {
    const response = await post("/no-action?_graft_action=no-action/page");
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
  });

  it("answers 400 for a marker naming a file that isn't part of the URL", async () => {
    expect((await post("/dashboard?_graft_action=plain/page")).status).toBe(400);
  });

  it("rejects submissions from other sites", async () => {
    expect((await post("/plain", { origin: "https://evil.example" })).status).toBe(403);
    expect((await post("/plain", { origin: "null" })).status).toBe(403);
    expect((await post("/plain", { referer: "https://evil.example/form" })).status).toBe(403);
  });

  it("accepts submissions from this site, including behind an HTTPS proxy", async () => {
    const host = new URL(dev.origin).host;

    expect((await post("/plain", { origin: dev.origin })).status).toBe(200);
    expect((await post("/plain", { origin: `https://${host}` })).status).toBe(200);
  });

  it("returns an action's result as data for the router", async () => {
    const response = await post("/plain?_graft_data=1", { origin: dev.origin });
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await response.text()).toContain("plain page");
  });

  it("shows a failing action in Vite's overlay, without leaving the page", async () => {
    const { page } = await openHydrated(browser, `${dev.origin}/failing`);

    await page.getByRole("button", { name: "fail" }).click();
    await page.locator("vite-error-overlay").waitFor({ state: "attached" });

    expect(
      await page
        .locator("vite-error-overlay")
        .evaluate((overlay) => overlay.shadowRoot?.textContent),
    ).toContain("action exploded");
    expect(new URL(page.url()).pathname).toBe("/failing");

    await page.close();
  });
});
