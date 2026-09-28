import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { RouteNode } from "@phatjng/graft-router";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { startDevServer, type DevServer } from "./helpers";

const repo = fileURLToPath(new URL("..", import.meta.url));

interface RoutesModule {
  routes: RouteNode;
  modules: Record<string, () => Promise<unknown>>;
}

/** Starts a dev server just long enough for the plugin to scan the app and write its types. */
async function scanOnce(root: string): Promise<void> {
  await (await startDevServer(root)).close();
}

describe("route tree in dev", () => {
  let root: string;
  let dev: DevServer;

  const loadRoutes = () =>
    dev.server.ssrLoadModule("virtual:graft/routes") as Promise<RoutesModule>;

  beforeAll(async () => {
    // realpath: on macOS the temp dir is behind a symlink, and file watcher events use the real path.
    root = realpathSync(mkdtempSync(path.join(tmpdir(), "graft-routes-")));
    mkdirSync(path.join(root, "app"));
    writeFileSync(path.join(root, "app/layout.tsx"), "export default function Layout() {}\n");
    writeFileSync(path.join(root, "app/page.tsx"), "export default function Page() {}\n");
    dev = await startDevServer(root);
  });

  afterAll(async () => {
    await dev?.close();
    rmSync(root, { recursive: true, force: true });
  });

  it("serves the route tree from virtual:graft/routes", async () => {
    const { routes, modules } = await loadRoutes();
    expect(routes).toMatchObject({ path: "/", layout: "layout", page: "page", children: [] });
    expect(Object.keys(modules).sort()).toEqual(["layout", "page"]);
  });

  it("picks up a new page without restarting", async () => {
    mkdirSync(path.join(root, "app/about"));
    writeFileSync(path.join(root, "app/about/page.tsx"), "export default function About() {}\n");

    await vi.waitFor(async () => {
      const { routes } = await loadRoutes();
      expect(routes.children).toMatchObject([{ path: "/about", page: "about/page" }]);
    });

    const types = readFileSync(path.join(root, ".graft/types/routes.d.ts"), "utf8");
    expect(types).toContain(`"/about": {};`);
  });

  it("drops a deleted page without restarting", async () => {
    rmSync(path.join(root, "app/about"), { recursive: true });

    await vi.waitFor(async () => {
      const { routes } = await loadRoutes();
      expect(routes.children).toEqual([]);
    });
  });

  it("reports an invalid route and recovers once it's fixed", async () => {
    const bad = path.join(root, "app/[...slug]");
    mkdirSync(bad);
    writeFileSync(path.join(bad, "page.tsx"), "export default function Page() {}\n");

    await vi.waitFor(async () => {
      await expect(loadRoutes()).rejects.toThrow("catch-all segments");
    });

    rmSync(bad, { recursive: true });

    await vi.waitFor(async () => {
      const { routes } = await loadRoutes();
      expect(routes.children).toEqual([]);
    });
  });
});

describe("typed params", () => {
  it("generates PageProps and LayoutProps that type-check against real route files", async () => {
    const root = path.join(repo, "test/fixtures/typed-routes");
    // Starting the server scans app/ and writes .graft/types.
    await scanOnce(root);

    const tsc = path.join(repo, "node_modules/.bin/tsc");
    const result = spawnSync(tsc, ["--noEmit", "-p", root], { encoding: "utf8" });
    // Any type error shows up here, including an @ts-expect-error that no longer errors.
    expect(result.stdout + result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("adds the generated types to the app's tsconfig include", async () => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), "graft-tsconfig-")));
    try {
      writeFileSync(path.join(root, "tsconfig.json"), `{ "include": ["app"] }`);
      await scanOnce(root);

      const tsconfig = JSON.parse(readFileSync(path.join(root, "tsconfig.json"), "utf8"));
      expect(tsconfig.include).toEqual(["app", ".graft/types/**/*.ts"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
