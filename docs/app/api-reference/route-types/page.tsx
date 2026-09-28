import { Link } from "@phatjng/graft";

import { Code, Note } from "../../components";

export default function RouteTypes() {
  return (
    <>
      <title>Route types · Graft</title>
      <h1>Route types</h1>
      <p>
        Graft generates types from your <code>app/</code> folder, so props, params and data are
        typed without annotations. They're global: you use them without importing anything.
      </p>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>For</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>PageProps&lt;Route&gt;</code>
            </td>
            <td>
              A page's props: <code>params</code>, <code>loaderData</code>, <code>actionData</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>LayoutProps&lt;Route&gt;</code>
            </td>
            <td>
              A layout's props: the same, plus <code>children</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>LoaderProps&lt;Route&gt;</code>
            </td>
            <td>
              A loader's argument: <code>request</code> and <code>params</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>ActionProps&lt;Route&gt;</code>
            </td>
            <td>
              An action's argument: <code>request</code> and <code>params</code>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <code>Route</code> is the file's folder as a URL pattern: <code>"/"</code> for{" "}
        <code>app/</code>, <code>"/blog/[slug]"</code> for <code>app/blog/[slug]/</code>. Only
        routes that exist are accepted, so a typo is a type error.
      </p>

      <h2>Example</h2>
      <Code file="app/blog/[slug]/page.tsx">{`
export async function loader({ params }: LoaderProps<"/blog/[slug]">) {
  //                          params: { slug: string }
  return { post: await getPost(params.slug), fetchedAt: new Date() };
}

export async function action({ request }: ActionProps<"/blog/[slug]">) {
  const form = await request.formData();
  if (!form.get("comment")) return { error: "Write something first." };
  return { ok: true };
}

export default function Post({ params, loaderData, actionData }: PageProps<"/blog/[slug]">) {
  // params:     { slug: string }
  // loaderData: { post: Post; fetchedAt: Date }
  // actionData: { error: string } | { ok: boolean } | undefined
}
`}</Code>

      <h2>How the types are derived</h2>
      <ul>
        <li>
          <code>params</code> has a <code>string</code> for each dynamic segment in the file's own
          path.
        </li>
        <li>
          <code>loaderData</code> is the loader's return type, awaited, without any{" "}
          <code>redirect()</code> it returns. The data is sent with devalue, so a <code>Date</code>{" "}
          stays a <code>Date</code>: no conversion to account for. Without a loader, it's{" "}
          <code>undefined</code>.
        </li>
        <li>
          <code>actionData</code> is the action's return type the same way, or{" "}
          <code>undefined</code> before the action has run.
        </li>
      </ul>

      <h2>Where they live</h2>
      <p>
        The types are written to <code>.graft/types/routes.d.ts</code> whenever <code>vite</code> or{" "}
        <code>vite build</code> runs, and updated as you add routes. Your <code>tsconfig.json</code>{" "}
        must include <code>.graft/types/**/*.ts</code>; Graft adds it for you if it can.
      </p>
      <p>
        To type-check without starting Vite (in CI, or on a fresh clone), run{" "}
        <Link href="/api-reference/cli">
          <code>graft typegen</code>
        </Link>{" "}
        first:
      </p>
      <Code file="package.json">{`
{
  "scripts": {
    "typecheck": "graft typegen && tsc --noEmit"
  }
}
`}</Code>
      <Note>
        <code>.graft/</code> is generated. Add it to <code>.gitignore</code>.
      </Note>
    </>
  );
}
