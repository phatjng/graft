import { Link } from "@phatjng/graft";

import { Code } from "../../../components";

export default function HydrateReference() {
  return (
    <>
      <title>hydrate · Graft</title>
      <h1>hydrate</h1>
      <p>
        <code>hydrate()</code> makes the server-rendered page interactive. Call it from{" "}
        <Link href="/api-reference/file-conventions/client">
          <code>app/client.ts</code>
        </Link>
        .
      </p>
      <Code file="app/client.ts">{`
import { hydrate } from "@phatjng/graft/client";

hydrate();
`}</Code>

      <h2>Signature</h2>
      <Code>{`
function hydrate(): Promise<void>;
`}</Code>

      <h2>What it does</h2>
      <p>
        The server has already sent the page's HTML. <em>Hydration</em> renders the same React tree
        in the browser and attaches it to that HTML (event handlers, state and effects) instead of
        creating new elements. To build the same tree, <code>hydrate()</code>:
      </p>
      <ol>
        <li>matches the current URL against your routes,</li>
        <li>imports the matched layouts and page,</li>
        <li>reads the loader data the server embedded in the HTML,</li>
        <li>
          and hydrates the whole <code>document</code>, then starts handling client navigation.
        </li>
      </ol>
      <p>
        The promise resolves once hydration has started. On Graft's built-in 404 and 500 pages,
        there's nothing to hydrate, and it does nothing.
      </p>
    </>
  );
}
