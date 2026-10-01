import { Link } from "@phatjng/graft";

import { Code, Note } from "../../../components";

export default function LoaderReference() {
  return (
    <>
      <title>loader · Graft</title>
      <h1>loader</h1>
      <p>
        A <code>loader</code> is a function exported from a <code>page</code> or <code>layout</code>{" "}
        file. It runs on the server and returns the data the file's component receives as{" "}
        <code>loaderData</code>.
      </p>
      <Code file="app/blog/[slug]/page.tsx">{`
import { redirect } from "@phatjng/graft";

import { getPost } from "../../posts.server";

export async function loader({ params, request }: LoaderProps<"/blog/[slug]">) {
  const post = await getPost(params.slug);
  if (post?.movedTo) throw redirect(\`/blog/\${post.movedTo}\`, 301);
  return { post };
}
`}</Code>

      <h2>Arguments</h2>
      <p>
        Type the argument with <code>LoaderProps&lt;"/route"&gt;</code>.
      </p>
      <h3>
        <code>request</code>
      </h3>
      <p>
        The incoming <code>Request</code>, for headers and the query string. Its URL is the page's
        real URL, including Vite's <code>base</code> if you set one. Graft's own query parameters (
        <code>_graft_data</code>, <code>_graft_action</code>) are removed.
      </p>
      <h3>
        <code>params</code>
      </h3>
      <p>
        The dynamic segments in the file's <strong>own</strong> path. A layout's loader doesn't see
        the params of pages below it.
      </p>
      <h3>
        <code>cookies</code>
      </h3>
      <p>
        The request's{" "}
        <Link href="/api-reference/cookies">
          <code>cookies</code>
        </Link>
        . A loader can set cookies as well as read them: every loader finishes before the page
        starts streaming.
      </p>

      <h2>Return value</h2>
      <p>
        Data for the component, which may be a <code>Promise</code>. It's sent to the browser with{" "}
        <a href="https://github.com/sveltejs/devalue">devalue</a>, so these arrive intact and with
        their types: plain objects and arrays, strings, numbers, booleans, <code>null</code>,{" "}
        <code>undefined</code>, <code>Date</code>, <code>Map</code>, <code>Set</code>,{" "}
        <code>BigInt</code>, <code>RegExp</code>, <code>URL</code>, and repeated references.
        Functions and class instances are an error.
      </p>
      <p>
        To redirect, return or throw{" "}
        <Link href="/api-reference/functions/redirect">
          <code>redirect()</code>
        </Link>
        . Any other <code>Response</code> is an error.
      </p>

      <h2>When it runs</h2>
      <ul>
        <li>
          On a <code>GET</code> or <code>HEAD</code> request for the page, before rendering.
        </li>
        <li>On a client navigation to the page, through a data request.</li>
        <li>After any action on the page, to refresh the data.</li>
      </ul>
      <p>
        The loaders of every matched layout and the page run <strong>in parallel</strong>. If more
        than one redirects or throws, the outermost wins: a root layout's redirect beats a page's
        error.
      </p>

      <h2>Errors</h2>
      <p>
        If a loader throws something other than a redirect, the page fails to render. In development
        you see Vite's error overlay; in production, Graft logs the error and responds with a plain{" "}
        <code>500</code> page.
      </p>

      <Note>
        The data is embedded in the page's HTML, where anyone can read it. Don't return secrets, and
        prefer returning only the fields the component uses.
      </Note>

      <h2>Data requests</h2>
      <p>
        During client navigation, the router fetches loader data from the page's own URL plus{" "}
        <code>?_graft_data=1</code>. You don't need to call it yourself, but you'll see these
        requests in your browser's network panel. Redirects travel inside the response rather than
        as a real <code>3xx</code>, so the router can follow them itself.
      </p>
    </>
  );
}
