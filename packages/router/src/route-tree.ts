/**
 * One folder in `app/` that is part of at least one route.
 *
 * The Vite plugin builds this tree by scanning `app/`, and the runtime matches
 * URLs against it. It holds route IDs rather than modules, so it serializes to
 * plain JSON and both the server and the browser can use it.
 */
export interface RouteNode {
  /** The URL pattern for this folder, e.g. `/` or `/blog/[slug]`. */
  path: string;
  /** The folder name: `""` for `app/` itself, `blog`, or `[slug]`. */
  segment: string;
  /** Set when `segment` is dynamic: the param name (`slug` for `[slug]`). */
  param?: string;
  /** Route ID of this folder's `layout.*`, e.g. `blog/layout`. */
  layout?: string;
  /** Route ID of this folder's `page.*`, e.g. `blog/page`. */
  page?: string;
  children: RouteNode[];
}

/** A matched layout or page, with the params from its own path. */
export interface RouteMatchEntry {
  /** Route ID, e.g. `blog/[slug]/page`. */
  id: string;
  /**
   * The URL of this file's folder within the matched URL: `/dashboard` for
   * `dashboard/layout` when the URL is `/dashboard/settings`. A `<Form>` in
   * the file posts here.
   */
  pathname: string;
  /** Decoded values of the dynamic segments up to this file's folder. */
  params: Record<string, string>;
}

export interface RouteMatch {
  /** The matched URL pattern, e.g. `/blog/[slug]`. */
  path: string;
  /** The layouts that wrap the page, outermost first. */
  layouts: RouteMatchEntry[];
  /** The matched page. */
  page: RouteMatchEntry;
  /** Decoded values of every dynamic segment, e.g. `{ slug: "hello" }`. */
  params: Record<string, string>;
}

/**
 * Matches a URL pathname (e.g. `/blog/hello`) against the route tree.
 * Returns `null` when no page matches.
 *
 * At every level an exact folder name is tried before the dynamic folder, so
 * `blog/new` wins over `blog/[slug]`. If the exact branch dead-ends deeper
 * down, matching falls back to the dynamic branch.
 */
export function matchRoute(root: RouteNode, pathname: string): RouteMatch | null {
  const raw = splitPathname(pathname);
  if (!raw) return null;

  const segments = decodeSegments(raw);
  if (!segments) return null;

  const params: Record<string, string> = {};
  const chain = walk(root, segments, 0, params);
  if (!chain) return null;

  // Each layout only gets the params from its own path, so walk down the
  // chain collecting them as we go.
  // chain[i] is the folder reached after i segments, so its URL is the first i raw segments.
  const layouts: RouteMatchEntry[] = [];
  const own: Record<string, string> = {};
  for (const [depth, node] of chain.entries()) {
    if (node.param !== undefined) own[node.param] = params[node.param]!;
    if (node.layout)
      layouts.push({
        id: node.layout,
        pathname: `/${raw.slice(0, depth).join("/")}`,
        params: { ...own },
      });
  }

  const leaf = chain[chain.length - 1]!;
  return {
    path: leaf.path,
    layouts,
    page: { id: leaf.page!, pathname: `/${raw.join("/")}`, params },
    params,
  };
}

function walk(
  node: RouteNode,
  segments: string[],
  index: number,
  params: Record<string, string>,
): RouteNode[] | null {
  if (index === segments.length) return node.page ? [node] : null;

  const segment = segments[index]!;

  const exact = node.children.find((child) => !child.param && child.segment === segment);
  if (exact) {
    const rest = walk(exact, segments, index + 1, params);
    if (rest) return [node, ...rest];
  }

  const dynamic = node.children.find((child) => child.param);
  if (dynamic && segment !== "") {
    params[dynamic.param!] = segment;
    const rest = walk(dynamic, segments, index + 1, params);
    if (rest) return [node, ...rest];
    delete params[dynamic.param!];
  }

  return null;
}

/**
 * Splits `/blog/hello/` into `["blog", "hello"]`, still percent-encoded.
 * A single trailing slash is ignored. Returns `null` for a malformed pathname.
 */
function splitPathname(pathname: string): string[] | null {
  if (!pathname.startsWith("/")) return null;

  const raw = pathname.slice(1).split("/");
  if (raw[raw.length - 1] === "") raw.pop();

  return raw;
}

function decodeSegments(raw: string[]): string[] | null {
  try {
    return raw.map((segment) => decodeURIComponent(segment));
  } catch {
    // Invalid percent-encoding, e.g. `/%E0%A4%A`.
    return null;
  }
}
