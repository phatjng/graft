import { describe, expect, it } from "vitest";

import { addTypesInclude } from "./tsconfig";

describe("addTypesInclude", () => {
  it("appends the types folder to include", () => {
    const result = addTypesInclude(`{ "include": ["app"] }`);

    expect(result).toEqual({
      status: "updated",
      text: `{\n  "include": [\n    "app",\n    ".graft/types/**/*.ts"\n  ]\n}\n`,
    });
  });

  it("leaves a tsconfig that already includes it alone", () => {
    expect(addTypesInclude(`{ "include": ["app", ".graft/types/**/*.ts"] }`)).toEqual({
      status: "unchanged",
    });
  });

  it("keeps the default include-everything meaning when include is missing", () => {
    const result = addTypesInclude(`{ "compilerOptions": {} }`);

    expect(result.status === "updated" && JSON.parse(result.text).include).toEqual([
      "**/*",
      ".graft/types/**/*.ts",
    ]);
  });

  it("doesn't rewrite a tsconfig with comments", () => {
    expect(addTypesInclude(`{\n  // mine\n  "include": ["app"]\n}`)).toEqual({
      status: "unparseable",
    });
  });
});
