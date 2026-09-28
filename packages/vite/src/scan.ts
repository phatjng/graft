import { existsSync, readdirSync } from "node:fs";

import type { RouteNode } from "@phatjng/graft-router";

const EXTENSIONS = ["tsx", "ts", "jsx", "js"];
const ROUTE_FILE = /^(page|layout)\.(tsx|ts|jsx|js)$/;
const DYNAMIC_SEGMENT = /^\[([A-Za-z_][A-Za-z0-9_]*)\]$/;

/** A route file found in `app/`. */
export interface RouteFile {
  /** e.g. `blog/[slug]/page` */
  id: string;
  /** Path relative to `app/`, with forward slashes, e.g. `blog/[slug]/page.tsx`. */
  file: string;
}

export interface ScanResult {
  tree: RouteNode;
  files: RouteFile[];
}

/** Lists every file under `appDir` (relative, forward slashes) and builds the route tree. */
export function scanAppDir(appDir: string): ScanResult {
  let entries: string[];
  try {
    entries = readdirSync(appDir, { recursive: true, encoding: "utf8" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") entries = [];
    else throw error;
  }

  return buildRouteTree(entries.map((entry) => entry.replaceAll("\\", "/")));
}

/**
 * Builds the route tree from paths relative to `app/`. Files that aren't
 * `page.*` or `layout.*` are ignored. Throws on anything Graft can't route.
 */
export function buildRouteTree(paths: string[]): ScanResult {
  const root: RouteNode = { path: "/", segment: "", children: [] };
  const files: RouteFile[] = [];
  const fileById = new Map<string, string>();

  for (const file of [...paths].sort()) {
    const parts = file.split("/");
    const name = parts.pop()!;
    const kind = ROUTE_FILE.exec(name)?.[1] as "page" | "layout" | undefined;
    if (!kind) continue;

    const id = [...parts, kind].join("/");
    const existing = fileById.get(id);
    if (existing) {
      throw new Error(
        `app/${existing} and app/${file} are both the ${kind} for the same folder. Keep only one.`,
      );
    }

    fileById.set(id, file);
    files.push({ id, file });

    let node = root;
    const params = new Set<string>();
    for (const segment of parts) {
      const param = parseSegment(segment, file);
      if (param !== undefined) {
        if (params.has(param)) {
          throw new Error(
            `app/${file} uses the param "${param}" twice. Each dynamic segment in a path needs a different name.`,
          );
        }
        params.add(param);
      }

      node = getOrAddChild(node, segment, param, file);
    }

    node[kind] = id;
  }

  sortTree(root);
  return { tree: root, files };
}

/** Returns the param name for a dynamic segment, or `undefined` for a static one. */
function parseSegment(segment: string, file: string): string | undefined {
  const dynamic = DYNAMIC_SEGMENT.exec(segment);
  if (dynamic) return dynamic[1];

  if (segment.startsWith("[...") || segment.startsWith("[[")) {
    throw new Error(`app/${file}: catch-all segments like "${segment}" aren't supported yet.`);
  }

  if (segment.startsWith("(") && segment.endsWith(")")) {
    throw new Error(`app/${file}: route groups like "${segment}" aren't supported yet.`);
  }

  if (segment.startsWith("@")) {
    throw new Error(`app/${file}: folders starting with "@" are reserved.`);
  }

  if (segment.includes("[") || segment.includes("]")) {
    throw new Error(
      `app/${file}: "${segment}" isn't a valid folder name for a route. ` +
        `A dynamic segment is a whole folder name like "[slug]", where the name is a JavaScript identifier.`,
    );
  }

  return undefined;
}

function getOrAddChild(
  node: RouteNode,
  segment: string,
  param: string | undefined,
  file: string,
): RouteNode {
  const existing = node.children.find((child) => child.segment === segment);
  if (existing) return existing;

  if (param !== undefined) {
    const sibling = node.children.find((child) => child.param !== undefined);
    if (sibling) {
      const parent = node.path === "/" ? "app/" : `app${node.path}/`;
      throw new Error(
        `${parent} has two dynamic folders, "${sibling.segment}" and "${segment}" (from app/${file}). ` +
          `A URL can't tell them apart, so use one name.`,
      );
    }
  }

  const child: RouteNode = {
    path: node.path === "/" ? `/${segment}` : `${node.path}/${segment}`,
    segment,
    ...(param !== undefined && { param }),
    children: [],
  };

  node.children.push(child);
  return child;
}

/** Static folders first (alphabetically), then the dynamic one, so output is stable. */
function sortTree(node: RouteNode): void {
  node.children.sort((a, b) => {
    if ((a.param === undefined) !== (b.param === undefined)) return a.param === undefined ? -1 : 1;
    return a.segment < b.segment ? -1 : a.segment > b.segment ? 1 : 0;
  });

  node.children.forEach(sortTree);
}

/**
 * Finds `app/server.*` or `app/client.*`. Returns the file name relative to
 * `app/`, or `undefined` when the app uses Graft's built-in entry.
 */
export function findEntryFile(appDir: string, name: "server" | "client"): string | undefined {
  const found = EXTENSIONS.map((ext) => `${name}.${ext}`).filter((file) =>
    existsSync(`${appDir}/${file}`),
  );

  if (found.length > 1) {
    throw new Error(
      `${found.map((file) => `app/${file}`).join(" and ")} are both the ${name} entry. Keep only one.`,
    );
  }

  return found[0];
}
