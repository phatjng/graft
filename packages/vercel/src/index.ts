import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { GraftAdapter, GraftBuild } from "@phatjng/graft-vite";

/** The function's name. Its folder is `functions/index.func`, and routes point to `/index`. */
const FUNCTION = "index";

/**
 * Builds a Graft app for Vercel: `vite build` also writes `.vercel/output/`,
 * in Vercel's Build Output API format, which Vercel deploys as it is.
 *
 * ```ts
 * graft({ adapter: vercel() })
 * ```
 */
export function vercel(): GraftAdapter {
  return {
    // Built as dist/server/vercel.js, the function's handler.
    name: "vercel",
    // The built function.ts, next to this file in dist/.
    entry: fileURLToPath(new URL("./function.js", import.meta.url)),
    adapt: writeOutput,
  };
}

/**
 * Writes `.vercel/output/`:
 *
 * - `static/`: the browser files, served by Vercel's CDN.
 * - `functions/index.func/`: the server build, as one Node function.
 * - `config.json`: routes that try a static file first and send everything else to the function.
 */
function writeOutput(build: GraftBuild): void {
  const output = path.join(build.root, ".vercel/output");
  rmSync(output, { recursive: true, force: true });

  // Static files are served at their path under static/, so the base goes in front.
  const staticDir = path.join(output, "static", build.basePath);
  cpSync(build.clientDir, staticDir, {
    recursive: true,
    // The manifest lists every file of the build, and is never served.
    filter: (source) => path.relative(build.clientDir, source) !== ".vite",
  });

  const functionDir = path.join(output, "functions", `${FUNCTION}.func`);
  cpSync(build.serverDir, functionDir, { recursive: true });
  writeJson(path.join(functionDir, ".vc-config.json"), {
    runtime: "nodejs24.x",
    handler: "vercel.js",
    launcherType: "Nodejs",
    supportsResponseStreaming: true,
  });

  // The server build is ESM in .js files.
  writeJson(path.join(functionDir, "package.json"), { type: "module" });

  writeJson(path.join(output, "config.json"), createConfig(build.basePath));
  build.logger.info(`[graft] Wrote the Vercel build to ${path.relative(process.cwd(), output)}`);
}

/**
 * Vercel's routing config. Routes run in order: `continue` adds headers and
 * keeps going, `filesystem` serves a static file if one matches, and the last
 * route sends everything left to the function, which keeps the original URL.
 */
export function createConfig(basePath: string): object {
  return {
    version: 3,
    routes: [
      {
        // Vite content-hashes the files in assets/, so a URL's content never changes.
        src: `^${escapeRegExp(basePath)}assets/`,
        headers: { "cache-control": "public, max-age=31536000, immutable" },
        continue: true,
      },
      { handle: "filesystem" },
      { src: "^/.*$", dest: `/${FUNCTION}` },
    ],
  };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
