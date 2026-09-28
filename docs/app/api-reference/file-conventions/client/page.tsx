import { Link } from "@phatjng/graft";

import { Code } from "../../../components";

export default function ClientEntry() {
  return (
    <>
      <title>client.ts · Graft</title>
      <h1>client.ts</h1>
      <p>
        <code>app/client.ts</code> is the client entry: the first of your code to run in the
        browser, on every full page load. It calls{" "}
        <Link href="/api-reference/functions/hydrate">
          <code>hydrate()</code>
        </Link>{" "}
        to make the server-rendered page interactive.
      </p>
      <Code file="app/client.ts">{`
import { hydrate } from "@phatjng/graft/client";

hydrate();
`}</Code>
      <p>
        The file is optional. Without it, Graft uses a built-in entry that does exactly this. It can
        be <code>client.ts</code>, <code>client.tsx</code>, <code>client.js</code> or{" "}
        <code>client.jsx</code>.
      </p>

      <h2>Running code before hydration</h2>
      <p>
        Use it for browser-wide setup, like error reporting or analytics, that should run once per
        page load rather than in a component:
      </p>
      <Code file="app/client.ts">{`
import { hydrate } from "@phatjng/graft/client";

import { initErrorReporting } from "./error-reporting";

initErrorReporting();
hydrate();
`}</Code>
      <p>
        If your <code>client.ts</code> doesn't call <code>hydrate()</code>, the page stays as the
        server rendered it: links and forms still work, as plain HTML.
      </p>
    </>
  );
}
