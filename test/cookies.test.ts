import { fileURLToPath } from "node:url";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { openHydrated, startDevServer, waitForHydration, type DevServer } from "./helpers";

const cookies = fileURLToPath(new URL("fixtures/cookies", import.meta.url));

let dev: DevServer;
let browser: Browser;

beforeAll(async () => {
  [dev, browser] = await Promise.all([startDevServer(cookies), chromium.launch()]);
});

afterAll(async () => {
  await Promise.all([dev?.close(), browser?.close()]);
});

function get(path: string, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(`${dev.origin}${path}`, { headers, redirect: "manual" });
}

function post(
  path: string,
  body: Record<string, string> = {},
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${dev.origin}${path}`, {
    method: "POST",
    body: new URLSearchParams(body),
    headers,
    redirect: "manual",
  });
}

/** The `name=value` part of each `Set-Cookie`, as the browser would send it back. */
function sentBack(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((header) => header.split(";")[0])
    .join("; ");
}

describe("setting cookies", () => {
  it("sets a cookie from a loader, and keeps the response out of shared caches", async () => {
    const response = await get("/visit");

    expect(await response.text()).toContain("first visit");
    expect(response.headers.getSetCookie()).toEqual([
      "visited=yes; Path=/; HttpOnly; SameSite=Lax",
    ]);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("leaves a response that sets no cookies alone", async () => {
    const response = await get("/visit", { cookie: "visited=yes" });

    expect(await response.text()).toContain("welcome back");
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(response.headers.get("cache-control")).not.toBe("private, no-store");
  });

  it("sets cookies on data requests and HEAD requests too", async () => {
    const data = await get("/visit?_graft_data=1");
    expect(sentBack(data)).toBe("visited=yes");

    const head = await fetch(`${dev.origin}/visit`, { method: "HEAD" });
    expect(sentBack(head)).toBe("visited=yes");
  });

  it("sets cookies on a redirect from an action, and as data for the router", async () => {
    const redirect = await post("/login", { user: "ada" });
    expect(redirect.status).toBe(303);
    expect(redirect.headers.get("location")).toBe("/account");
    expect(sentBack(redirect)).toMatch(/^session=v1\./);

    const data = await post("/login?_graft_data=1", { user: "ada" });
    expect(await data.text()).toContain("/account");
    expect(sentBack(data)).toMatch(/^session=v1\./);
  });

  it("drops the cookies when the action fails", async () => {
    // Its own server: Vite keeps the error and shows it in the next browser
    // page that connects, which would cover the buttons the other tests click.
    const failing = await startDevServer(cookies);

    try {
      const response = await fetch(`${failing.origin}/failing`, { method: "POST" });

      expect(response.status).toBe(500);
      expect(response.headers.getSetCookie()).toEqual([]);
    } finally {
      await failing.close();
    }
  });
});

describe("encrypted cookies", () => {
  async function logIn(headers: Record<string, string> = {}): Promise<string> {
    return sentBack(await post("/login", { user: "ada" }, headers));
  }

  it("can't be read by the browser, and reads back on the server", async () => {
    const session = await logIn();
    expect(session).not.toContain("ada");

    const response = await get("/account", { cookie: session });
    expect(await response.text()).toContain("signed in as <!-- -->ada");
  });

  it("are rejected once changed", async () => {
    const session = await logIn();
    const middle = Math.floor(session.length / 2);
    const flipped = session[middle] === "A" ? "B" : "A";
    const tampered = session.slice(0, middle) + flipped + session.slice(middle + 1);

    const response = await get("/account", { cookie: tampered });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  it("still read after a new secret is added in front", async () => {
    const session = await logIn({ "x-before-rotation": "1" });

    const response = await get("/account", { cookie: session });
    expect(await response.text()).toContain("signed in as <!-- -->ada");
  });
});

describe.each([
  ["without JavaScript", false],
  ["with JavaScript", true],
] as const)("in the browser %s", (_name, javaScriptEnabled) => {
  let context: BrowserContext;

  beforeAll(async () => {
    context = await browser.newContext({ javaScriptEnabled });
  });

  afterAll(async () => {
    await context?.close();
  });

  async function open(path: string): Promise<Page> {
    const page = await context.newPage();
    await page.goto(`${dev.origin}${path}`);
    if (javaScriptEnabled) await waitForHydration(page);

    return page;
  }

  it("logs in and out with an encrypted session cookie", async () => {
    const page = await open("/login");

    await page.getByRole("button", { name: "log in" }).click();
    await expect.poll(() => page.locator("#user").textContent()).toBe("signed in as ada");
    expect(new URL(page.url()).pathname).toBe("/account");

    await page.getByRole("button", { name: "log out" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/login");

    await page.goto(`${dev.origin}/account`);
    expect(new URL(page.url()).pathname).toBe("/login");

    await page.close();
  });

  it("shows a cookie the action just set, on the same page", async () => {
    const page = await open("/theme");
    expect(await page.locator("#theme").textContent()).toBe("theme light");

    // Without JavaScript, the loaders that render the page run right after
    // the action, in the same request. With it, the router fetches them next.
    await page.getByRole("button", { name: "toggle" }).click();
    await expect.poll(() => page.locator("#saved").textContent()).toBe("saved dark");
    expect(await page.locator("#theme").textContent()).toBe("theme dark");

    await page.reload();
    expect(await page.locator("#theme").textContent()).toBe("theme dark");

    await page.close();
  });
});

it("reads cookies set by the browser itself", async () => {
  const { page } = await openHydrated(browser, `${dev.origin}/`);
  await page.context().addCookies([{ name: "theme", value: "dark", url: dev.origin }]);

  await page.reload();
  expect(await page.locator("#cookies").textContent()).toBe("theme dark, session none");

  await page.close();
});
