import { createServer, type Server } from "node:http";

import sirv from "sirv";

import { createRequest, sendResponse } from "./bridge";

/** Anything with a `fetch` method, like the default export of a Graft server build. */
export interface FetchHandler {
  fetch(request: Request): Response | Promise<Response>;
}

export interface ServeOptions {
  /** Folder of static files to serve before the app, e.g. `dist/client`. */
  client?: string;
  /**
   * The URL path the static files are served under: Vite's `base`, like
   * `/app/`, which a Graft server build exports as `base`. Defaults to `/`.
   */
  base?: string;
  /** Port to listen on. `0` picks a free one. Defaults to 3000. */
  port?: number;
  /** Host to listen on. Defaults to all interfaces. */
  host?: string;
}

/**
 * Serves a `fetch` handler over Node HTTP. Static files from `client` are
 * served first (under `base`); every other request goes to `app.fetch`.
 *
 * Resolves once the server is listening.
 */
export async function serve(app: FetchHandler, options: ServeOptions = {}): Promise<Server> {
  const base = normalizeBase(options.base ?? "/");
  const assets = options.client
    ? sirv(options.client, {
        etag: true,
        // Vite puts content-hashed files in assets/ (under the base). Their content never
        // changes for a given URL, so browsers can cache them forever.
        setHeaders(res, pathname) {
          if (pathname.startsWith("/assets/")) {
            res.setHeader("cache-control", "public, max-age=31536000, immutable");
          }
        },
      })
    : undefined;

  const server = createServer((req, res) => {
    const handleApp = async (): Promise<void> => {
      try {
        const response = await app.fetch(createRequest(req, res));
        await sendResponse(res, response);
      } catch (error) {
        console.error(error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end("Internal Server Error");
        }
      }
    };

    const url = req.url ?? "/";
    if (!assets || !url.startsWith(base)) return void handleApp();

    // /app/assets/x.js is client/assets/x.js. The app still gets the full URL.
    req.url = url.slice(base.length - 1);
    assets(req, res, () => {
      req.url = url;
      void handleApp();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 3000, options.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return server;
}

/** `"/app/"` for `"/app"`, `"app/"` or `"/app/"`. */
function normalizeBase(base: string): string {
  const trimmed = base.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/` : "/";
}
