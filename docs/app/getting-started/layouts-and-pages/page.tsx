import { Link } from "@phatjng/graft";

import { Code, Note } from "../../components";

export default function LayoutsAndPages() {
  return (
    <>
      <title>Layouts and pages · Graft</title>
      <h1>Layouts and pages</h1>
      <p>
        Graft uses folders to define routes. Each folder in <code>app/</code> is a URL segment, and
        a <code>page</code> file inside it makes that URL respond.
      </p>

      <h2>Creating a page</h2>
      <p>
        A page is a file named <code>page.tsx</code> that default-exports a React component:
      </p>
      <Code file="app/page.tsx">{`
export default function Home() {
  return <h1>Welcome</h1>;
}
`}</Code>
      <p>
        To add <code>/about</code>, make a folder and put a page in it:
      </p>
      <Code file="app/about/page.tsx">{`
export default function About() {
  return <h1>About us</h1>;
}
`}</Code>
      <p>
        New pages show up while <code>vite</code> is running. You don't need to restart it.
      </p>

      <h2>Creating a layout</h2>
      <p>
        A layout wraps the page in its folder and every page below it. It receives the page (or the
        next layout down) as <code>children</code>:
      </p>
      <Code file="app/blog/layout.tsx">{`
import { Link } from "@phatjng/graft";

export default function BlogLayout({ children }: LayoutProps<"/blog">) {
  return (
    <section>
      <nav>
        <Link href="/blog">All posts</Link>
      </nav>
      {children}
    </section>
  );
}
`}</Code>
      <p>
        When you navigate between pages that share a layout, the layout stays mounted and keeps its
        state.
      </p>

      <h2>The root layout</h2>
      <p>
        <code>app/layout.tsx</code> is required. It renders the whole document, including{" "}
        <code>&lt;html&gt;</code>, <code>&lt;head&gt;</code> and <code>&lt;body&gt;</code>. There's
        no hidden HTML template: what the root layout renders is what the browser gets.
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

      <h2>Nesting</h2>
      <p>
        For <code>/blog/hello-world</code>, Graft renders:
      </p>
      <Code>{`
<RootLayout>          app/layout.tsx
  <BlogLayout>        app/blog/layout.tsx
    <Post />          app/blog/[slug]/page.tsx
  </BlogLayout>
</RootLayout>
`}</Code>

      <h2>Dynamic segments</h2>
      <p>
        Wrap a folder name in square brackets to match any value in that position. The value arrives
        in <code>params</code>:
      </p>
      <Code file="app/blog/[slug]/page.tsx">{`
export default function Post({ params }: PageProps<"/blog/[slug]">) {
  return <h1>Post: {params.slug}</h1>;
}
`}</Code>
      <p>
        <code>PageProps&lt;"/blog/[slug]"&gt;</code> is generated from your <code>app/</code>{" "}
        folder, so <code>params.slug</code> is typed as a <code>string</code>, and a typo in the
        route name is a type error. See{" "}
        <Link href="/api-reference/file-conventions/dynamic-segments">Dynamic segments</Link> for
        the matching rules.
      </p>
      <Note>
        <code>PageProps</code> and <code>LayoutProps</code> are global types, so you don't import
        them. See <Link href="/api-reference/route-types">Route types</Link>.
      </Note>

      <h2>Linking between pages</h2>
      <p>
        Use <code>&lt;Link&gt;</code> to move between pages without a full page load. The next page
        explains how.
      </p>
    </>
  );
}
