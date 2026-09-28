import { Link } from "@phatjng/graft";

import { Code } from "../../../components";

export default function LinkReference() {
  return (
    <>
      <title>&lt;Link&gt; · Graft</title>
      <h1>&lt;Link&gt;</h1>
      <p>
        <code>&lt;Link&gt;</code> renders an <code>&lt;a&gt;</code> that navigates within your app
        without a full page load.
      </p>
      <Code file="app/page.tsx">{`
import { Link } from "@phatjng/graft";

export default function Home() {
  return <Link href="/blog">Blog</Link>;
}
`}</Code>

      <h2>Props</h2>
      <h3>
        <code>href</code> (required)
      </h3>
      <p>
        A path inside the app, like <code>/blog/hello-world</code>, with an optional query string or
        hash. If the app has a Vite <code>base</code>, it's added in front: <code>/blog</code>{" "}
        becomes <code>/docs/blog</code> with <code>base: "/docs/"</code>. Full URLs and relative
        paths are used as they are.
      </p>
      <h3>Everything else</h3>
      <p>
        <code>&lt;Link&gt;</code> accepts every <code>&lt;a&gt;</code> prop, including{" "}
        <code>ref</code>, <code>className</code>, <code>target</code>, <code>rel</code> and event
        handlers. Your <code>onClick</code> runs first; call <code>event.preventDefault()</code> in
        it to cancel the navigation.
      </p>
      <Code lang="tsx">{`
const pathname = usePathname();

<Link href="/settings" className="nav-link" aria-current={pathname === "/settings" ? "page" : undefined}>
  Settings
</Link>
`}</Code>

      <p>
        <Link href="/api-reference/hooks/use-pathname">
          <code>usePathname()</code>
        </Link>{" "}
        tells you which link is the current page.
      </p>

      <h2>Behavior</h2>
      <ul>
        <li>Before hydration, or without JavaScript, it's a normal link.</li>
        <li>
          After hydration, a plain left click loads the next page's code and data, renders it, and
          pushes a history entry.
        </li>
        <li>
          The browser handles it as usual when a modifier key is held, when it has a{" "}
          <code>target</code> other than <code>_self</code> or a <code>download</code> attribute,
          when it points to another origin, or when it only changes the hash of the current page.
        </li>
        <li>Hovering, focusing or touching it starts downloading the next page's code.</li>
        <li>
          If the navigation fails (no matching route, a server error, a network error), the browser
          loads the page normally instead.
        </li>
      </ul>
    </>
  );
}
