import { Form, Link, redirect } from "@phatjng/graft";

import { getUser, signOut } from "./session.server";

import "./styles.css";

export async function loader({ cookies }: LoaderProps<"/">) {
  return { builtBy: "Graft", year: new Date().getUTCFullYear(), user: await getUser(cookies) };
}

export function action({ cookies }: ActionProps<"/">) {
  signOut(cookies);
  return redirect("/", 303);
}

export default function RootLayout({ children, loaderData }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <header>
          {loaderData.user ? (
            <Form method="post">
              Signed in as {loaderData.user} <button type="submit">Sign out</button>
            </Form>
          ) : (
            <Link href="/login">Sign in</Link>
          )}
        </header>
        {children}
        <footer>
          Made with {loaderData.builtBy}, {loaderData.year}
        </footer>
      </body>
    </html>
  );
}
