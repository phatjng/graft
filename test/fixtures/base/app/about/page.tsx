import { Form, redirect } from "@phatjng/graft";

export function loader({ request }: LoaderProps<"/about">) {
  return { path: new URL(request.url).pathname };
}

export async function action({ request }: ActionProps<"/about">) {
  const form = await request.formData();

  if (form.get("intent") === "leave") return redirect("/");

  return { said: String(form.get("message")) };
}

export default function About({ loaderData, actionData }: PageProps<"/about">) {
  return (
    <>
      <h1>about</h1>
      <p>loader saw {loaderData.path}</p>
      {actionData && <p>you said {actionData.said}</p>}
      <Form method="post">
        <input name="message" aria-label="message" />
        <button name="intent" value="say">
          say
        </button>
        <button name="intent" value="leave">
          leave
        </button>
      </Form>
    </>
  );
}
