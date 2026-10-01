import { Form, redirect } from "@phatjng/graft";

export async function loader({ cookies }: LoaderProps<"/account">) {
  const user = await cookies.get("session", { encrypted: true });
  if (!user) throw redirect("/login");

  return { user };
}

export function action({ cookies }: ActionProps<"/account">) {
  cookies.delete("session");
  return redirect("/login", 303);
}

export default function Account({ loaderData }: PageProps<"/account">) {
  return (
    <>
      <p id="user">signed in as {loaderData.user}</p>
      <Form method="post">
        <button type="submit">log out</button>
      </Form>
    </>
  );
}
