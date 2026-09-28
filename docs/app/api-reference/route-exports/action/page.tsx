import { Link } from "@phatjng/graft";

import { Code, Note } from "../../../components";

export default function ActionReference() {
  return (
    <>
      <title>action · Graft</title>
      <h1>action</h1>
      <p>
        An <code>action</code> is a function exported from a <code>page</code> or{" "}
        <code>layout</code> file. It runs on the server when a form is submitted to that file, and
        what it returns reaches the component as <code>actionData</code>.
      </p>
      <Code file="app/posts/[id]/edit/page.tsx">{`
import { redirect } from "@phatjng/graft";

import { requireUser } from "../../../session.server";
import { updatePost } from "../../../posts.server";

export async function action({ request, params }: ActionProps<"/posts/[id]/edit">) {
  const user = await requireUser(request);
  const form = await request.formData();

  const title = String(form.get("title") ?? "").trim();
  if (!title) return { error: "A title is required." };

  await updatePost(params.id, { title }, user);
  return redirect(\`/posts/\${params.id}\`, 303);
}
`}</Code>

      <h2>Arguments</h2>
      <p>
        Type the argument with <code>ActionProps&lt;"/route"&gt;</code>.
      </p>
      <h3>
        <code>request</code>
      </h3>
      <p>
        The incoming <code>Request</code>. Read the body yourself, usually with{" "}
        <code>await request.formData()</code>; Graft doesn't parse it for you, so JSON and other
        bodies work too.
      </p>
      <h3>
        <code>params</code>
      </h3>
      <p>The dynamic segments in the file's own path.</p>

      <h2>Return value</h2>
      <p>
        Data for the component, following the same rules as a loader's. Or return or throw{" "}
        <Link href="/api-reference/functions/redirect">
          <code>redirect()</code>
        </Link>
        .
      </p>

      <h2>Which action runs</h2>
      <p>
        Any request that isn't <code>GET</code> or <code>HEAD</code> runs exactly one action:
      </p>
      <ol>
        <li>
          If the URL has <code>?_graft_action=&lt;route id&gt;</code>, that file's action. A{" "}
          <Link href="/api-reference/components/form">
            <code>&lt;Form&gt;</code>
          </Link>{" "}
          adds this marker for you, naming the file that renders it.
        </li>
        <li>Otherwise, the page's action.</li>
      </ol>
      <p>
        A <strong>route ID</strong> is the file's path inside <code>app/</code> without its
        extension, like <code>dashboard/layout</code> or <code>blog/[slug]/page</code>.
      </p>
      <table>
        <thead>
          <tr>
            <th>Situation</th>
            <th>Response</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>The targeted file has no action</td>
            <td>
              <code>405</code>. Graft doesn't look for an action further up.
            </td>
          </tr>
          <tr>
            <td>The marker names a file that isn't part of the URL</td>
            <td>
              <code>400</code>
            </td>
          </tr>
          <tr>
            <td>The request comes from another site</td>
            <td>
              <code>403</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>After an action</h2>
      <ul>
        <li>
          <strong>Without JavaScript</strong>, the response is the page for the form's URL, rendered
          with fresh loader data and <code>actionData</code>.
        </li>
        <li>
          <strong>With JavaScript</strong>, the router runs the loaders of the page it's on again
          and renders them with <code>actionData</code>, without changing the URL.
        </li>
      </ul>

      <h2>CSRF protection</h2>
      <p>
        Before running an action, Graft checks that the request comes from your site: the host in
        its <code>Origin</code> header (or <code>Referer</code>, if there's no <code>Origin</code>)
        must match the request's host. Only the host is compared, because a proxy that terminates
        HTTPS makes requests arrive as <code>http://</code>. Requests with neither header don't come
        from a browser, and are allowed.
      </p>
      <Note>
        CSRF protection stops other sites from submitting forms as your users. It doesn't check who
        the user is: every action should still check that the user may do what they ask.
      </Note>
    </>
  );
}
