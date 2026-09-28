import {
  ACTION_PARAM,
  DATA_PARAM,
  isRedirect,
  loadRoutes,
  matchUrl,
  Router,
  serializeDataResponse,
  serializePageData,
  stripBase,
  type LoadedRoutes,
  type PageData,
  type RouteMatch,
  type RouteMatchEntry,
  withBase,
} from "@phatjng/graft-router";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { clientEntry, dev, getRouteAssets } from "virtual:graft/assets";
import { modules, routes } from "virtual:graft/routes";

import { badRequest, forbidden, methodNotAllowed, notFound, serverError } from "./pages";

const HTML_HEADERS = { "content-type": "text/html; charset=utf-8" };
const DATA_HEADERS = { "content-type": "application/json; charset=utf-8" };

/**
 * Handles a request for the app.
 *
 * - GET and HEAD match the URL to a page and its layouts, run their loaders,
 *   and stream the rendered HTML.
 * - Every other method runs one action (see `targetFor`), then renders the
 *   page with the action's result and fresh loader data.
 * - A data request (the page's URL plus `?_graft_data=1`, sent by client
 *   navigation and `<Form>`) gets the data instead of HTML.
 *
 * All the work for the request happens inside this call, including rendering
 * that continues after the `Response` is returned, so an `AsyncLocalStorage`
 * context set around it stays readable throughout.
 */
export async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const isDataRequest = url.searchParams.has(DATA_PARAM);
  const actionTarget = url.searchParams.get(ACTION_PARAM);

  if (isDataRequest || actionTarget !== null) {
    // Loaders and actions see the page's own URL, without Graft's markers.
    url.searchParams.delete(DATA_PARAM);
    url.searchParams.delete(ACTION_PARAM);
    request = withUrl(request, url);
  }

  const isMutation = request.method !== "GET" && request.method !== "HEAD";
  if (isMutation && !isSameOrigin(request)) return forbidden();

  // With a Vite `base`, pages live under it: /app/blog matches app/blog/page.tsx.
  const match = matchUrl(routes, url.pathname);

  // A data request has no use for an HTML error page. Any non-2xx status
  // makes the router fall back to a full page load, which shows it.
  if (!match) return isDataRequest ? new Response(null, { status: 404 }) : notFound();

  try {
    const loaded = await loadRoutes(match, modules);

    if (!isMutation) {
      return isDataRequest
        ? await loaderData(request, match, loaded)
        : await renderPage(request, match, loaded, {});
    }

    const target = targetFor(match, actionTarget);
    if (!target) return badRequest();

    const action = loaded[target.id]!.action;
    // No walking up to a parent's action: the file the form targeted has to handle it.
    if (!action) return methodNotAllowed();

    const result = await runAction(() => action({ request, params: target.params }), target.id);
    if (result instanceof Response) return isDataRequest ? redirectAsData(result) : result;

    // With JavaScript, the router asks for fresh loader data separately, for
    // whichever page it's on.
    if (isDataRequest) return dataResponse({ actionData: result });

    // Without JavaScript, the browser shows whatever comes back, so render the
    // page with fresh loader data. Loaders get a GET request: the action
    // already read the body.
    const get = new Request(url, { headers: request.headers, signal: request.signal });
    return await renderPage(get, match, loaded, { [target.id]: result });
  } catch (error) {
    // In dev, let the error reach Vite, which shows it in the browser with
    // its stack. In production, log it and show a plain page instead.
    if (dev) throw error;

    console.error(error);
    return isDataRequest ? new Response(null, { status: 500 }) : serverError();
  }
}

/** A copy of `request` for another URL, keeping its method, headers, body and signal. */
function withUrl(request: Request, url: URL): Request {
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    signal: request.signal,
    ...(request.body && { body: request.body, duplex: "half" }),
  });
}

/**
 * Which file's action a submission runs: the one named by the
 * `_graft_action` marker (a `<Form>` always adds it), or the page when
 * there's no marker, e.g. for a plain `<form method="post">`.
 */
function targetFor(match: RouteMatch, marker: string | null): RouteMatchEntry | undefined {
  if (marker === null) return match.page;

  return [...match.layouts, match.page].find((entry) => entry.id === marker);
}

/**
 * CSRF protection: a mutation must come from a page on this site. Browsers
 * send `Origin` with every POST, and another site can't forge it.
 *
 * Only the host is compared: behind a proxy that terminates HTTPS, the
 * request can arrive as http:// while the page's origin is https://.
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin") ?? refererOrigin(request);

  // Not from a browser (browsers always send Origin on POST), e.g. curl or a test.
  if (origin === undefined) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    // "null", sent by sandboxed iframes and privacy-sensitive redirects.
    return false;
  }
}

function refererOrigin(request: Request): string | undefined {
  const referer = request.headers.get("referer");
  if (!referer) return undefined;

  try {
    return new URL(referer).origin;
  } catch {
    return "null";
  }
}

async function renderPage(
  request: Request,
  match: RouteMatch,
  loaded: LoadedRoutes,
  actionData: Record<string, unknown>,
): Promise<Response> {
  if (match.layouts[0]?.id !== "layout") {
    throw new Error(
      "app/layout.tsx is missing. The root layout renders <html> and <body> for every page.",
    );
  }

  const loaderData = await runLoaders(request, match, loaded);
  if (loaderData instanceof Response) return loaderData;

  // HEAD gets the same status and headers as GET, without rendering.
  if (request.method === "HEAD") return new Response(null, { headers: HTML_HEADERS });

  // After the imports above, so dev mode can see which CSS the route files pulled in.
  const assets = await getRouteAssets([...match.layouts.map((layout) => layout.id), match.page.id]);
  const data: PageData = { loaderData, actionData };

  // The URL matched a route, so it's inside the app's base.
  const pathname = stripBase(new URL(request.url).pathname)!;

  // Errors inside a <Suspense> boundary don't fail the render: React sends the
  // fallback and retries in the browser. They still need logging. Errors
  // before the shell is ready make renderToReadableStream reject, and are
  // thrown to the caller instead.
  let shellReady = false;
  const earlyErrors: unknown[] = [];

  const onError = (error: unknown): void => {
    if (shellReady) console.error(error);
    else earlyErrors.push(error);
  };

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await renderToReadableStream(
      createElement(Router, { initial: { pathname, match, routes: loaded, data }, assets }),
      {
        // Runs before the app's modules, so the data is ready when hydration starts.
        bootstrapScriptContent: serializePageData(data),
        bootstrapModules: [clientEntry],
        signal: request.signal,
        onError,
      },
    );
  } catch (error) {
    for (const other of earlyErrors) if (other !== error) console.error(other);
    throw error;
  }

  shellReady = true;
  for (const error of earlyErrors) console.error(error);

  return new Response(stream, { headers: HTML_HEADERS });
}

/** Answers a data request with the loader data, or the redirect a loader asked for. */
async function loaderData(
  request: Request,
  match: RouteMatch,
  loaded: LoadedRoutes,
): Promise<Response> {
  const result = await runLoaders(request, match, loaded);
  if (result instanceof Response) return redirectAsData(result);

  return dataResponse({ loaderData: result });
}

function dataResponse(body: Parameters<typeof serializeDataResponse>[0]): Response {
  return new Response(serializeDataResponse(body), { headers: DATA_HEADERS });
}

/**
 * A data request can't answer with a real redirect (`fetch` would follow it
 * silently), so the location goes in the body for the router to follow.
 */
function redirectAsData(redirect: Response): Response {
  const headers = new Headers(redirect.headers);
  const location = headers.get("location")!;

  headers.delete("location");
  // Keep the redirect's other headers, e.g. a Set-Cookie that logs the user out.
  headers.set("content-type", DATA_HEADERS["content-type"]);

  return new Response(serializeDataResponse({ redirect: location }), { headers });
}

/** Runs an action, turning a thrown redirect into a returned one. */
async function runAction(run: () => unknown, id: string): Promise<unknown> {
  let value: unknown;
  try {
    value = await run();
  } catch (error) {
    if (isRedirect(error)) return withBaseLocation(error);
    throw error;
  }

  if (value instanceof Response) {
    const { status } = value;

    if (!isRedirect(value)) {
      throw new Error(
        `app/${id}: an action can only return data or a redirect, not a ${status} Response.`,
      );
    }

    return withBaseLocation(value);
  }

  return value;
}

/**
 * Runs the loaders of every matched layout and the page in parallel, so a
 * slow layout loader doesn't hold up the page's (no waterfall).
 *
 * Returns the data keyed by route ID, or a redirect. When several loaders
 * redirect or fail, the outermost one wins: a layout that redirects to
 * /login decides the response even if the page's loader failed because
 * nobody was logged in.
 */
async function runLoaders(
  request: Request,
  match: RouteMatch,
  loaded: LoadedRoutes,
): Promise<Record<string, unknown> | Response> {
  const entries = [...match.layouts, match.page];
  const results = await Promise.allSettled(
    entries.map(async ({ id, params }) => loaded[id]!.loader?.({ request, params })),
  );

  const data: Record<string, unknown> = {};
  for (const [index, result] of results.entries()) {
    const { id } = entries[index]!;
    const value: unknown = result.status === "fulfilled" ? result.value : result.reason;

    if (value instanceof Response) {
      const { status } = value;
      if (isRedirect(value)) return withBaseLocation(value);

      throw new Error(
        `app/${id}: a loader can only return data or a redirect, not a ${status} Response.`,
      );
    }

    if (result.status === "rejected") throw value;
    if (loaded[id]!.loader) data[id] = value;
  }

  return data;
}

/**
 * Loaders and actions redirect to paths inside the app, so with a Vite
 * `base`, `redirect("/login")` goes to `/app/login`. Full URLs stay as they are.
 */
function withBaseLocation(redirect: Response): Response {
  const location = redirect.headers.get("location")!;
  const target = withBase(location);
  if (target === location) return redirect;

  // Copied: a Response's headers can be read-only (e.g. from Response.redirect()).
  const headers = new Headers(redirect.headers);
  headers.set("location", target);

  const { status, statusText } = redirect;
  return new Response(redirect.body, { status, statusText, headers });
}
