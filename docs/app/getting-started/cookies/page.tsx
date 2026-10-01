import { Link } from "@phatjng/graft";

import { Code, Note } from "../../components";

export default function Cookies() {
  return (
    <>
      <title>Cookies · Graft</title>
      <h1>Cookies</h1>
      <p>
        Loaders and actions receive a <code>cookies</code> object. Read a cookie with{" "}
        <code>cookies.get()</code>, and set one with <code>cookies.set()</code>: Graft adds the{" "}
        <code>Set-Cookie</code> header to whatever response it sends, whether that's a page, data
        for the router or a redirect.
      </p>
      <Code file="app/theme/page.tsx">{`
import { Form } from "@phatjng/graft";

export function loader({ cookies }: LoaderProps<"/theme">) {
  return { theme: cookies.get("theme") ?? "light" };
}

export async function action({ request, cookies }: ActionProps<"/theme">) {
  const form = await request.formData();
  const theme = form.get("theme") === "dark" ? "dark" : "light";

  cookies.set("theme", theme, { maxAge: 60 * 60 * 24 * 365 });
  return { saved: theme };
}

export default function Theme({ loaderData }: PageProps<"/theme">) {
  const other = loaderData.theme === "light" ? "dark" : "light";

  return (
    <Form method="post">
      <input type="hidden" name="theme" value={other} />
      <button type="submit">Switch to {other}</button>
    </Form>
  );
}
`}</Code>
      <p>
        The page shows the new theme right after the action, with or without JavaScript. Without it,
        the loaders that render the page run in the same request as the action and read the cookie
        it just set. With it, the browser has already stored the cookie when the router asks for
        fresh loader data.
      </p>

      <h2>Reading, setting and deleting</h2>
      <Code lang="ts">{`
cookies.get("theme"); // "dark", or undefined
cookies.has("theme"); // true

cookies.set("theme", "dark", { maxAge: 60 * 60 * 24 * 365 });
cookies.delete("theme");
`}</Code>
      <p>
        Values are strings. Store anything else with <code>JSON.stringify()</code>. Within a
        request, reads see what was set or deleted earlier in it.
      </p>
      <p>
        New cookies are sent to every page (<code>path: "/"</code>), are hidden from JavaScript in
        the browser (<code>httpOnly: true</code>) and aren't sent on requests from other sites (
        <code>sameSite: "lax"</code>). You can change each of these. <code>secure</code>, which
        sends the cookie over HTTPS only, is never set for you: decide it for your deployment, since
        a <code>Secure</code> cookie is dropped on a plain <code>http://</code> site.
      </p>

      <h2>Encrypted cookies</h2>
      <p>
        A cookie lives in the browser, so anyone can read and change it. To store something that
        must stay private and that you need to trust, like who is signed in, encrypt it:
      </p>
      <Code file="app/login/page.tsx">{`
import { Form, redirect } from "@phatjng/graft";

import { findUser } from "../users.server";

export async function action({ request, cookies }: ActionProps<"/login">) {
  const form = await request.formData();
  const user = await findUser(form.get("email"), form.get("password"));
  if (!user) return { error: "Wrong email or password." };

  cookies.set("session", user.id, {
    encrypted: true,
    secure: true,
    maxAge: 60 * 60 * 24 * 30,
  });

  return redirect("/dashboard", 303);
}
`}</Code>
      <p>
        Read it back with <code>{"{ encrypted: true }"}</code>, which returns a <code>Promise</code>
        :
      </p>
      <Code file="app/dashboard/layout.tsx">{`
import { redirect } from "@phatjng/graft";

export async function loader({ cookies }: LoaderProps<"/dashboard">) {
  const userId = await cookies.get("session", { encrypted: true });
  if (!userId) throw redirect("/login");

  return { userId };
}
`}</Code>
      <p>
        The value is <code>undefined</code> if the cookie is missing, has been changed, was copied
        from another cookie or is past its <code>maxAge</code> or <code>expires</code>. The expiry
        is checked on the server too, so a stolen copy of an old cookie stops working.
      </p>
      <p>
        Encryption needs a secret. Pass it to{" "}
        <Link href="/api-reference/functions/handle">
          <code>handle()</code>
        </Link>{" "}
        in{" "}
        <Link href="/api-reference/file-conventions/server">
          <code>app/server.ts</code>
        </Link>
        , read from the environment:
      </p>
      <Code file="app/server.ts">{`
import { handle } from "@phatjng/graft/server";

const secret = process.env.COOKIE_SECRET;
if (!secret) throw new Error("Set COOKIE_SECRET.");

export default {
  fetch: (request: Request) => handle(request, { cookieSecrets: [secret] }),
};
`}</Code>
      <p>Each secret must be at least 32 characters. Generate one with:</p>
      <Code lang="shell">{`
openssl rand -base64 32
`}</Code>
      <Note>
        Never commit a secret, or import it from code that runs in the browser. Anyone with it can
        read and forge your encrypted cookies.
      </Note>

      <h3>Rotating secrets</h3>
      <p>
        <code>cookieSecrets</code> is a list. New cookies are encrypted with the first secret, and
        reading tries each one in turn. To replace a secret without signing everyone out, put the
        new one first:
      </p>
      <Code file="app/server.ts">{`
const cookieSecrets = [process.env.COOKIE_SECRET!, process.env.OLD_COOKIE_SECRET!];
`}</Code>
      <p>
        Cookies keep the secret they were encrypted with until they're set again, so remove the old
        secret once the longest <code>maxAge</code> you use has passed.
      </p>

      <h2>Cookies in your own modules</h2>
      <p>
        <code>cookies</code> belongs to the request, so pass it to the functions that need it. A
        small module keeps the details in one place:
      </p>
      <Code file="app/session.server.ts">{`
import type { Cookies } from "@phatjng/graft";

export function getUserId(cookies: Cookies): Promise<string | undefined> {
  return cookies.get("session", { encrypted: true });
}

export function signIn(cookies: Cookies, userId: string): void {
  cookies.set("session", userId, { encrypted: true, secure: true, maxAge: 60 * 60 * 24 * 30 });
}

export function signOut(cookies: Cookies): void {
  cookies.delete("session");
}
`}</Code>

      <h2>Where you can use cookies</h2>
      <p>
        Only in loaders and actions, and the code they call. Components also render in the browser,
        and by the time the page's HTML starts streaming, its headers have been sent. To show a
        cookie's value, return it from a loader.
      </p>
      <p>
        Every loader for a page finishes before the page renders, so a loader can set cookies too:
        to give a visitor an ID, or to push back a session's expiry. If a loader or action throws an
        error, the error page sets none of them.
      </p>
      <p>
        See the{" "}
        <Link href="/api-reference/cookies">
          <code>cookies</code> reference
        </Link>{" "}
        for every option.
      </p>
    </>
  );
}
