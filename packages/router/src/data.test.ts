import { describe, expect, it } from "vitest";

import { parseDataResponse, readPageData, serializeDataResponse, serializePageData } from "./data";

describe("serializePageData", () => {
  it("escapes every < so data can't close the script tag", () => {
    const data = {
      loaderData: { page: { html: "</script><script>alert(1)</script><!--" } },
      actionData: {},
    };

    const script = serializePageData(data);
    expect(script).not.toContain("<");

    // It's still valid JavaScript, and the browser reads back the original string.
    globalThis.__graftData = new Function(
      `const self = {}; ${script}; return self.__graftData;`,
    )() as string;

    expect(readPageData()).toEqual(data);

    globalThis.__graftData = undefined;
  });

  it("names the route and path of a value that can't be sent", () => {
    expect(() =>
      serializePageData({ loaderData: { "blog/page": { onClick: () => {} } }, actionData: {} }),
    ).toThrow(/can't be sent to the browser.*blog\/page.*onClick/);
  });
});

describe("data responses", () => {
  it("round-trip data with its types", () => {
    const date = new Date("2026-01-01T00:00:00Z");
    const parsed = parseDataResponse(
      serializeDataResponse({ loaderData: { page: { date, tags: new Set(["a"]) } } }),
    );

    expect(parsed).toEqual({ loaderData: { page: { date, tags: new Set(["a"]) } } });
  });

  it("round-trip redirects", () => {
    expect(parseDataResponse(serializeDataResponse({ redirect: "/login" }))).toEqual({
      redirect: "/login",
    });
  });
});
