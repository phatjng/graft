import { Code } from "../../components";

export default function Cli() {
  return (
    <>
      <title>CLI · Graft</title>
      <h1>CLI</h1>
      <p>
        Graft uses Vite's commands for development and builds, and adds a small <code>graft</code>{" "}
        command for what Vite doesn't do.
      </p>
      <table>
        <thead>
          <tr>
            <th>Command</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>vite</code>
            </td>
            <td>Start the dev server, with hot reloading</td>
          </tr>
          <tr>
            <td>
              <code>vite build</code>
            </td>
            <td>
              Build the browser files and the server into <code>dist/</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>graft start</code>
            </td>
            <td>Serve a production build with Node</td>
          </tr>
          <tr>
            <td>
              <code>graft typegen</code>
            </td>
            <td>Write route types without starting Vite</td>
          </tr>
        </tbody>
      </table>

      <h2>
        <code>graft start</code>
      </h2>
      <Code>{`
graft start [dir] [--port <port>] [--host <host>]
`}</Code>
      <p>
        Serves the build in <code>dir</code> (default: <code>dist</code>). Static files from{" "}
        <code>dir/client</code> are served first, under Vite's <code>base</code>; every other
        request goes to <code>dir/server/index.js</code>.
      </p>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Default</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>-p</code>, <code>--port</code>
            </td>
            <td>
              <code>$PORT</code>, or <code>3000</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>--host</code>
            </td>
            <td>
              <code>$HOST</code>, or all interfaces
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        On <code>SIGINT</code> or <code>SIGTERM</code>, it stops accepting connections and exits
        once in-flight requests have finished. It doesn't need Vite installed, so it runs with only
        your production dependencies.
      </p>

      <h2>
        <code>graft typegen</code>
      </h2>
      <Code>{`
graft typegen [root]
`}</Code>
      <p>
        Writes route types to <code>.graft/types/</code> for the app in <code>root</code> (default:
        the current folder), the same way <code>vite</code> does. It loads your Vite config, so it
        respects its <code>root</code>. Run it before <code>tsc</code> on a fresh clone or in CI:
      </p>
      <Code file="package.json">{`
{
  "scripts": {
    "typecheck": "graft typegen && tsc --noEmit"
  }
}
`}</Code>
      <p>
        It fails with a message if <code>app/</code> is invalid, for example when two dynamic
        folders sit side by side.
      </p>

      <h2>
        <code>vite preview</code>
      </h2>
      <p>
        <code>vite preview</code> serves static files only, so it can't render a Graft app. It
        answers every request with a message pointing to <code>graft start</code>.
      </p>
    </>
  );
}
