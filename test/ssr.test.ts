import { fileURLToPath } from "node:url";

import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { openHydrated, startDevServer, type DevServer } from "./helpers";

const fixture = (name: string): string => fileURLToPath(new URL(name, import.meta.url));

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
});

describe("examples/basic in dev", () => {
  let dev: DevServer;

  beforeAll(async () => {
    dev = await startDevServer(fixture("../examples/basic"), { configFile: true });
  });

  afterAll(async () => {
    await dev?.close();
  });

  it("renders real HTML on the server", async () => {
    const response = await fetch(`${dev.origin}/`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(html).toMatch(/^<!DOCTYPE html><html lang="en"><head>/);
    expect(html).toContain("<h1>Graft</h1>");
    expect(html).toContain("Clicked <!-- -->0<!-- --> times");
  });

  it("links the page's CSS and preloads its modules in the HTML", async () => {
    const html = await (await fetch(`${dev.origin}/`)).text();
    const head = html.slice(0, html.indexOf("</head>"));

    expect(head).toContain(
      `<link rel="stylesheet" href="/app/styles.css" data-precedence="graft-dev"/>`,
    );
    expect(head).toContain(`<link rel="modulepreload" href="/app/layout.tsx"/>`);
    expect(head).toContain(`<link rel="modulepreload" href="/app/page.tsx"/>`);
    expect(html).toContain(`<script type="module" src="/@id/__x00__virtual:graft/client"`);
  });

  it("renders dynamic routes with their params", async () => {
    const html = await (await fetch(`${dev.origin}/blog/hello-world`)).text();

    expect(html).toContain("<h1>Hello, world</h1>");
  });

  it("serves the built-in 404 page", async () => {
    const response = await fetch(`${dev.origin}/nope`);

    expect(response.status).toBe(404);
    expect(await response.text()).toContain("404: This page could not be found.");
  });

  it("answers HEAD without a body, and a POST to a page without an action with 405", async () => {
    const head = await fetch(`${dev.origin}/`, { method: "HEAD" });

    expect(head.status).toBe(200);
    expect(head.headers.get("content-type")).toBe("text/html; charset=utf-8");

    const post = await fetch(`${dev.origin}/`, { method: "POST" });

    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET, HEAD");
  });

  it("becomes interactive after hydration, without mismatches", async () => {
    const { page, errors } = await openHydrated(browser, `${dev.origin}/`);
    const button = page.getByRole("button", { name: /Clicked/ });

    await button.click();
    await expect.poll(() => button.textContent()).toBe("Clicked 1 times");
    expect(errors).toEqual([]);

    await page.close();
  });

  it("swaps the server's CSS for Vite's hot-updatable CSS after hydration", async () => {
    const { page } = await openHydrated(browser, `${dev.origin}/`);
    await page.getByRole("button", { name: "Clicked 0 times" }).click();
    await page.getByRole("button", { name: "Clicked 1 times" }).waitFor();

    expect(await page.locator('link[data-precedence="graft-dev"]').count()).toBe(0);
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toBe(
      "system-ui, sans-serif",
    );

    await page.close();
  });
});

describe("custom app/server.ts and app/client.ts", () => {
  let dev: DevServer;

  beforeAll(async () => {
    dev = await startDevServer(fixture("fixtures/custom-entries"));
  });

  afterAll(async () => {
    await dev?.close();
  });

  it("keeps an AsyncLocalStorage context readable after streaming has started", async () => {
    const response = await fetch(`${dev.origin}/context`, {
      headers: { "x-request-id": "req-42" },
    });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    // Read until the shell has arrived. The late part must not be in it yet,
    // which proves it rendered after the response started streaming.
    let html = "";
    while (!html.includes("</html>") && !html.includes("waiting")) {
      html += decoder.decode((await reader.read()).value);
    }

    expect(html).toContain("early: <!-- -->req-42");
    expect(html).toContain("waiting");
    expect(html).not.toContain("late:");

    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      html += decoder.decode(chunk.value);
    }

    expect(html).toContain("late: <!-- -->req-42");
  });

  it("keeps concurrent requests' contexts apart", async () => {
    const [a, b] = await Promise.all(
      ["req-a", "req-b"].map(async (id) =>
        (await fetch(`${dev.origin}/context`, { headers: { "x-request-id": id } })).text(),
      ),
    );

    expect(a).toContain("late: <!-- -->req-a");
    expect(a).not.toContain("req-b");
    expect(b).toContain("late: <!-- -->req-b");
    expect(b).not.toContain("req-a");
  });

  it("runs app/client.ts in the browser", async () => {
    const { page, errors } = await openHydrated(browser, `${dev.origin}/`);
    await page.getByRole("button", { name: "count: 0" }).click();
    await page.getByRole("button", { name: "count: 1" }).waitFor();

    expect(await page.evaluate(() => (window as { customClient?: boolean }).customClient)).toBe(
      true,
    );
    expect(errors).toEqual([]);

    await page.close();
  });
});

describe("errors", () => {
  it("explains a missing root layout", async () => {
    const dev = await startDevServer(fixture("fixtures/no-root-layout"));
    try {
      const response = await fetch(`${dev.origin}/`);
      expect(response.status).toBe(500);
      expect(await response.text()).toContain("app/layout.tsx is missing");
    } finally {
      await dev.close();
    }
  });
});
