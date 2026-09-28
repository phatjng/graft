import { Link } from "@phatjng/graft";

import { Code, Note } from "../../components";

export default function Deploying() {
  return (
    <>
      <title>Deploying · Graft</title>
      <h1>Deploying</h1>
      <p>A Graft app builds with Vite and runs on Node:</p>
      <Code>{`
vite build
graft start
`}</Code>

      <h2>What the build contains</h2>
      <Code>{`
dist/
  client/                 # files for the browser
    assets/               # hashed JS and CSS
    .vite/manifest.json   # read while building the server, never served
  server/
    index.js              # the server: export default { fetch }
`}</Code>
      <p>
        <code>dist/server/index.js</code> default-exports your app's <code>{"{ fetch }"}</code>{" "}
        handler: a function from a standard <code>Request</code> to a <code>Response</code>. It
        imports <code>react</code> and <code>react-dom</code> at runtime, so deploy it together with
        your <code>node_modules</code> (production dependencies are enough).
      </p>

      <h2>
        <code>graft start</code>
      </h2>
      <p>
        <code>graft start</code> serves the build with Node. Static files from{" "}
        <code>dist/client</code> are served first, with a long-lived cache for the hashed files in{" "}
        <code>assets/</code>; every other request goes to your app.
      </p>
      <Code>{`
graft start                  # serves ./dist on port 3000
graft start build --port 8080
PORT=8080 HOST=127.0.0.1 graft start
`}</Code>
      <p>
        It stops gracefully on <code>SIGINT</code> and <code>SIGTERM</code>, letting requests that
        are in progress finish. See the <Link href="/api-reference/cli">CLI reference</Link>.
      </p>
      <Note>
        <code>vite preview</code> only serves static files, and can't render Graft's pages. In a
        Graft app, it answers every request with a message pointing to <code>graft start</code>.
      </Note>

      <h2>Your own Node server</h2>
      <p>
        To add Graft to a server you control, import the build and hand it to{" "}
        <Link href="/api-reference/functions/serve">
          <code>serve()</code>
        </Link>
        , which is what <code>graft start</code> does:
      </p>
      <Code file="server.js">{`
import { serve } from "@phatjng/graft/node";

import app, { base } from "./dist/server/index.js";

await serve(app, { client: "dist/client", base, port: 3000 });
`}</Code>

      <h2>Vercel</h2>
      <p>
        Add the Vercel adapter to <code>graft()</code>:
      </p>
      <Code file="vite.config.ts">{`
import { graft } from "@phatjng/graft/vite";
import { vercel } from "@phatjng/graft/vercel";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [graft({ adapter: vercel() })],
});
`}</Code>
      <p>
        <code>vite build</code> now also writes <code>.vercel/output/</code>, in Vercel's{" "}
        <a href="https://vercel.com/docs/build-output-api">Build Output API</a> format, which Vercel
        deploys as it is:
      </p>
      <Code>{`
.vercel/output/
  config.json             # routing: static files first, then the function
  static/                 # dist/client, served by Vercel's CDN
  functions/
    index.func/           # dist/server, run as one Node.js function
`}</Code>
      <ul>
        <li>
          Every request that isn't a static file goes through your <code>app/server.ts</code>, in a
          Node.js 24 function with streaming responses.
        </li>
        <li>
          The server build bundles your npm dependencies, since Vercel doesn't install{" "}
          <code>node_modules</code> for the function. <code>dist/server/index.js</code> still works
          with <code>graft start</code>.
        </li>
        <li>
          Loaders and actions see the <code>https://</code> URL the browser asked for, taken from
          the <code>x-forwarded-proto</code> header that Vercel's proxy sets.
        </li>
        <li>
          The adapter changes nothing in development: <code>vite</code> runs as usual.
        </li>
      </ul>
      <p>
        In your Vercel project, set the build command to <code>vite build</code> (or your{" "}
        <code>build</code> script). Vercel picks up <code>.vercel/output/</code> once the build has
        written it. To build and deploy from your machine instead, use the Vercel CLI:
      </p>
      <Code>{`
vercel build
vercel deploy --prebuilt
`}</Code>
      <Note>
        Add <code>.vercel</code> to your <code>.gitignore</code>: it's build output. (The Vercel CLI
        also keeps its project link there.)
      </Note>

      <h2>Other runtimes</h2>
      <p>
        Graft's server code only uses web-standard APIs (<code>Request</code>, <code>Response</code>
        , streams), so the <code>fetch</code> handler isn't tied to Node. Node and Vercel are the
        only targets Graft ships adapters for today.
      </p>

      <h2>Errors in production</h2>
      <p>
        In development, errors from loaders, actions and rendering show Vite's error overlay with a
        stack trace. In a production build, Graft logs the error on the server and answers with a
        plain <code>500</code> page that doesn't reveal anything about it. Unknown URLs get a plain{" "}
        <code>404</code> page.
      </p>

      <h2>Serving from a sub-path</h2>
      <p>
        To serve the app under a path like <code>/docs/</code>, set Vite's <code>base</code>. See{" "}
        <Link href="/api-reference/vite-plugin">Vite plugin</Link>.
      </p>
    </>
  );
}
