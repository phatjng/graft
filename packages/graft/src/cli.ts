#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs, styleText } from "node:util";

import { serve, type FetchHandler } from "@phatjng/graft-node";

const USAGE = `Usage: graft <command> [options]

Commands:
  start [dir]     Serve a production build (default dir: dist)
  typegen [root]  Write route types to .graft/types for tsc (default root: .)

Options for start:
  -p, --port <port>   Port to listen on (default: $PORT or 3000)
      --host <host>   Host to listen on (default: $HOST or all interfaces)

Use \`vite\` for development and \`vite build\` to build.`;

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      port: { type: "string", short: "p" },
      host: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  const [command, ...rest] = positionals;

  if (values.help || command === undefined) {
    console.log(USAGE);
    return;
  }

  if (command === "typegen") return typegen(rest[0] ?? ".");
  if (command !== "start") fail(`Unknown command "${command}".\n\n${USAGE}`);

  const port = Number(values.port ?? process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    fail(`"${values.port ?? process.env.PORT}" isn't a valid port.`);

  await start(rest[0] ?? "dist", port, values.host ?? process.env.HOST);
}

async function start(dir: string, port: number, host: string | undefined): Promise<void> {
  const root = path.resolve(dir);
  const entry = path.join(root, "server/index.js");
  if (!existsSync(entry)) fail(`No server build at ${entry}. Run \`vite build\` first.`);

  const build = (await import(pathToFileURL(entry).href)) as {
    default?: FetchHandler;
    base?: string;
  };
  const app = build.default;
  if (typeof app?.fetch !== "function")
    fail(`${entry} doesn't default-export an object with a fetch(request) method.`);

  const server = await serve(app, {
    client: path.join(root, "client"),
    // Vite's `base`. When it's a full URL (assets on a CDN), serve its path.
    base: new URL(build.base ?? "/", "http://localhost").pathname,
    port,
    ...(host && { host }),
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(
    `Graft is running at ${styleText("cyan", `http://${host ?? "localhost"}:${actualPort}`)}`,
  );

  // Let in-flight requests finish before exiting.
  const stop = (): void => {
    server.close(() => process.exit(0));
    server.closeIdleConnections();
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

async function typegen(root: string): Promise<void> {
  // Imported here, not at the top: `graft start` runs in production, where
  // Vite (usually a dev dependency) may not be installed.
  const { typegen } = await import("@phatjng/graft-vite");

  let file: string;
  try {
    file = await typegen(path.resolve(root));
  } catch (error) {
    fail((error as Error).message);
  }

  console.log(`Wrote route types to ${path.relative(process.cwd(), file)}`);
}

function fail(message: string): never {
  console.error(styleText("red", message));
  process.exit(1);
}

await main();
