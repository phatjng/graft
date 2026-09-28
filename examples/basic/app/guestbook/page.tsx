import { Form, Link } from "@phatjng/graft";

import { formatDate } from "../format";
import { addEntry, clearEntries, listEntries } from "../guestbook.server";

export async function loader() {
  return { entries: listEntries() };
}

// One action for the page. Each button sends an "intent" saying what to do.
export async function action({ request }: ActionProps<"/guestbook">) {
  const form = await request.formData();

  switch (form.get("intent")) {
    case "sign": {
      const name = String(form.get("name") ?? "").trim();
      if (!name) return { error: "Please write your name." };

      addEntry(name);
      return { signed: name };
    }
    case "clear":
      clearEntries();
      return { cleared: true };
    default:
      return { error: "Unknown request." };
  }
}

export default function Guestbook({ loaderData, actionData }: PageProps<"/guestbook">) {
  return (
    <main>
      <title>Guestbook · Graft</title>
      <h1>Guestbook</h1>
      <p>This form works with JavaScript turned off, too.</p>

      <Form method="post">
        <label>
          Name <input name="name" autoComplete="off" />
        </label>{" "}
        <button type="submit" name="intent" value="sign">
          Sign
        </button>
      </Form>
      {actionData && "error" in actionData && <p role="alert">{actionData.error}</p>}
      {actionData && "signed" in actionData && (
        <p role="status">Thanks for signing, {actionData.signed}!</p>
      )}

      <ul>
        {loaderData.entries.map((entry, index) => (
          <li key={index}>
            {entry.name} ({formatDate(entry.signedAt)})
          </li>
        ))}
      </ul>

      {loaderData.entries.length > 0 && (
        <Form method="post">
          <button type="submit" name="intent" value="clear">
            Clear the guestbook
          </button>
        </Form>
      )}
      <Link href="/">Back home</Link>
    </main>
  );
}
