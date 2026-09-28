import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const src = (pkg: string): string =>
  fileURLToPath(new URL(`packages/${pkg}/src/index.ts`, import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["packages/*/src/**/*.test.ts"],
          // Unit tests import each other's packages from source, so they never
          // run against a stale dist/. Integration tests use the real build.
          alias: {
            "@phatjng/graft-router": src("router"),
          },
        },
      },
      {
        test: {
          name: "integration",
          include: ["test/**/*.test.ts"],
          // The examples import the built packages (like a real user would),
          // so build them before any integration test runs.
          globalSetup: ["test/setup/build.ts"],
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
