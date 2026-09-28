import type { RouteAssets } from "@phatjng/graft-router";
import { describe, expect, it } from "vitest";

import {
  generateBuildAssetsModule,
  generateClientEntry,
  generateRoutesModule,
  generateRouteTypes,
  generateServerEntry,
  type Manifest,
} from "./codegen";
import { buildRouteTree } from "./scan";

describe("generateRoutesModule", () => {
  it("exports the tree and a lazy import per route file", () => {
    const { tree, files } = buildRouteTree(["layout.tsx", "blog/[slug]/page.tsx"]);
    const code = generateRoutesModule(tree, files, "/project/app");

    expect(code).toContain(`export const routes = ${JSON.stringify(tree)};`);
    expect(code).toContain(
      `"blog/[slug]/page": () => import("/project/app/blog/[slug]/page.tsx"),`,
    );
    expect(code).toContain(`"layout": () => import("/project/app/layout.tsx"),`);
  });
});

describe("generateRouteTypes", () => {
  const { tree, files } = buildRouteTree([
    "layout.tsx",
    "page.tsx",
    "shop/[category]/layout.tsx",
    "shop/[category]/[item]/page.jsx",
  ]);
  const types = generateRouteTypes(tree, files, "../../app");

  it("maps each page and layout path to its params and loader data", () => {
    expect(types).toContain(`interface GraftPages {
  "/": {
    params: {};
    loaderData: LoaderDataOf<typeof import("../../app/page")>;
    actionData: ActionDataOf<typeof import("../../app/page")>;
  };
  "/shop/[category]/[item]": {
    params: { category: string; item: string };
    loaderData: LoaderDataOf<typeof import("../../app/shop/[category]/[item]/page")>;
    actionData: ActionDataOf<typeof import("../../app/shop/[category]/[item]/page")>;
  };
}`);
    expect(types).toContain(`  "/shop/[category]": {
    params: { category: string };
    loaderData: LoaderDataOf<typeof import("../../app/shop/[category]/layout")>;
    actionData: ActionDataOf<typeof import("../../app/shop/[category]/layout")>;
  };`);
  });

  it("types loader args for every route path", () => {
    expect(types).toContain(`interface GraftParams {
  "/": {};
  "/shop/[category]": { category: string };
  "/shop/[category]/[item]": { category: string; item: string };
}`);
  });

  it("declares the global prop types", () => {
    expect(types).toContain("type PageProps<Route extends keyof GraftPages>");
    expect(types).toContain("type LayoutProps<Route extends keyof GraftLayouts>");
    expect(types).toContain("type LoaderProps<Route extends keyof GraftParams>");
    expect(types).toContain("type ActionProps<Route extends keyof GraftParams>");
  });
});

describe("generateServerEntry", () => {
  it("re-exports app/server.* when it exists", () => {
    expect(generateServerEntry("/project/app", "server.ts", "/")).toBe(
      `export { default } from "/project/app/server.ts";\nexport const base = "/";\n`,
    );
  });

  it("falls back to handing every request to handle()", () => {
    const code = generateServerEntry("/project/app", undefined, "/app/");
    expect(code).toContain(`import { handle } from "@phatjng/graft/server";`);
    expect(code).toContain("export default { fetch: (request) => handle(request) };");
    expect(code).toContain(`export const base = "/app/";`);
  });
});

describe("generateClientEntry", () => {
  it("starts Vite's client and Fast Refresh before anything else in dev", () => {
    const code = generateClientEntry("/project/app", undefined, { viteClient: "/@vite/client" });

    expect(code.split("\n")).toEqual([
      `import "/@vite/client";`,
      `import "@vitejs/plugin-react/preamble";`,
      `import { hydrate } from "@phatjng/graft/client";`,
      "hydrate();",
      "",
    ]);
  });

  it("runs app/client.* instead of hydrate() when it exists", () => {
    const code = generateClientEntry("/project/app", "client.tsx", undefined);

    expect(code).toBe(`import "/project/app/client.tsx";\n`);
  });
});

describe("generateBuildAssetsModule", () => {
  // Trimmed from a real `vite build` of examples/basic.
  const manifest: Manifest = {
    "_jsx-runtime.js": { file: "assets/jsx-runtime-1.js", imports: ["_runtime.js"] },
    "_runtime.js": { file: "assets/runtime-2.js" },
    "app/layout.tsx": {
      file: "assets/layout-3.js",
      imports: ["_jsx-runtime.js"],
      css: ["assets/layout-4.css"],
    },
    "app/page.tsx": {
      file: "assets/page-5.js",
      imports: ["virtual:graft/client", "_jsx-runtime.js"],
    },
    "virtual:graft/client": { file: "assets/client-6.js", isEntry: true, imports: ["_runtime.js"] },
  };
  const files = [
    { id: "layout", file: "layout.tsx" },
    { id: "page", file: "page.tsx" },
  ];

  async function load(base: string) {
    const code = generateBuildAssetsModule(manifest, files, "virtual:graft/client", base);

    return (await import(`data:text/javascript,${encodeURIComponent(code)}`)) as {
      clientEntry: string;
      getRouteAssets(ids: string[]): Promise<RouteAssets>;
    };
  }

  it("points at the hashed client entry", async () => {
    expect((await load("/")).clientEntry).toBe("/assets/client-6.js");
  });

  it("collects each route's CSS and every chunk it imports", async () => {
    const { getRouteAssets } = await load("/");

    expect(await getRouteAssets(["layout", "page"])).toEqual({
      stylesheets: ["/assets/layout-4.css"],
      modules: [
        "/assets/runtime-2.js",
        "/assets/layout-3.js",
        "/assets/jsx-runtime-1.js",
        "/assets/page-5.js",
        "/assets/client-6.js",
      ],
      precedence: "default",
    });
  });

  it("prefixes Vite's base", async () => {
    const { clientEntry, getRouteAssets } = await load("/app/");

    expect(clientEntry).toBe("/app/assets/client-6.js");
    expect((await getRouteAssets(["layout"])).stylesheets).toEqual(["/app/assets/layout-4.css"]);
  });
});
