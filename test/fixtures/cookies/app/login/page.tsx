import { Form, redirect } from "@phatjng/graft";

export async function action({ request, cookies }: ActionProps<"/login">) {
  const form = await request.formData();

  cookies.set("session", String(form.get("user")), { encrypted: true, maxAge: 60 * 60 });
  throw redirect("/account", 303);
}

export default function Login() {
  return (
    <Form method="post">
      <input name="user" defaultValue="ada" />
      <button type="submit">log in</button>
    </Form>
  );
}
