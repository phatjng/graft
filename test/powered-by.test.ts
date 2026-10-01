import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { startDevServer, type DevServer } from "./helpers";

const loaders = fileURLToPath(new URL("fixtures/loaders", import.meta.url));

describe("X-Powered-By", () => {
  let dev: DevServer;
  let optedOut: DevServer;

  beforeAll(async () => {
    [dev, optedOut] = await Promise.all([
      startDevServer(loaders),
      startDevServer(loaders, { graftOptions: { poweredByHeader: false } }),
    ]);
  });

  afterAll(async () => {
    await Promise.all([dev?.close(), optedOut?.close()]);
  });

  it.each(["/", "/?_graft_data=1", "/redirect-thrown", "/nope"])(
    "is sent by default, on %s",
    async (path) => {
      const response = await fetch(`${dev.origin}${path}`, { redirect: "manual" });
      expect(response.headers.get("x-powered-by")).toBe("Graft");
    },
  );

  it("is left out with poweredByHeader: false", async () => {
    const response = await fetch(`${optedOut.origin}/`);

    expect(response.status).toBe(200);
    expect(response.headers.has("x-powered-by")).toBe(false);
  });
});
