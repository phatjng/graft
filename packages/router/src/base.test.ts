import { describe, expect, it } from "vitest";

import { stripBase, withBase } from "./base";

describe("withBase", () => {
  it("adds the base to paths inside the app", () => {
    expect(withBase("/", "/app")).toBe("/app/");
    expect(withBase("/blog?page=2#top", "/app")).toBe("/app/blog?page=2#top");
  });

  it("leaves full and relative URLs alone", () => {
    for (const href of ["https://example.com/", "//cdn.example.com/x", "../blog", "?q=1", "#top"]) {
      expect(withBase(href, "/app")).toBe(href);
    }
  });

  it("does nothing without a base", () => {
    expect(withBase("/blog", "")).toBe("/blog");
  });
});

describe("stripBase", () => {
  it("returns the path inside the app", () => {
    expect(stripBase("/app/blog", "/app")).toBe("/blog");
    expect(stripBase("/app/", "/app")).toBe("/");
    expect(stripBase("/app", "/app")).toBe("/");
  });

  it("returns null outside the app", () => {
    expect(stripBase("/blog", "/app")).toBeNull();
    expect(stripBase("/application", "/app")).toBeNull();
  });

  it("does nothing without a base", () => {
    expect(stripBase("/blog", "")).toBe("/blog");
  });
});
