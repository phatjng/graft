import { fileURLToPath } from "node:url";

import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../examples/basic", import.meta.url));

describe("the graft() plugin", () => {
  let server: ViteDevServer;

  beforeAll(async () => {
    server = await createServer({
      root,
      configFile: `${root}/vite.config.ts`,
      logLevel: "silent",
      server: { port: 0 },
    });

    await server.listen();
  });

  afterAll(async () => {
    await server?.close();
  });

  it("loads the graft() plugin from @phatjng/graft/vite", () => {
    const names = server.config.plugins.map((plugin) => plugin.name);
    expect(names).toContain("graft");
  });

  it("starts the dev server", async () => {
    const url = server.resolvedUrls?.local[0];
    expect(url).toBeDefined();

    const response = await fetch(new URL("/@vite/client", url));
    expect(response.status).toBe(200);
  });
});
