import { Link } from "@phatjng/graft";

import { Code } from "../../../components";

export default function LayoutReference() {
  return (
    <>
      <title>layout · Graft</title>
      <h1>layout</h1>
      <p>
        A <code>layout</code> file defines UI shared by the page in its folder and every page below
        it. It can be <code>layout.tsx</code>, <code>layout.ts</code>, <code>layout.jsx</code> or{" "}
        <code>layout.js</code>.
      </p>
      <Code file="app/dashboard/layout.tsx">{`
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div>
      <aside>Dashboard menu</aside>
      <main>{children}</main>
    </div>
  );
}
`}</Code>

      <h2>Props</h2>
      <p>
        Type them with <code>LayoutProps&lt;"/route"&gt;</code>, where <code>"/route"</code> is the
        layout's folder as a URL pattern.
      </p>
      <h3>
        <code>children</code>
      </h3>
      <p>The page, or the next layout down.</p>
      <h3>
        <code>params</code>
      </h3>
      <p>
        The dynamic segments in the layout's <strong>own</strong> path.{" "}
        <code>app/shop/[category]/layout.tsx</code> gets <code>{"{ category }"}</code>, and not the{" "}
        <code>[item]</code> of a page below it:
      </p>
      <Code file="app/shop/[category]/layout.tsx">{`
export default function CategoryLayout({ params, children }: LayoutProps<"/shop/[category]">) {
  return (
    <section>
      <h2>{params.category}</h2>
      {children}
    </section>
  );
}
`}</Code>
      <h3>
        <code>loaderData</code>
      </h3>
      <p>
        What the layout's own <Link href="/api-reference/route-exports/loader">loader</Link>{" "}
        returned, or <code>undefined</code> if it has none.
      </p>
      <h3>
        <code>actionData</code>
      </h3>
      <p>
        What the layout's own <Link href="/api-reference/route-exports/action">action</Link>{" "}
        returned, once it has run. <code>undefined</code> before that.
      </p>

      <h2>The root layout</h2>
      <p>
        <code>app/layout.tsx</code> is required and must render <code>&lt;html&gt;</code> and{" "}
        <code>&lt;body&gt;</code>. The browser hydrates the whole <code>document</code>, so there's
        no separate HTML template.
      </p>
      <Code file="app/layout.tsx">{`
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
`}</Code>

      <h2>Behavior</h2>
      <ul>
        <li>
          A layout and the page in its folder share a URL: <code>app/dashboard/layout.tsx</code> and{" "}
          <code>app/dashboard/page.tsx</code> are both <code>/dashboard</code>.
        </li>
        <li>
          A layout doesn't make a URL respond on its own. A folder with a layout and no page is a
          404.
        </li>
        <li>
          When navigating between pages under the same layout, the layout isn't remounted, so its
          state is kept. Its loader still runs again.
        </li>
        <li>
          A layout can export <code>loader</code> and <code>action</code>, like a page.
        </li>
      </ul>
    </>
  );
}
