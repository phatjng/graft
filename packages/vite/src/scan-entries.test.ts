import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { findEntryFile } from "./scan";

let dir: string | undefined;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

function appDir(files: string[]): string {
  dir = mkdtempSync(path.join(tmpdir(), "graft-entries-"));
  for (const file of files) writeFileSync(path.join(dir, file), "");

  return dir;
}

describe("findEntryFile", () => {
  it("finds app/server.* and app/client.* with any supported extension", () => {
    const app = appDir(["server.ts", "client.jsx"]);

    expect(findEntryFile(app, "server")).toBe("server.ts");
    expect(findEntryFile(app, "client")).toBe("client.jsx");
  });

  it("returns undefined when the app uses the built-in entry", () => {
    expect(findEntryFile(appDir(["page.tsx"]), "server")).toBeUndefined();
  });

  it("rejects two entries with different extensions", () => {
    expect(() => findEntryFile(appDir(["server.ts", "server.js"]), "server")).toThrow(
      "app/server.ts and app/server.js are both the server entry",
    );
  });
});
