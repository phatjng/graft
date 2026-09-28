import { Code, Note } from "../../components";

export default function CssAndMetadata() {
  return (
    <>
      <title>CSS and metadata · Graft</title>
      <h1>CSS and metadata</h1>

      <h2>CSS</h2>
      <p>
        Import CSS files from any layout, page or component. Vite handles them: they hot-reload in
        development and become hashed files in a build.
      </p>
      <Code file="app/layout.tsx">{`
import "./styles.css";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`}</Code>
      <p>
        Graft adds a <code>&lt;link&gt;</code> for each stylesheet the page uses to the server's
        HTML, so the first render is already styled, with no flash of unstyled content. Styles for
        other pages load when you navigate to them.
      </p>
      <p>
        Anything Vite supports works the same way: CSS modules (<code>*.module.css</code>), Sass
        with the <code>sass</code> package, PostCSS, and Vite plugins such as Tailwind's.
      </p>
      <Code file="app/button.tsx">{`
import styles from "./button.module.css";

export function Button(props: React.ComponentProps<"button">) {
  return <button className={styles.button} {...props} />;
}
`}</Code>

      <h2>Title and meta tags</h2>
      <p>
        React 19 moves <code>&lt;title&gt;</code>, <code>&lt;meta&gt;</code> and{" "}
        <code>&lt;link&gt;</code> tags into <code>&lt;head&gt;</code> wherever you render them, so a
        page sets its own title by rendering one:
      </p>
      <Code file="app/blog/[slug]/page.tsx">{`
export default function Post({ loaderData }: PageProps<"/blog/[slug]">) {
  const { post } = loaderData;

  return (
    <article>
      <title>{\`\${post.title} · My blog\`}</title>
      <meta name="description" content={post.summary} />
      <h1>{post.title}</h1>
    </article>
  );
}
`}</Code>
      <p>The title updates on client navigation too.</p>
      <Note>
        Pass <code>&lt;title&gt;</code> a single string.{" "}
        <code>{"<title>{post.title} · My blog</title>"}</code> has two children, which React warns
        about; use a template literal instead.
      </Note>

      <h2>Tags for every page</h2>
      <p>
        Tags every page needs, like <code>charset</code>, <code>viewport</code> and a favicon, go in
        the root layout's <code>&lt;head&gt;</code>. Files in a <code>public/</code> folder next to{" "}
        <code>app/</code> are served as they are, at the root of the site:
      </p>
      <Code file="app/layout.tsx">{`
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
`}</Code>
    </>
  );
}
