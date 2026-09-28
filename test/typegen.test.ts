import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("..", import.meta.url));
const basic = path.join(repo, "examples/basic");
const cli = path.join(repo, "packages/graft/dist/cli.js");
const tsc = path.join(repo, "node_modules/.bin/tsc");

function run(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  return { status: result.status, output: result.stdout + result.stderr };
}

describe("graft typegen", () => {
  let root: string;

  // A copy of examples/basic, so deleting its .graft/ can't race the other
  // tests' dev servers. It sits inside examples/basic/node_modules/.cache, so
  // it still resolves the example's dependencies.
  beforeEach(() => {
    root = path.join(basic, "node_modules/.cache", `graft-typegen-${randomUUID()}`);
    mkdirSync(root, { recursive: true });

    for (const file of ["app", "vite.config.ts", "package.json"]) {
      cpSync(path.join(basic, file), path.join(root, file), { recursive: true });
    }

    writeFileSync(
      path.join(root, "tsconfig.json"),
      JSON.stringify({
        extends: path.join(repo, "tsconfig.base.json"),
        compilerOptions: { noEmit: true },
        include: ["app", "vite.config.ts", ".graft/types/**/*.ts"],
      }),
    );
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("lets a fresh app type-check without running Vite first", () => {
    expect(existsSync(path.join(root, ".graft"))).toBe(false);
    // Without the generated types, PageProps and friends don't exist.
    expect(run(tsc, ["--noEmit"], root).status).not.toBe(0);

    const typegen = run(process.execPath, [cli, "typegen"], root);
    expect(typegen.output).toBe("Wrote route types to .graft/types/routes.d.ts\n");
    expect(typegen.status).toBe(0);

    const typecheck = run(tsc, ["--noEmit"], root);
    expect(typecheck.output).toBe("");
    expect(typecheck.status).toBe(0);
  });

  it("takes the app's root as an argument", () => {
    const typegen = run(process.execPath, [cli, "typegen", root], repo);

    expect(typegen.status).toBe(0);
    expect(existsSync(path.join(root, ".graft/types/routes.d.ts"))).toBe(true);
  });

  it("fails with the reason when app/ is invalid", () => {
    mkdirSync(path.join(root, "app/[...slug]"));
    writeFileSync(path.join(root, "app/[...slug]/page.tsx"), "export default function Page() {}\n");

    const typegen = run(process.execPath, [cli, "typegen"], root);
    expect(typegen.status).toBe(1);

    expect(typegen.output).toContain("catch-all segments");
    // Reported once, not also by the plugin.
    expect(typegen.output.split("catch-all segments")).toHaveLength(2);
  });

  it("fails when the Vite config doesn't use graft()", () => {
    writeFileSync(path.join(root, "vite.config.ts"), "export default {};\n");

    const typegen = run(process.execPath, [cli, "typegen"], root);
    expect(typegen.status).toBe(1);

    expect(typegen.output).toContain("doesn't use graft()");
  });
});
