import { Link } from "@phatjng/graft";

import { Code } from "../../../components";

export default function ServerOnlyModules() {
  return (
    <>
      <title>*.server.ts · Graft</title>
      <h1>*.server.ts</h1>
      <p>
        A module whose name ends in <code>.server</code> before its extension, like{" "}
        <code>db.server.ts</code> or <code>secrets.server.js</code>, is server-only. It can be
        imported from loaders, actions, <code>app/server.ts</code> and other server-only modules. If
        code that runs in the browser imports it, <code>vite build</code> fails and names the
        importing file.
      </p>
      <Code file="app/db.server.ts">{`
import { createClient } from "some-database";

export const db = createClient(process.env.DATABASE_URL);
`}</Code>

      <h2>Where it can be imported</h2>
      <Code file="app/posts/page.tsx">{`
import { db } from "../db.server";

// Allowed: loaders and actions are removed from the browser build, and
// so are imports that only they use.
export async function loader() {
  return { count: await db.posts.count() };
}

export default function Posts({ loaderData }: PageProps<"/posts">) {
  // Not allowed: using db here keeps the import in the browser build,
  // which fails.
  return <p>{loaderData.count} posts</p>;
}
`}</Code>

      <h2>Why use it</h2>
      <p>
        Graft already removes loaders and actions from the browser build, along with imports that
        only they use. <code>.server</code> covers what that can't:
      </p>
      <ul>
        <li>a component that imports server code by mistake,</li>
        <li>
          a module imported only for its side effects (<code>import "./setup.server"</code>),
        </li>
        <li>and a shared helper that pulls in something secret through a chain of imports.</li>
      </ul>
      <p>
        See <Link href="/getting-started/server-and-client-code">Server and client code</Link>.
      </p>
    </>
  );
}
