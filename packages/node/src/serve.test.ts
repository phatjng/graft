import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { serve } from "./serve";

describe("serve", () => {
  let client: string;
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    client = mkdtempSync(path.join(tmpdir(), "graft-serve-"));
    mkdirSync(path.join(client, "assets"));
    mkdirSync(path.join(client, ".vite"));
    writeFileSync(path.join(client, "assets/app-123.js"), "console.log(1)");
    writeFileSync(path.join(client, "robots.txt"), "User-agent: *");
    writeFileSync(path.join(client, ".vite/manifest.json"), "{}");

    server = await serve(
      {
        fetch(request) {
          const { pathname } = new URL(request.url);
          if (pathname === "/boom") throw new Error("boom");

          return new Response(`app: ${pathname}`);
        },
      },
      { client, port: 0 },
    );

    origin = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(client, { recursive: true, force: true });
  });

  it("serves hashed assets with a long-lived cache", async () => {
    const response = await fetch(`${origin}/assets/app-123.js`);

    expect(await response.text()).toBe("console.log(1)");
    expect(response.headers.get("content-type")).toContain("javascript");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it("serves other static files without the immutable cache", async () => {
    const response = await fetch(`${origin}/robots.txt`);

    expect(await response.text()).toBe("User-agent: *");
    expect(response.headers.get("cache-control") ?? "").not.toContain("immutable");
  });

  it("hands everything else to the app", async () => {
    expect(await (await fetch(`${origin}/blog/hello`)).text()).toBe("app: /blog/hello");
  });

  it("doesn't serve dotfiles such as the build manifest", async () => {
    expect(await (await fetch(`${origin}/.vite/manifest.json`)).text()).toBe(
      "app: /.vite/manifest.json",
    );
  });

  it("answers 500 when the app throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await fetch(`${origin}/boom`);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Internal Server Error");
    expect(log).toHaveBeenCalledOnce();

    log.mockRestore();
  });
});

describe("serve with a base", () => {
  let client: string;
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    client = mkdtempSync(path.join(tmpdir(), "graft-serve-base-"));
    mkdirSync(path.join(client, "assets"));
    writeFileSync(path.join(client, "assets/app-123.js"), "console.log(1)");

    server = await serve(
      { fetch: (request) => new Response(`app: ${new URL(request.url).pathname}`) },
      { client, base: "/app", port: 0 },
    );

    origin = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(client, { recursive: true, force: true });
  });

  it("serves static files under the base", async () => {
    const response = await fetch(`${origin}/app/assets/app-123.js`);

    expect(await response.text()).toBe("console.log(1)");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it("hands everything else to the app with its full URL", async () => {
    expect(await (await fetch(`${origin}/app/blog`)).text()).toBe("app: /app/blog");
    expect(await (await fetch(`${origin}/assets/app-123.js`)).text()).toBe(
      "app: /assets/app-123.js",
    );
  });
});
