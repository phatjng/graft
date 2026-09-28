import { matchRoute, type RouteMatch, type RouteNode } from "./route-tree";

// A Graft app can live under a path prefix, set with Vite's `base` option
// (`base: "/app/"`). The whole app moves there: its assets, and its pages too,
// so `app/blog/page.tsx` answers `/app/blog`.
//
// Inside the app, paths leave the prefix out: `<Link href="/blog">`,
// `<Form action="/blog">` and `redirect("/login")` all take app paths, and
// Graft adds the prefix. That way moving an app is one config change.

/**
 * Where the app is mounted: the path of Vite's `base`, without its trailing
 * slash. `"/app"` for `base: "/app/"`, and `""` for the default `"/"`.
 *
 * Vite replaces `import.meta.env.BASE_URL` in the browser and on the server,
 * since it processes Graft's runtime as source. A `base` that's a full URL
 * (assets on a CDN) mounts the app at that URL's path.
 */
export const basename = new URL(import.meta.env.BASE_URL, "http://localhost").pathname.replace(
  /\/$/,
  "",
);

/**
 * Adds the base to a path inside the app: `/blog` becomes `/app/blog`.
 * Full URLs (`https://...`, `//host/...`) and relative ones (`../blog`,
 * `?page=2`, `#top`) are left alone.
 */
export function withBase(href: string, base = basename): string {
  return base && href.startsWith("/") && !href.startsWith("//") ? base + href : href;
}

/**
 * The path inside the app for a URL's pathname: `/app/blog` becomes `/blog`.
 * `null` when the pathname is outside the app.
 */
export function stripBase(pathname: string, base = basename): string | null {
  if (!base) return pathname;
  if (pathname === base) return "/";

  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : null;
}

/** Matches a URL's pathname, base included, against the route tree. */
export function matchUrl(routes: RouteNode, pathname: string): RouteMatch | null {
  const path = stripBase(pathname);
  return path === null ? null : matchRoute(routes, path);
}
