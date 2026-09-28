import { Link } from "@phatjng/graft";

import { Code } from "../../../components";

export default function PageReference() {
  return (
    <>
      <title>page · Graft</title>
      <h1>page</h1>
      <p>
        A <code>page</code> file makes its folder's URL respond, and default-exports the component
        to render. It can be <code>page.tsx</code>, <code>page.ts</code>, <code>page.jsx</code> or{" "}
        <code>page.js</code>.
      </p>
      <Code file="app/blog/[slug]/page.tsx">{`
export async function loader({ params }: LoaderProps<"/blog/[slug]">) {
  return { post: await getPost(params.slug) };
}

export default function Post({ params, loaderData }: PageProps<"/blog/[slug]">) {
  return <h1>{loaderData.post?.title ?? params.slug}</h1>;
}
`}</Code>

      <h2>Exports</h2>
      <table>
        <thead>
          <tr>
            <th>Export</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>default</code>
            </td>
            <td>Yes</td>
            <td>The React component for the page.</td>
          </tr>
          <tr>
            <td>
              <Link href="/api-reference/route-exports/loader">
                <code>loader</code>
              </Link>
            </td>
            <td>No</td>
            <td>Loads data on the server for GET and HEAD requests.</td>
          </tr>
          <tr>
            <td>
              <Link href="/api-reference/route-exports/action">
                <code>action</code>
              </Link>
            </td>
            <td>No</td>
            <td>Handles form submissions and other non-GET requests.</td>
          </tr>
        </tbody>
      </table>

      <h2>Props</h2>
      <p>
        Type them with <code>PageProps&lt;"/route"&gt;</code>, where <code>"/route"</code> is the
        page's folder as a URL pattern: <code>"/"</code>, <code>"/about"</code>,{" "}
        <code>"/blog/[slug]"</code>.
      </p>
      <h3>
        <code>params</code>
      </h3>
      <p>
        Every dynamic segment in the page's path, as strings. For{" "}
        <code>app/shop/[category]/[item]/page.tsx</code> at <code>/shop/shoes/boots</code>:{" "}
        <code>{'{ category: "shoes", item: "boots" }'}</code>.
      </p>
      <h3>
        <code>loaderData</code>
      </h3>
      <p>
        What the page's loader returned, with its exact type. <code>undefined</code> if the page has
        no loader.
      </p>
      <h3>
        <code>actionData</code>
      </h3>
      <p>
        What the page's action returned, after a submission. <code>undefined</code> until then.
      </p>

      <h2>Query strings</h2>
      <p>
        Pages don't get the query string as a prop. Read it in a loader, from{" "}
        <code>request.url</code>:
      </p>
      <Code file="app/search/page.tsx">{`
export function loader({ request }: LoaderProps<"/search">) {
  return { query: new URL(request.url).searchParams.get("q") ?? "" };
}
`}</Code>
    </>
  );
}
