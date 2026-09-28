import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { pages } from "../docs/app/nav";
import { buildApp, graftStart, openHydrated, type StartedApp } from "./helpers";

const root = fileURLToPath(new URL("../docs", import.meta.url));

describe("docs: the Graft docs site, built with Graft", () => {
  let outDir: string;
  let prod: StartedApp;
  let browser: Browser;

  beforeAll(async () => {
    outDir = path.join(root, "node_modules/.cache/graft-docs-test");
    rmSync(outDir, { recursive: true, force: true });
    await buildApp(root, outDir, { configFile: true });
    [prod, browser] = await Promise.all([graftStart(outDir), chromium.launch()]);
  });

  afterAll(async () => {
    prod?.process.kill();
    await browser?.close();
    rmSync(outDir, { recursive: true, force: true });
  });

  it("renders every page in the sidebar, with a title and a heading", async () => {
    for (const { href, title } of pages) {
      const response = await fetch(`${prod.origin}${href}`);
      expect(response.status, href).toBe(200);

      const html = await response.text();
      expect(html, href).toMatch(/<title>[^<]+ · Graft<\/title>/);
      expect(html, href).toContain("<h1>");
      const current = html.match(/<a [^>]*aria-current="page"[^>]*>([^<]*)<\/a>/);
      expect(current?.[1], href).toBe(escapeHtml(title));
    }
  });

  it("has no broken links between pages", async () => {
    const known = new Set(pages.map((page) => page.href));
    for (const { href } of pages) {
      const html = await (await fetch(`${prod.origin}${href}`)).text();

      for (const [, target] of html.matchAll(/<a [^>]*href="(\/[^"#?]*)/g)) {
        expect(known, `${href} links to ${target}`).toContain(target);
      }
    }
  });

  it("navigates in the browser without a full page load", async () => {
    const { page, errors } = await openHydrated(browser, `${prod.origin}/`);
    await page.evaluate(() => ((window as { marker?: boolean }).marker = true));

    await page.getByRole("navigation", { name: "Docs" }).getByText("Fetching data").click();
    await page.getByRole("heading", { level: 1, name: "Fetching data" }).waitFor();
    expect(await page.title()).toBe("Fetching data · Graft");
    expect(await page.locator('[aria-current="page"]').textContent()).toBe("Fetching data");
    expect(await page.getByRole("link", { name: "Next Updating data" }).count()).toBe(1);
    expect(await page.evaluate(() => (window as { marker?: boolean }).marker)).toBe(true);

    expect(errors).toEqual([]);
    await page.close();
  });
});

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
