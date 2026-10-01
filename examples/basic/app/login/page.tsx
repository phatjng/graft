import { Form, redirect } from "@phatjng/graft";

import { getUser, signIn } from "../session.server";

export async function loader({ cookies }: LoaderProps<"/login">) {
  if (await getUser(cookies)) throw redirect("/");
}

export async function action({ request, cookies }: ActionProps<"/login">) {
  const form = await request.formData();

  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Please write your name." };

  signIn(cookies, name);
  return redirect("/", 303);
}

export default function Login({ actionData }: PageProps<"/login">) {
  return (
    <main>
      <title>Sign in · Graft</title>
      <h1>Sign in</h1>
      <Form method="post">
        <input name="name" placeholder="Your name" />
        <button type="submit">Sign in</button>
      </Form>
      {actionData?.error && <p role="alert">{actionData.error}</p>}
    </main>
  );
}
