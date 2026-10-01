import { Form } from "@phatjng/graft";

export function loader({ cookies }: LoaderProps<"/theme">) {
  return { theme: cookies.get("theme") ?? "light" };
}

export async function action({ request, cookies }: ActionProps<"/theme">) {
  const theme = String((await request.formData()).get("theme"));
  cookies.set("theme", theme, { maxAge: 60 * 60 * 24 * 365 });

  return { saved: theme };
}

export default function Theme({ loaderData, actionData }: PageProps<"/theme">) {
  return (
    <>
      <p id="theme">theme {loaderData.theme}</p>
      {actionData && <p id="saved">saved {actionData.saved}</p>}
      <Form method="post">
        <input type="hidden" name="theme" value={loaderData.theme === "light" ? "dark" : "light"} />
        <button type="submit">toggle</button>
      </Form>
    </>
  );
}
