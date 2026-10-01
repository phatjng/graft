import { Link } from "@phatjng/graft";

import { Code, Note } from "../../components";

export default function CookiesReference() {
  return (
    <>
      <title>cookies · Graft</title>
      <h1>cookies</h1>
      <p>
        The request's cookies, and the ones to set on its response. Every{" "}
        <Link href="/api-reference/route-exports/loader">
          <code>loader</code>
        </Link>{" "}
        and{" "}
        <Link href="/api-reference/route-exports/action">
          <code>action</code>
        </Link>{" "}
        receives it.
      </p>
      <Code file="app/page.tsx">{`
export async function loader({ cookies }: LoaderProps<"/">) {
  return { theme: cookies.get("theme") ?? "light" };
}
`}</Code>
      <p>
        To pass it to your own functions, import its type: <code>Cookies</code> from{" "}
        <code>@phatjng/graft</code>.
      </p>

      <h2>Methods</h2>
      <h3>
        <code>get(name)</code>
      </h3>
      <p>
        The cookie's value as the browser sent it, or <code>undefined</code>.
      </p>
      <h3>
        <code>get(name, {"{ encrypted: true }"})</code>
      </h3>
      <p>
        A <code>Promise</code> for the decrypted value of a cookie set with{" "}
        <code>encrypted: true</code>. It resolves to <code>undefined</code> if the cookie is
        missing, can't be decrypted with any of the <code>cookieSecrets</code>, was encrypted for a
        cookie with another name, or has expired.
      </p>
      <h3>
        <code>has(name)</code>
      </h3>
      <p>Whether the cookie exists.</p>
      <h3>
        <code>set(name, value, options?)</code>
      </h3>
      <p>
        Sets a cookie on the response. Setting the same name, <code>path</code> and{" "}
        <code>domain</code> again replaces the earlier value: the response has one{" "}
        <code>Set-Cookie</code> per cookie.
      </p>
      <h3>
        <code>delete(name, options?)</code>
      </h3>
      <p>
        Tells the browser to remove the cookie. If you set it with a <code>path</code> or{" "}
        <code>domain</code>, pass the same ones: <code>{'{ path: "/blog" }'}</code>.
      </p>
      <p>
        After a <code>set</code> or <code>delete</code>, reads in the same request return the new
        value. An encrypted cookie only reads back with <code>{"{ encrypted: true }"}</code>, and a
        plain one only without it.
      </p>

      <h2>Options</h2>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Default</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>maxAge</code>
            </td>
            <td />
            <td>
              Seconds until the cookie expires. Wins over <code>expires</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>expires</code>
            </td>
            <td />
            <td>
              A <code>Date</code> when the cookie expires. With neither option, the cookie lasts
              until the browser closes.
            </td>
          </tr>
          <tr>
            <td>
              <code>path</code>
            </td>
            <td>
              <code>"/"</code>
            </td>
            <td>Only send the cookie to URLs under this path.</td>
          </tr>
          <tr>
            <td>
              <code>domain</code>
            </td>
            <td />
            <td>Also send the cookie to this domain's subdomains.</td>
          </tr>
          <tr>
            <td>
              <code>httpOnly</code>
            </td>
            <td>
              <code>true</code>
            </td>
            <td>
              Hide the cookie from <code>document.cookie</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>secure</code>
            </td>
            <td>
              <code>false</code>
            </td>
            <td>Only send the cookie over HTTPS. Never set for you.</td>
          </tr>
          <tr>
            <td>
              <code>sameSite</code>
            </td>
            <td>
              <code>"lax"</code>
            </td>
            <td>
              <code>"strict"</code>, <code>"lax"</code> or <code>"none"</code>: whether requests
              from other sites include the cookie. <code>"none"</code> needs{" "}
              <code>secure: true</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>partitioned</code>
            </td>
            <td>
              <code>false</code>
            </td>
            <td>
              Keep a separate cookie per top-level site, for embedded pages. Needs{" "}
              <code>secure: true</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>encrypted</code>
            </td>
            <td>
              <code>false</code>
            </td>
            <td>
              Encrypt the value with the first of the <code>cookieSecrets</code> passed to{" "}
              <Link href="/api-reference/functions/handle">
                <code>handle()</code>
              </Link>
              .
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <code>set</code> throws if the name or an option is invalid, or if the cookie is larger than
        the 4096 bytes browsers accept.
      </p>

      <h2>Encrypted cookies</h2>
      <p>
        Values are encrypted with AES-256-GCM, using a key derived from the secret. The browser can
        neither read nor change them. The cookie's name is part of the encryption, so a value can't
        be moved to another cookie, and its <code>maxAge</code> or <code>expires</code> is stored
        inside, so the server rejects it once it has expired.
      </p>
      <p>
        Encrypted values are longer than the original, so keep them small: an ID rather than a whole
        user record. Using <code>encrypted</code> without <code>cookieSecrets</code> throws.
      </p>

      <h2>The response</h2>
      <ul>
        <li>
          Cookies go on every response that succeeds: the page, data for the router, a redirect, or
          a <code>HEAD</code> response.
        </li>
        <li>
          If a loader or action throws an error, the error page sets no cookies, even ones set
          before the error.
        </li>
        <li>
          A response that sets cookies gets <code>Cache-Control: private, no-store</code>, unless it
          already has a <code>Cache-Control</code> header, so a CDN never serves one visitor's
          cookies to another.
        </li>
      </ul>
      <Note>
        The loaders for a page run in parallel. If two of them set the same cookie, which value wins
        isn't defined, so set each cookie in one place.
      </Note>
    </>
  );
}
