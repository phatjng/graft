import { Link } from "@phatjng/graft";

import { Code, Note } from "../../components";

export default function LinkingAndNavigating() {
  return (
    <>
      <title>Linking and navigating · Graft</title>
      <h1>Linking and navigating</h1>
      <p>
        The first page a visitor opens is rendered on the server. After that, Graft takes over in
        the browser: moving to another page fetches only that page's code and data, and React
        updates what changed. Layouts that both pages share stay mounted.
      </p>

      <h2>
        The <code>&lt;Link&gt;</code> component
      </h2>
      <Code file="app/page.tsx">{`
import { Link } from "@phatjng/graft";

export default function Home() {
  return (
    <ul>
      <li><Link href="/about">About</Link></li>
      <li><Link href="/blog/hello-world">Hello, world</Link></li>
    </ul>
  );
}
`}</Code>
      <p>
        <code>&lt;Link&gt;</code> renders a plain <code>&lt;a&gt;</code>, so it works before the
        page has hydrated and with JavaScript turned off. After hydration, a plain left click
        navigates in the browser instead.
      </p>
      <p>The browser keeps its normal behavior for:</p>
      <ul>
        <li>clicks with a modifier key (to open a new tab, for example),</li>
        <li>
          links with a <code>target</code> or <code>download</code> attribute,
        </li>
        <li>links to other sites,</li>
        <li>
          and links to a <code>#hash</code> on the current page.
        </li>
      </ul>

      <h2>Showing the current page</h2>
      <p>
        <code>usePathname()</code> returns the current path, so a menu can mark the link to the page
        you're on. It updates on every navigation, without asking the server:
      </p>
      <Code file="app/layout.tsx">{`
import { Link, usePathname } from "@phatjng/graft";

const links = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body>
        <nav>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {children}
      </body>
    </html>
  );
}
`}</Code>
      <p>
        <code>aria-current="page"</code> tells screen readers which link is current, and gives you a
        selector to style it: <code>{'[aria-current="page"] { font-weight: bold; }'}</code>. See the{" "}
        <Link href="/api-reference/hooks/use-pathname">usePathname reference</Link>.
      </p>

      <h2>Prefetching</h2>
      <p>
        Hovering over, focusing or touching a <code>&lt;Link&gt;</code> starts downloading the next
        page's code. By the time the click lands, it's usually there.
      </p>

      <h2>How a navigation works</h2>
      <ol>
        <li>Graft matches the new URL against your routes, in the browser.</li>
        <li>
          It loads the code for the matched layouts and page, and asks the server for their loader
          data, both at once.
        </li>
        <li>It renders the new page and updates the URL.</li>
      </ol>
      <p>
        If anything unexpected happens (no route matches, the server returns an error, the network
        fails), Graft falls back to a normal full page load, so the visitor still ends up where they
        meant to go.
      </p>

      <h2>Scrolling</h2>
      <ul>
        <li>New pages start at the top.</li>
        <li>
          Back and Forward restore the scroll position you left the page at, even after a reload.
        </li>
        <li>
          A link with a hash, like <code>/docs#install</code>, scrolls to that element.
        </li>
      </ul>

      <h2>Redirects</h2>
      <p>
        If a loader redirects during a client navigation, Graft follows it and replaces the history
        entry, so Back doesn't land on the page that redirected. See{" "}
        <Link href="/api-reference/functions/redirect">
          <code>redirect</code>
        </Link>
        .
      </p>

      <Note>
        Every loader for the new page runs again on each navigation, including those of layouts that
        didn't change. That keeps data fresh; skipping unchanged loaders is a possible optimization
        for later.
      </Note>
    </>
  );
}
