import { Link } from "@phatjng/graft";

import { Code } from "../../../components";

export default function ServeReference() {
  return (
    <>
      <title>serve · Graft</title>
      <h1>serve</h1>
      <p>
        <code>serve()</code> runs a <code>fetch</code> handler as a Node HTTP server, and serves
        static files in front of it. It's what{" "}
        <Link href="/api-reference/cli">
          <code>graft start</code>
        </Link>{" "}
        uses, for when you want to start the server from your own script.
      </p>
      <Code file="server.js">{`
import { serve } from "@phatjng/graft/node";

import app, { base } from "./dist/server/index.js";

const server = await serve(app, {
  client: "dist/client",
  base,
  port: Number(process.env.PORT ?? 3000),
});
console.log("Listening", server.address());
`}</Code>

      <h2>Signature</h2>
      <Code lang="ts">{`
function serve(app: FetchHandler, options?: ServeOptions): Promise<Server>;

interface FetchHandler {
  fetch(request: Request): Response | Promise<Response>;
}
`}</Code>
      <p>
        It resolves with Node's <code>http.Server</code> once it's listening.
      </p>

      <h2>Options</h2>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>client</code>
            </td>
            <td>none</td>
            <td>
              Folder of static files to serve before the app, usually <code>dist/client</code>.
              Files in its <code>assets/</code> folder are cached for a year, since their names
              change with their content.
            </td>
          </tr>
          <tr>
            <td>
              <code>base</code>
            </td>
            <td>
              <code>"/"</code>
            </td>
            <td>
              The URL path the static files live under: Vite's <code>base</code>. The server build
              exports it as <code>base</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>port</code>
            </td>
            <td>
              <code>3000</code>
            </td>
            <td>
              Port to listen on. <code>0</code> picks a free one.
            </td>
          </tr>
          <tr>
            <td>
              <code>host</code>
            </td>
            <td>all interfaces</td>
            <td>Host to listen on.</td>
          </tr>
        </tbody>
      </table>
      <p>
        Requests that don't match a static file go to <code>app.fetch</code> with their full URL. If
        it throws, the response is a plain <code>500</code>.
      </p>
    </>
  );
}
