import { Link } from "@phatjng/graft";

import { Code, Note } from "../../components";

export default function VitePlugin() {
  return (
    <>
      <title>Vite plugin · Graft</title>
      <h1>Vite plugin</h1>
      <p>
        Graft is configured in <code>vite.config.ts</code>, through its Vite plugin. There's no
        separate Graft config file.
      </p>
      <Code file="vite.config.ts">{`
import { graft } from "@phatjng/graft/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [graft()],
});
`}</Code>
      <p>
        <code>graft()</code> includes <code>@vitejs/plugin-react</code> (for JSX and Fast Refresh),
        so don't add that plugin yourself.
      </p>

      <h2>Options</h2>
      <h3>
        <code>adapter</code>
      </h3>
      <p>
        Builds the app for a host. Without one, <code>vite build</code> writes <code>dist/</code>{" "}
        for <code>graft start</code>. The only adapter today is Vercel's:
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
        With an adapter, the server build bundles its npm dependencies, and <code>vite build</code>{" "}
        finishes by writing the host's format. See{" "}
        <Link href="/getting-started/deploying">Deploying</Link>.
      </p>
      <h3>
        <code>poweredByHeader</code>
      </h3>
      <p>
        Responses from Graft include an <code>X-Powered-By: Graft</code> header. Set{" "}
        <code>poweredByHeader: false</code> to leave it out:
      </p>
      <Code file="vite.config.ts">{`
import { graft } from "@phatjng/graft/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [graft({ poweredByHeader: false })],
});
`}</Code>
      <p>
        It's on every response from{" "}
        <Link href="/api-reference/functions/handle">
          <code>handle()</code>
        </Link>
        , in development and production. Static files are served without it.
      </p>

      <h2>What the plugin does</h2>
      <ul>
        <li>
          Finds the routes in <code>app/</code>, and updates them as files are added or removed.
        </li>
        <li>
          Writes route types to <code>.graft/types/</code>.
        </li>
        <li>
          Renders pages in the dev server, through <code>app/server.ts</code>.
        </li>
        <li>
          Removes <code>loader</code> and <code>action</code> from the browser build, and fails the
          build if browser code imports a <code>.server.ts</code> module.
        </li>
        <li>
          Makes <code>vite build</code> produce both the browser files (<code>dist/client</code>)
          and the server (<code>dist/server/index.js</code>).
        </li>
      </ul>

      <h2>Other Vite options</h2>
      <p>
        The rest of your Vite config works as usual: other plugins, <code>resolve.alias</code>,{" "}
        <code>css</code>, <code>server.port</code> and so on.
      </p>

      <h2>
        <code>base</code>: serving from a sub-path
      </h2>
      <p>
        Vite's <code>base</code> mounts the whole app under a path, in development and under{" "}
        <code>graft start</code>:
      </p>
      <Code file="vite.config.ts">{`
export default defineConfig({
  base: "/docs/",
  plugins: [graft()],
});
`}</Code>
      <p>
        <code>app/blog/page.tsx</code> now answers <code>/docs/blog</code>. Inside the app, keep
        writing paths without the base; Graft adds it for you:
      </p>
      <Code lang="tsx">{`
<Link href="/blog">Blog</Link>          // links to /docs/blog
<Form method="post" action="/login">    // posts to /docs/login
redirect("/login")                      // redirects to /docs/login
`}</Code>
      <ul>
        <li>Full URLs and relative paths are left alone.</li>
        <li>
          Loaders and actions see the real URL, base included, in <code>request.url</code>.
        </li>
        <li>
          A full-URL base (like <code>https://cdn.example.com/docs/</code>, to serve assets from a
          CDN) mounts the app at that URL's path, <code>/docs/</code>.
        </li>
        <li>
          A relative base (<code>./</code>) fails the build: pages at different depths can't share
          one relative path.
        </li>
      </ul>
      <Note>
        In your own code, <code>import.meta.env.BASE_URL</code> holds the base, as in any Vite app.
      </Note>
    </>
  );
}
