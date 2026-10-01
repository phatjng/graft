import { Code } from "../../../components";

export default function RedirectReference() {
  return (
    <>
      <title>redirect · Graft</title>
      <h1>redirect</h1>
      <p>
        <code>redirect()</code> sends the visitor to another URL from a loader or an action. Return
        it or throw it.
      </p>
      <Code file="app/dashboard/layout.tsx">{`
import { redirect } from "@phatjng/graft";

import { getUser } from "../session.server";

export async function loader({ cookies }: LoaderProps<"/dashboard">) {
  const user = await getUser(cookies);
  if (!user) throw redirect("/login");
  return { user };
}
`}</Code>

      <h2>Signature</h2>
      <Code lang="ts">{`
function redirect(url: string, status?: 301 | 302 | 303 | 307 | 308): Response;
`}</Code>
      <h3>
        <code>url</code>
      </h3>
      <p>
        A path inside the app, like <code>/login</code>, or a full URL. If the app has a Vite{" "}
        <code>base</code>, it's added in front of paths.
      </p>
      <h3>
        <code>status</code>
      </h3>
      <p>
        Defaults to <code>302</code>. Use <code>301</code> or <code>308</code> when a page moved for
        good, and <code>303</code> after an action, to tell the browser to follow with a{" "}
        <code>GET</code>.
      </p>

      <h2>Return or throw</h2>
      <p>
        Returning keeps the redirect visible in the function's flow. Throwing works from inside
        helpers, so a shared <code>requireUser()</code> can stop any loader that calls it:
      </p>
      <Code file="app/session.server.ts">{`
import { redirect, type Cookies } from "@phatjng/graft";

export async function requireUser(cookies: Cookies) {
  const user = await getUser(cookies);
  if (!user) throw redirect("/login");
  return user;
}
`}</Code>

      <h2>On client navigation</h2>
      <p>
        When a loader redirects during a client navigation, the router follows the redirect in the
        browser and replaces the history entry, so Back skips the page that redirected. A redirect
        to another origin does a full page load.
      </p>
    </>
  );
}
