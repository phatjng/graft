import { matchRoute } from "@phatjng/graft-router";
import { describe, expect, it } from "vitest";

import { buildRouteTree } from "./scan";

describe("buildRouteTree", () => {
  it("turns page and layout files into a tree", () => {
    const { tree, files } = buildRouteTree([
      "layout.tsx",
      "page.tsx",
      "blog/layout.tsx",
      "blog/page.tsx",
      "blog/[slug]/page.tsx",
    ]);

    expect(tree).toEqual({
      path: "/",
      segment: "",
      layout: "layout",
      page: "page",
      children: [
        {
          path: "/blog",
          segment: "blog",
          layout: "blog/layout",
          page: "blog/page",
          children: [
            {
              path: "/blog/[slug]",
              segment: "[slug]",
              param: "slug",
              page: "blog/[slug]/page",
              children: [],
            },
          ],
        },
      ],
    });

    expect(files).toEqual([
      { id: "blog/[slug]/page", file: "blog/[slug]/page.tsx" },
      { id: "blog/layout", file: "blog/layout.tsx" },
      { id: "blog/page", file: "blog/page.tsx" },
      { id: "layout", file: "layout.tsx" },
      { id: "page", file: "page.tsx" },
    ]);
  });

  it("accepts .tsx, .ts, .jsx and .js", () => {
    const { files } = buildRouteTree(["a/page.ts", "b/page.jsx", "c/page.js", "d/layout.tsx"]);

    expect(files.map((f) => f.id)).toEqual(["a/page", "b/page", "c/page", "d/layout"]);
  });

  it("ignores files that aren't pages or layouts", () => {
    const { tree, files } = buildRouteTree([
      "page.tsx",
      "server.ts",
      "client.ts",
      "styles.css",
      "components/Button.tsx",
      "page.test.tsx",
      "blog/page.module.css",
      "(icons)/Icon.tsx",
      "notes.md",
    ]);

    expect(files.map((f) => f.id)).toEqual(["page"]);
    expect(tree.children).toEqual([]);
  });

  it("keeps folders without their own route files as tree nodes", () => {
    const { tree } = buildRouteTree(["docs/guides/page.tsx"]);
    expect(tree.children[0]).toMatchObject({
      path: "/docs",
      children: [{ path: "/docs/guides", page: "docs/guides/page" }],
    });

    expect(tree.children[0]).not.toHaveProperty("page");
  });

  it("sorts static children before the dynamic one", () => {
    const { tree } = buildRouteTree([
      "blog/[slug]/page.tsx",
      "blog/zebra/page.tsx",
      "blog/alpha/page.tsx",
    ]);

    expect(tree.children[0]!.children.map((c) => c.segment)).toEqual(["alpha", "zebra", "[slug]"]);
  });

  it("gives exact segments priority whatever order the files are found in", () => {
    const files = ["blog/[slug]/page.tsx", "blog/new/page.tsx"];

    for (const order of [files, [...files].reverse()]) {
      const { tree } = buildRouteTree(order);

      expect(matchRoute(tree, "/blog/new")?.page.id).toBe("blog/new/page");
      expect(matchRoute(tree, "/blog/other")?.page.id).toBe("blog/[slug]/page");
    }
  });

  it("rejects two page files in one folder", () => {
    expect(() => buildRouteTree(["blog/page.tsx", "blog/page.js"])).toThrow(
      "app/blog/page.js and app/blog/page.tsx are both the page for the same folder",
    );
  });

  it("rejects two differently named dynamic folders side by side", () => {
    expect(() => buildRouteTree(["blog/[id]/page.tsx", "blog/[slug]/page.tsx"])).toThrow(
      'app/blog/ has two dynamic folders, "[id]" and "[slug]"',
    );
  });

  it("rejects a param name used twice in one path", () => {
    expect(() => buildRouteTree(["[id]/[id]/page.tsx"])).toThrow('uses the param "id" twice');
  });

  it("rejects syntax that isn't supported yet instead of treating it as a literal folder", () => {
    expect(() => buildRouteTree(["docs/[...slug]/page.tsx"])).toThrow("catch-all segments");
    expect(() => buildRouteTree(["docs/[[...slug]]/page.tsx"])).toThrow("catch-all segments");
    expect(() => buildRouteTree(["(marketing)/about/page.tsx"])).toThrow("route groups");
    expect(() => buildRouteTree(["@modal/page.tsx"])).toThrow("reserved");
  });

  it("rejects malformed dynamic segments", () => {
    expect(() => buildRouteTree(["post-[id]/page.tsx"])).toThrow("isn't a valid folder name");
    expect(() => buildRouteTree(["[post-id]/page.tsx"])).toThrow("isn't a valid folder name");
    expect(() => buildRouteTree(["[1st]/page.tsx"])).toThrow("isn't a valid folder name");
  });
});
