import { Link } from "@phatjng/graft";

import { Code } from "../../../components";

export default function HandleReference() {
  return (
    <>
      <title>handle · Graft</title>
      <h1>handle</h1>
      <p>
        <code>handle()</code> answers a request with your Graft app: it matches the URL, runs
        loaders or an action, and renders the page. Call it from{" "}
        <Link href="/api-reference/file-conventions/server">
          <code>app/server.ts</code>
        </Link>
        .
      </p>
      <Code file="app/server.ts">{`
import { handle } from "@phatjng/graft/server";

export default {
  fetch: (request: Request) => handle(request),
};
`}</Code>

      <h2>Signature</h2>
      <Code>{`
function handle(request: Request): Promise<Response>;
`}</Code>
      <p>
        It takes a standard <code>Request</code> and resolves with a <code>Response</code>. Page
        HTML is streamed: the response can resolve before the whole page has rendered. The Vite
        plugin provides your routes, so <code>handle</code> needs nothing else.
      </p>

      <h2>Responses</h2>
      <table>
        <thead>
          <tr>
            <th>Request</th>
            <th>Response</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>GET</code>/<code>HEAD</code> for a page
            </td>
            <td>The rendered page, with its loader data embedded</td>
          </tr>
          <tr>
            <td>Any other method</td>
            <td>The result of one action (see the action reference)</td>
          </tr>
          <tr>
            <td>A loader or action redirects</td>
            <td>
              A <code>3xx</code> with a <code>Location</code> header
            </td>
          </tr>
          <tr>
            <td>No route matches</td>
            <td>
              A plain <code>404</code> page
            </td>
          </tr>
          <tr>
            <td>A non-GET request from another site</td>
            <td>
              <code>403</code>
            </td>
          </tr>
          <tr>
            <td>An error, in production</td>
            <td>
              The error is logged and a plain <code>500</code> page is returned
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        In development, errors are thrown instead, so Vite can show them with their stack trace.
      </p>
    </>
  );
}
