import { describe, expect, it } from "vitest";

import { matchRoute, type RouteNode } from "./route-tree";

// app/
//   layout, page
//   about/page
//   blog/
//     layout, page
//     new/page
//     [slug]/page
//     [slug]/edit/page
//   docs/
//     latest/intro/        (no page)
//     [version]/intro/page
//   dashboard/layout       (no page)
const tree: RouteNode = {
  path: "/",
  segment: "",
  layout: "layout",
  page: "page",
  children: [
    { path: "/about", segment: "about", page: "about/page", children: [] },
    {
      path: "/blog",
      segment: "blog",
      layout: "blog/layout",
      page: "blog/page",
      children: [
        { path: "/blog/new", segment: "new", page: "blog/new/page", children: [] },
        {
          path: "/blog/[slug]",
          segment: "[slug]",
          param: "slug",
          page: "blog/[slug]/page",
          children: [
            {
              path: "/blog/[slug]/edit",
              segment: "edit",
              page: "blog/[slug]/edit/page",
              children: [],
            },
          ],
        },
      ],
    },
    {
      path: "/docs",
      segment: "docs",
      children: [
        {
          path: "/docs/latest",
          segment: "latest",
          children: [
            {
              path: "/docs/latest/intro",
              segment: "intro",
              layout: "docs/latest/intro/layout",
              children: [],
            },
          ],
        },
        {
          path: "/docs/[version]",
          segment: "[version]",
          param: "version",
          children: [
            {
              path: "/docs/[version]/intro",
              segment: "intro",
              page: "docs/[version]/intro/page",
              children: [],
            },
          ],
        },
      ],
    },
    { path: "/dashboard", segment: "dashboard", layout: "dashboard/layout", children: [] },
  ],
};

describe("matchRoute", () => {
  it("matches the root page inside the root layout", () => {
    expect(matchRoute(tree, "/")).toEqual({
      path: "/",
      layouts: [{ id: "layout", pathname: "/", params: {} }],
      page: { id: "page", pathname: "/", params: {} },
      params: {},
    });
  });

  it("collects every layout from the root down", () => {
    expect(matchRoute(tree, "/blog/hello")).toEqual({
      path: "/blog/[slug]",
      layouts: [
        { id: "layout", pathname: "/", params: {} },
        { id: "blog/layout", pathname: "/blog", params: {} },
      ],
      page: { id: "blog/[slug]/page", pathname: "/blog/hello", params: { slug: "hello" } },
      params: { slug: "hello" },
    });
  });

  it("gives each layout only the params from its own path", () => {
    const shop: RouteNode = {
      path: "/",
      segment: "",
      layout: "layout",
      children: [
        {
          path: "/[category]",
          segment: "[category]",
          param: "category",
          layout: "[category]/layout",
          children: [
            {
              path: "/[category]/[item]",
              segment: "[item]",
              param: "item",
              page: "[category]/[item]/page",
              children: [],
            },
          ],
        },
      ],
    };

    expect(matchRoute(shop, "/shoes/boot")).toMatchObject({
      layouts: [
        { id: "layout", pathname: "/", params: {} },
        { id: "[category]/layout", pathname: "/shoes", params: { category: "shoes" } },
      ],
      page: { params: { category: "shoes", item: "boot" } },
    });
  });

  it("prefers an exact segment over a dynamic one", () => {
    expect(matchRoute(tree, "/blog/new")?.page.id).toBe("blog/new/page");
  });

  it("falls back to the dynamic segment when the exact branch dead-ends", () => {
    expect(matchRoute(tree, "/blog/new/edit")).toMatchObject({
      page: { id: "blog/[slug]/edit/page" },
      params: { slug: "new" },
    });

    expect(matchRoute(tree, "/docs/latest/intro")).toMatchObject({
      page: { id: "docs/[version]/intro/page" },
      params: { version: "latest" },
    });
  });

  it("does not leave params behind from a failed branch", () => {
    expect(matchRoute(tree, "/docs/v2/intro")?.params).toEqual({ version: "v2" });
  });

  it("returns null when there is no page", () => {
    expect(matchRoute(tree, "/nope")).toBeNull();
    expect(matchRoute(tree, "/dashboard")).toBeNull(); // layout only
    expect(matchRoute(tree, "/about/more")).toBeNull();
  });

  it("is case-sensitive", () => {
    expect(matchRoute(tree, "/About")).toBeNull();
  });

  it("ignores a single trailing slash", () => {
    expect(matchRoute(tree, "/about/")?.page.id).toBe("about/page");
    expect(matchRoute(tree, "/about//")).toBeNull();
  });

  it("does not match an empty dynamic segment", () => {
    expect(matchRoute(tree, "/blog//edit")).toBeNull();
  });

  it("keeps each file's URL percent-encoded", () => {
    expect(matchRoute(tree, "/blog/hello%20world/")?.page.pathname).toBe("/blog/hello%20world");
  });

  it("decodes params and static segments", () => {
    expect(matchRoute(tree, "/blog/hello%20world")?.params).toEqual({ slug: "hello world" });
    expect(matchRoute(tree, "/blog/a%2Fb")?.params).toEqual({ slug: "a/b" });
    expect(matchRoute(tree, "/%61bout")?.page.id).toBe("about/page");
  });

  it("returns null for malformed input", () => {
    expect(matchRoute(tree, "/blog/%E0%A4%A")).toBeNull();
    expect(matchRoute(tree, "about")).toBeNull();
  });
});
