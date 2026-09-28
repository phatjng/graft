import { Link } from "@phatjng/graft";

import { Code } from "./components";

export default function Introduction() {
  return (
    <>
      <title>Introduction · Graft</title>
      <h1>Introduction</h1>
      <p>
        Graft is a React framework built on <a href="https://vite.dev">Vite</a>. You put pages and
        layouts in an <code>app/</code> folder, and Graft renders them on the server, loads their
        data, handles form submissions, and makes navigation between them fast.
      </p>
      <Code file="app/blog/[slug]/page.tsx">{`
import { getPost } from "../../posts.server";

export async function loader({ params }: LoaderProps<"/blog/[slug]">) {
  return { post: await getPost(params.slug) };
}

export default function Post({ loaderData }: PageProps<"/blog/[slug]">) {
  return <h1>{loaderData.post.title}</h1>;
}
`}</Code>
      <p>That file is a whole route. It:</p>
      <ul>
        <li>
          answers <code>/blog/hello-world</code>, <code>/blog/another-post</code> and so on,
        </li>
        <li>loads its data on the server, where the database is,</li>
        <li>renders to HTML on the server, then becomes interactive in the browser,</li>
        <li>and knows the types of its URL params and its data, with no annotations.</li>
      </ul>

      <h2>What's in the box</h2>
      <ul>
        <li>
          <strong>File-based routing</strong> with nested layouts and dynamic segments.
        </li>
        <li>
          <strong>Server rendering</strong> with streaming and hydration.
        </li>
        <li>
          <strong>Data loading and mutations</strong> with <code>loader</code> and{" "}
          <code>action</code> exports, and a <code>&lt;Form&gt;</code> that works with or without
          JavaScript.
        </li>
        <li>
          <strong>Client-side navigation</strong> with <code>&lt;Link&gt;</code>, which prefetches
          code and restores scroll positions.
        </li>
        <li>
          <strong>A production server</strong>: <code>vite build</code> produces a portable{" "}
          <code>fetch</code> handler, and <code>graft start</code> serves it with Node.
        </li>
      </ul>

      <h2>What it isn't</h2>
      <p>
        Graft doesn't support React Server Components, and there are no <code>"use client"</code> or{" "}
        <code>"use server"</code> directives. Every component renders on the server and in the
        browser. Code that must stay on the server lives in a <code>loader</code>, an{" "}
        <code>action</code>, or a <code>.server.ts</code> file.
      </p>
      <p>
        Graft also isn't a bundler. Vite does the bundling, the dev server and hot reloading. Graft
        is a Vite plugin and a small runtime on top.
      </p>

      <h2>Status</h2>
      <p>
        Graft hasn't had its first release yet. These docs describe what works today, and they're
        rendered by Graft itself.
      </p>
      <p>
        Next: <Link href="/getting-started/installation">install Graft</Link>.
      </p>
    </>
  );
}
