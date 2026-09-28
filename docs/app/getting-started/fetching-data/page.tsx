import { Link } from "@phatjng/graft";

import { Code, Note } from "../../components";

export default function FetchingData() {
  return (
    <>
      <title>Fetching data · Graft</title>
      <h1>Fetching data</h1>
      <p>
        A page or layout gets its data from a <code>loader</code>: a function exported next to the
        component, which runs only on the server. Whatever it returns arrives in the component as{" "}
        <code>loaderData</code>.
      </p>
      <Code file="app/blog/page.tsx">{`
import { Link } from "@phatjng/graft";

import { db } from "../db.server";

export async function loader() {
  const posts = await db.posts.findMany({ orderBy: { publishedAt: "desc" } });
  return { posts };
}

export default function Blog({ loaderData }: PageProps<"/blog">) {
  return (
    <ul>
      {loaderData.posts.map((post) => (
        <li key={post.id}>
          <Link href={\`/blog/\${post.slug}\`}>{post.title}</Link>
        </li>
      ))}
    </ul>
  );
}
`}</Code>
      <p>
        Because the loader only runs on the server, it can talk to a database, read files and use
        secrets. Graft removes it (and any imports only it uses) from the code sent to the browser.
      </p>

      <h2>Types come for free</h2>
      <p>
        <code>loaderData</code> has exactly the type the loader returns. You don't annotate
        anything: <code>PageProps&lt;"/blog"&gt;</code> looks it up from the file.
      </p>

      <h2>Params and the request</h2>
      <p>
        A loader receives the URL's <code>params</code> and the incoming <code>Request</code>, for
        reading headers, cookies or the query string:
      </p>
      <Code file="app/blog/[slug]/page.tsx">{`
import { getPost } from "../../posts.server";

export async function loader({ params, request }: LoaderProps<"/blog/[slug]">) {
  const preview = new URL(request.url).searchParams.has("preview");
  return { post: await getPost(params.slug, { preview }) };
}

export default function Post({ loaderData }: PageProps<"/blog/[slug]">) {
  const { post } = loaderData;
  if (!post) return <p>Post not found.</p>;
  return <h1>{post.title}</h1>;
}
`}</Code>

      <h2>Loaders in layouts</h2>
      <p>
        Layouts can have loaders too. When a URL matches a root layout, a nested layout and a page,
        all three loaders run <strong>in parallel</strong>, so one never waits for another.
      </p>
      <Code file="app/layout.tsx">{`
import { getUser } from "./session.server";

export async function loader({ request }: LoaderProps<"/">) {
  return { user: await getUser(request) };
}

export default function RootLayout({ children, loaderData }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header>{loaderData.user ? \`Hi, \${loaderData.user.name}\` : "Signed out"}</header>
        {children}
      </body>
    </html>
  );
}
`}</Code>
      <p>
        Each component only receives its own loader's data. To use a layout's data in a page, load
        it in the page as well.
      </p>

      <h2>Redirecting</h2>
      <p>
        Return or throw <code>redirect()</code> to send the visitor somewhere else. Throwing is
        handy from inside helper functions:
      </p>
      <Code file="app/dashboard/layout.tsx">{`
import { redirect } from "@phatjng/graft";

import { getUser } from "../session.server";

export async function loader({ request }: LoaderProps<"/dashboard">) {
  const user = await getUser(request);
  if (!user) throw redirect("/login");
  return { user };
}
`}</Code>
      <p>
        When several loaders redirect or throw, the outermost one wins: this layout's redirect to{" "}
        <code>/login</code> beats an error from the page below it.
      </p>

      <h2>What you can return</h2>
      <p>
        Loader data is sent to the browser with{" "}
        <a href="https://github.com/sveltejs/devalue">devalue</a>, which handles more than JSON.
        These arrive intact, with the same type:
      </p>
      <ul>
        <li>
          strings, numbers, booleans, <code>null</code> and <code>undefined</code>
        </li>
        <li>arrays and plain objects</li>
        <li>
          <code>Date</code>, <code>Map</code>, <code>Set</code>, <code>BigInt</code>,{" "}
          <code>RegExp</code> and <code>URL</code>
        </li>
        <li>repeated and circular references</li>
      </ul>
      <p>
        Functions and class instances can't be sent. Returning one is an error that names the file
        and the path to the bad value, like <code>.loaderData["blog/[slug]/page"].post.author</code>
        .
      </p>
      <Note>
        Everything a loader returns is visible in the page's HTML. Only return what the browser
        should see: pick the fields you need rather than returning whole database rows.
      </Note>

      <h2>When loaders run</h2>
      <ul>
        <li>On the first page load, before the server renders HTML.</li>
        <li>On every client navigation, for every layout and page of the new URL.</li>
        <li>After an action, to show fresh data.</li>
      </ul>
      <p>
        See the <Link href="/api-reference/route-exports/loader">loader reference</Link> for the
        details.
      </p>
    </>
  );
}
