import { Link } from "@phatjng/graft";

import { Code, Note } from "../../components";

export default function UpdatingData() {
  return (
    <>
      <title>Updating data · Graft</title>
      <h1>Updating data</h1>
      <p>
        To change data, export an <code>action</code> from a page or layout and submit a{" "}
        <code>&lt;Form&gt;</code> to it. The action runs on the server, then Graft runs the loaders
        again so the page shows the result.
      </p>
      <Code file="app/guestbook/page.tsx">{`
import { Form } from "@phatjng/graft";

import { addEntry, listEntries } from "../guestbook.server";

export async function loader() {
  return { entries: await listEntries() };
}

export async function action({ request }: ActionProps<"/guestbook">) {
  const form = await request.formData();

  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Please write your name." };

  await addEntry(name);
  return { signed: name };
}

export default function Guestbook({ loaderData, actionData }: PageProps<"/guestbook">) {
  return (
    <main>
      <Form method="post">
        <input name="name" />
        <button type="submit">Sign</button>
      </Form>
      {actionData && "error" in actionData && <p role="alert">{actionData.error}</p>}
      <ul>
        {loaderData.entries.map((entry) => (
          <li key={entry.id}>{entry.name}</li>
        ))}
      </ul>
    </main>
  );
}
`}</Code>

      <h2>With and without JavaScript</h2>
      <p>
        <code>&lt;Form&gt;</code> renders a real <code>&lt;form&gt;</code>, so the same code works
        either way:
      </p>
      <ul>
        <li>
          <strong>Without JavaScript</strong> (or before the page has hydrated), the browser submits
          the form. The server runs the action and answers with the page, rendered with fresh loader
          data and the action's result.
        </li>
        <li>
          <strong>With JavaScript</strong>, <code>&lt;Form&gt;</code> submits with{" "}
          <code>fetch</code>. The page updates in place with the action's result and fresh loader
          data, the URL stays the same, and the form resets, just as it would after a full page
          load.
        </li>
      </ul>

      <h2>
        <code>actionData</code>
      </h2>
      <p>
        What the action returns arrives as <code>actionData</code>, on the component whose action
        ran. It's <code>undefined</code> until then, and its type comes from the action, so
        returning different shapes (like <code>{"{ error }"}</code> or <code>{"{ signed }"}</code>)
        lets you narrow with <code>"error" in actionData</code>.
      </p>

      <h2>Redirecting after an action</h2>
      <p>
        A common pattern is to redirect once the change is saved. Return or throw{" "}
        <code>redirect()</code>:
      </p>
      <Code file="app/posts/new/page.tsx">{`
import { Form, redirect } from "@phatjng/graft";

import { createPost } from "../../posts.server";

export async function action({ request }: ActionProps<"/posts/new">) {
  const form = await request.formData();
  const post = await createPost({ title: String(form.get("title")) });
  return redirect(\`/posts/\${post.slug}\`, 303);
}
`}</Code>

      <h2>
        Several actions in one file: <code>intent</code>
      </h2>
      <p>
        Each file has a single <code>action</code>. When a page needs several mutations, give each
        submit button a <code>name</code> and <code>value</code>, and branch on it. The clicked
        button's value is part of the submission:
      </p>
      <Code file="app/todos/page.tsx">{`
export async function action({ request }: ActionProps<"/todos">) {
  const form = await request.formData();

  switch (form.get("intent")) {
    case "add":
      await addTodo(String(form.get("title")));
      return { ok: true };
    case "clear":
      await clearTodos();
      return { ok: true };
    default:
      return { error: "Unknown intent." };
  }
}

export default function Todos() {
  return (
    <>
      <Form method="post">
        <input name="title" />
        <button type="submit" name="intent" value="add">Add</button>
      </Form>
      <Form method="post">
        <button type="submit" name="intent" value="clear">Clear all</button>
      </Form>
    </>
  );
}
`}</Code>

      <h2>Which action runs</h2>
      <p>
        <strong>
          A <code>&lt;Form&gt;</code> posts to the file that renders it.
        </strong>{" "}
        A logout form in <code>app/dashboard/layout.tsx</code> runs that layout's action, even when
        it's submitted from <code>/dashboard/settings/profile</code>:
      </p>
      <Code file="app/dashboard/layout.tsx">{`
import { Form, redirect } from "@phatjng/graft";

import { signOut } from "../session.server";

export async function action({ request }: ActionProps<"/dashboard">) {
  await signOut(request);
  return redirect("/login");
}

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <>
      <Form method="post">
        <button type="submit">Sign out</button>
      </Form>
      {children}
    </>
  );
}
`}</Code>
      <p>
        A layout and the page in its folder share a URL (both are <code>/dashboard</code>), so{" "}
        <code>&lt;Form&gt;</code> also names its file in the URL it posts to:{" "}
        <code>/dashboard?_graft_action=dashboard/layout</code>. That works with any request body and
        without JavaScript.
      </p>
      <p>A few more rules:</p>
      <ul>
        <li>
          A plain <code>&lt;form method="post"&gt;</code> (or any request without that marker) runs
          the <strong>page's</strong> action.
        </li>
        <li>
          If the targeted file has no <code>action</code>, the response is a <code>405</code>. Graft
          doesn't look for one further up.
        </li>
        <li>
          With JavaScript, a layout form submitted from <code>/dashboard/settings</code> stays
          there. Without JavaScript, the browser shows the form's URL, <code>/dashboard</code>.
        </li>
        <li>
          A <code>&lt;Form&gt;</code> with an explicit <code>action</code>, like{" "}
          <code>{'<Form method="post" action="/newsletter">'}</code>, runs that page's action and
          lands on that page, with or without JavaScript.
        </li>
      </ul>
      <Note>
        After an action, every loader for the current page runs again, not only the ones whose data
        changed.
      </Note>

      <h2>Search forms</h2>
      <p>
        A <code>&lt;Form&gt;</code> without <code>method</code> is a GET form, as in HTML. With
        JavaScript it becomes a client navigation, with the fields in the query string:
      </p>
      <Code file="app/search/page.tsx">{`
import { Form } from "@phatjng/graft";

export function loader({ request }: LoaderProps<"/search">) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return { query, results: search(query) };
}

export default function Search({ loaderData }: PageProps<"/search">) {
  return (
    <Form>
      <input name="q" defaultValue={loaderData.query} />
      <button type="submit">Search</button>
    </Form>
  );
}
`}</Code>

      <h2>Security</h2>
      <p>
        Graft rejects any non-GET request that comes from another site with a <code>403</code>, by
        comparing the <code>Origin</code> (or <code>Referer</code>) header with the request's host.
        This protects actions from cross-site request forgery (CSRF). Requests with neither header,
        like those from <code>curl</code> or another server, aren't from a browser and are allowed.
      </p>
      <p>
        An action is still a public endpoint: always check that the user is allowed to do what
        they're asking. See the{" "}
        <Link href="/api-reference/route-exports/action">action reference</Link>.
      </p>
    </>
  );
}
