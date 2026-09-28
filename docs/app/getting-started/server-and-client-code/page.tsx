import { Link } from "@phatjng/graft";

import { Code, Note } from "../../components";

export default function ServerAndClientCode() {
  return (
    <>
      <title>Server and client code · Graft</title>
      <h1>Server and client code</h1>
      <p>
        Every component in a Graft app renders twice: once on the server to produce HTML, and again
        in the browser to make that HTML interactive (<em>hydration</em>). Graft has no{" "}
        <code>"use client"</code> or <code>"use server"</code>: components can use state, effects
        and event handlers anywhere.
      </p>
      <Code file="app/counter.tsx">{`
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>;
}
`}</Code>

      <h2>What stays on the server</h2>
      <p>Three kinds of code never reach the browser:</p>
      <ol>
        <li>
          <strong>
            <code>loader</code> and <code>action</code> exports.
          </strong>{" "}
          Graft removes them from the browser build, along with any imports only they use.
        </li>
        <li>
          <strong>
            Modules named <code>*.server.ts</code>
          </strong>{" "}
          (or <code>.server.tsx</code>, <code>.server.js</code>...). If browser code imports one,
          the build fails and names the importing file.
        </li>
        <li>
          <strong>
            <code>app/server.ts</code>
          </strong>
          , the server entry.
        </li>
      </ol>

      <h2>
        Why <code>.server.ts</code> matters
      </h2>
      <p>
        Removing a loader also removes imports that nothing else uses. But some modules do work as
        soon as they're imported, like connecting to a database or reading secrets, and some are
        imported by accident from a component. Naming them <code>.server.ts</code> turns a leak into
        a build error:
      </p>
      <Code file="app/db.server.ts">{`
import { createClient } from "some-database";

export const db = createClient(process.env.DATABASE_URL);
`}</Code>
      <Code file="app/posts/page.tsx">{`
import { db } from "../db.server";

// Fine: only the loader uses db, and the loader is removed from the browser build.
export async function loader() {
  return { posts: await db.posts.findMany() };
}

export default function Posts({ loaderData }: PageProps<"/posts">) {
  // Using db here would fail the build: this component also runs in the browser.
  return <p>{loaderData.posts.length} posts</p>;
}
`}</Code>
      <Note>
        Put database clients, API keys and anything else secret in <code>.server.ts</code> files. It
        costs nothing and catches mistakes that are easy to miss in review.
      </Note>

      <h2>Hydration mismatches</h2>
      <p>
        Hydration expects the browser to render exactly what the server did. Anything that differs
        between the two, like <code>Math.random()</code>, <code>Date.now()</code> or the local time
        zone, causes a mismatch warning and the browser's version replaces the server's.
      </p>
      <p>
        Compute such values in a loader, so both sides use the same one, or format them the same way
        everywhere:
      </p>
      <Code file="app/format.ts">{`
export function formatDate(date: Date): string {
  // Without a fixed time zone, the server and the browser would each use their own.
  return date.toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
}
`}</Code>

      <h2>Browser-only code</h2>
      <p>
        Code that needs <code>window</code> or <code>document</code> belongs in an effect or an
        event handler, which only run in the browser. To run something once on every page load, use
        a custom <Link href="/api-reference/file-conventions/client">client entry</Link>.
      </p>
    </>
  );
}
