import { describe, expect, it } from "vitest";

import { stripServerExports } from "./strip";

const strip = (code: string, filename = "page.tsx"): string | null =>
  stripServerExports(code, filename)?.code ?? null;

describe("stripServerExports", () => {
  it("leaves files without a loader or action alone", () => {
    expect(strip(`export default function Page() { return <p>hi</p>; }`)).toBeNull();
    // Mentions the word but doesn't export it.
    expect(strip(`const loader = 1;\nexport default () => loader;`)).toBeNull();
  });

  it("removes loader and action, and the imports only they use", () => {
    const code = `import { db } from "./db";
import { format } from "./format";

export async function loader() {
  return db.get();
}

export const action = async () => db.set(format(1));

export default function Page() {
  return <p>hi</p>;
}
`;

    expect(strip(code)).toBe(`export default function Page() {
  return <p>hi</p>;
}
`);
  });

  it("keeps imports the component also uses", () => {
    const code = `import { db, formatDate } from "./lib";
export function loader() { return db.get(); }
export default function Page() { return <p>{formatDate()}</p>; }
`;

    expect(strip(code)).toBe(`import { formatDate } from "./lib";
export default function Page() { return <p>{formatDate()}</p>; }
`);
  });

  it("removes helpers only the loader uses, transitively", () => {
    const code = `import { query } from "./db";
const table = "posts";
function getPosts() { return query(table); }
export function loader() { return getPosts(); }
export default function Page() { return null; }
`;

    expect(strip(code)).toBe(`export default function Page() { return null; }
`);
  });

  it("keeps helpers still used by the component", () => {
    const code = `const title = "Blog";
export function loader() { return title; }
export default function Page() { return <h1>{title}</h1>; }
`;

    expect(strip(code)).toBe(`const title = "Blog";
export default function Page() { return <h1>{title}</h1>; }
`);
  });

  it("isn't fooled by a shadowed name in the component", () => {
    const code = `import { db } from "./db";
export function loader() { return db.get(); }
export default function Page() {
  const db = { name: "local" };
  return <p>{db.name}</p>;
}
`;

    expect(strip(code)).not.toContain(`from "./db"`);
  });

  it("counts JSX elements as references", () => {
    const code = `import { Chart } from "./chart";
import { ui } from "./ui";
import { fetchStats } from "./stats";
export function loader() { return fetchStats(); }
export default function Page() { return <ui.Card><Chart /></ui.Card>; }
`;

    const output = strip(code)!;
    expect(output).toContain(`import { Chart } from "./chart";`);
    expect(output).toContain(`import { ui } from "./ui";`);
    expect(output).not.toContain("fetchStats");
  });

  it("leaves side-effect imports and code that was already unused alone", () => {
    const code = `import "./styles.css";
import { unused } from "./other";
import { db } from "./db";
export function loader() { return db.get(); }
export default function Page() { return null; }
`;

    expect(strip(code)).toBe(`import "./styles.css";
import { unused } from "./other";
export default function Page() { return null; }
`);
  });

  it("keeps default and namespace imports when trimming named ones", () => {
    const code = `import React, { useState, useEffect } from "react";
import * as db from "./db";
export function loader() { useEffect; return db.all(); }
export default function Page() { const [x] = useState(React.version); return x; }
`;

    const output = strip(code)!;
    expect(output).toContain(`import React, { useState } from "react";`);
    expect(output).not.toContain("./db");
  });

  it("removes only the server declarator from a shared declaration", () => {
    const code = `export const title = "Hi", loader = () => title;
export default function Page() { return title; }
`;

    expect(strip(code)).toBe(`export const title = "Hi";
export default function Page() { return title; }
`);
  });

  it("handles loader exported under another name", () => {
    const code = `import { db } from "./db";
function getData() { return db.get(); }
export { getData as loader };
export default function Page() { return null; }
`;

    expect(strip(code)).toBe(`export default function Page() { return null; }
`);
  });

  it("removes re-exported loaders", () => {
    const code = `export { loader, helper } from "./server";
export default function Page() { return null; }
`;

    expect(strip(code)).toBe(`export { helper } from "./server";
export default function Page() { return null; }
`);
  });

  it("removes destructured bindings only the loader uses", () => {
    const code = `import { config } from "./config";
const { secret, publicName } = config;
export function loader() { return secret; }
export default function Page() { return publicName; }
`;

    // The declarator also binds publicName, which the component uses, so it stays.
    expect(strip(code)).toContain("const { secret, publicName } = config;");

    const onlyServer = `import { config } from "./config";
const { secret } = config;
export function loader() { return secret; }
export default function Page() { return null; }
`;

    expect(strip(onlyServer)).toBe(`export default function Page() { return null; }
`);
  });

  it("ignores type-only imports", () => {
    const code = `import type { Post } from "./db";
import { db } from "./db";
export async function loader(): Promise<Post> { return db.get(); }
export default function Page(props: { post: Post }) { return null; }
`;

    const output = strip(code)!;
    expect(output).toContain(`import type { Post } from "./db";`);
    expect(output).not.toContain(`import { db }`);
  });

  it("fails when browser code calls the loader", () => {
    const code = `export function loader() { return 1; }
export default function Page() { return <button onClick={() => loader()} />; }
`;

    expect(() => strip(code)).toThrow(`"loader" is used by code that runs in the browser`);
  });

  it("returns a source map", () => {
    const result = stripServerExports(
      `export function loader() {}\nexport default () => null;\n`,
      "page.tsx",
    );

    expect(result?.map.sources).toEqual(["page.tsx"]);
  });
});
