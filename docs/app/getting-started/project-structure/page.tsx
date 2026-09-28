import { Link } from "@phatjng/graft";

import { Code } from "../../components";

export default function ProjectStructure() {
  return (
    <>
      <title>Project structure · Graft</title>
      <h1>Project structure</h1>
      <p>
        A Graft app is a Vite app with an <code>app/</code> folder:
      </p>
      <Code>{`
vite.config.ts          # plugins: [graft()], the only config file
app/
  server.ts             # optional server entry
  client.ts             # optional client entry
  layout.tsx            # root layout: renders <html> and <body>
  page.tsx              # /
  about/
    page.tsx            # /about
  blog/
    layout.tsx          # layout for /blog and everything under it
    page.tsx            # /blog
    [slug]/
      page.tsx          # /blog/hello-world, /blog/another-post, ...
  posts.server.ts       # server-only module
  button.tsx            # any other file: not a route
`}</Code>

      <h2>Routing files</h2>
      <p>Only two file names create routes:</p>
      <table>
        <tbody>
          <tr>
            <td>
              <Link href="/api-reference/file-conventions/page">
                <code>page</code>
              </Link>
            </td>
            <td>The UI for a URL. A folder without one isn't a URL of its own.</td>
          </tr>
          <tr>
            <td>
              <Link href="/api-reference/file-conventions/layout">
                <code>layout</code>
              </Link>
            </td>
            <td>UI shared by a folder's page and every page below it.</td>
          </tr>
        </tbody>
      </table>
      <p>
        Each can end in <code>.tsx</code>, <code>.ts</code>, <code>.jsx</code> or <code>.js</code>.
      </p>

      <h2>Everything else is yours</h2>
      <p>
        Components, utilities, CSS and tests can sit next to the routing files. They never become
        routes, so you don't need a separate folder for them.
      </p>

      <h2>Reserved files</h2>
      <table>
        <tbody>
          <tr>
            <td>
              <Link href="/api-reference/file-conventions/server">
                <code>app/server.ts</code>
              </Link>
            </td>
            <td>
              The server entry: a <code>fetch</code> handler that every request goes through.
            </td>
          </tr>
          <tr>
            <td>
              <Link href="/api-reference/file-conventions/client">
                <code>app/client.ts</code>
              </Link>
            </td>
            <td>The client entry: runs in the browser and hydrates the page.</td>
          </tr>
          <tr>
            <td>
              <Link href="/api-reference/file-conventions/server-only-modules">
                <code>*.server.ts</code>
              </Link>
            </td>
            <td>Modules that must never reach the browser.</td>
          </tr>
        </tbody>
      </table>
      <p>
        Both entries are optional. Without them, Graft uses built-in ones that do the usual thing.
      </p>

      <h2>Folder names</h2>
      <ul>
        <li>
          A folder name is a URL segment: <code>app/about/page.tsx</code> is <code>/about</code>.
          URLs are case-sensitive.
        </li>
        <li>
          <code>[name]</code> is a{" "}
          <Link href="/api-reference/file-conventions/dynamic-segments">dynamic segment</Link>.
        </li>
        <li>
          Syntax Graft doesn't support yet, like <code>[...slug]</code>, <code>[[...slug]]</code>,{" "}
          <code>(group)</code> and <code>@slot</code>, is an error rather than a plain folder name.
          That way, supporting it later won't change what your app does.
        </li>
      </ul>

      <h2>Generated files</h2>
      <p>
        Graft writes route types to <code>.graft/types/</code> and Vite builds into{" "}
        <code>dist/</code>. Keep both out of version control.
      </p>
    </>
  );
}
