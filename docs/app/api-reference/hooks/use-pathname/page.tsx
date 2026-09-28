import { Link } from "@phatjng/graft";

import { Code, Note } from "../../../components";

export default function UsePathnameReference() {
  return (
    <>
      <title>usePathname · Graft</title>
      <h1>usePathname</h1>
      <p>
        <code>usePathname()</code> returns the current URL's path, for example to highlight the link
        to the page you're on.
      </p>
      <Code file="app/nav-link.tsx">{`
import { Link, usePathname } from "@phatjng/graft";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Link href={href} aria-current={pathname === href ? "page" : undefined}>
      {children}
    </Link>
  );
}
`}</Code>

      <h2>Signature</h2>
      <Code>{`
function usePathname(): string;
`}</Code>

      <h2>Return value</h2>
      <p>The path inside the app, as it appears in the URL:</p>
      <table>
        <thead>
          <tr>
            <th>URL</th>
            <th>Returns</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>/</code>
            </td>
            <td>
              <code>"/"</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>/blog/hello-world?ref=home#comments</code>
            </td>
            <td>
              <code>"/blog/hello-world"</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>/docs/blog</code>, with <code>base: "/docs/"</code>
            </td>
            <td>
              <code>"/blog"</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>/blog/hello%20world</code>
            </td>
            <td>
              <code>"/blog/hello%20world"</code>
            </td>
          </tr>
        </tbody>
      </table>
      <ul>
        <li>
          Vite's <code>base</code> is left out, so the result compares directly with the paths you
          give <code>&lt;Link href&gt;</code>.
        </li>
        <li>The query string and hash aren't included.</li>
        <li>
          It stays percent-encoded, as in the URL. Dynamic segment values in{" "}
          <Link href="/api-reference/file-conventions/dynamic-segments">
            <code>params</code>
          </Link>{" "}
          are decoded.
        </li>
        <li>A trailing slash is kept if the URL has one.</li>
      </ul>

      <h2>Behavior</h2>
      <ul>
        <li>
          It works in any component Graft renders: layouts, pages, and the components inside them.
          Outside of those, it throws.
        </li>
        <li>
          It returns the same value on the server and in the browser, so it's safe to render during
          hydration.
        </li>
        <li>
          During a client navigation it changes in the same render as the new page, so a sidebar
          never highlights one page while showing another.
        </li>
      </ul>
      <Note>
        <code>usePathname()</code> reads the URL in the browser, with no request to the server. To
        read the query string, use a loader: <code>new URL(request.url).searchParams</code>.
      </Note>
    </>
  );
}
