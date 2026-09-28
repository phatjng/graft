import { Form } from "@phatjng/graft";

import { counts } from "../counts.server";

export async function action({ request }: ActionProps<"/dashboard">) {
  const form = await request.formData();

  counts.page += 1;
  return { ran: "page", intent: String(form.get("intent")) };
}

export default function Dashboard({ actionData }: PageProps<"/dashboard">) {
  return (
    <main>
      <h1>dashboard</h1>
      <Form method="post">
        <button type="submit" name="intent" value="save">
          page action
        </button>
      </Form>
      {actionData && <p id="page-result">{`${actionData.ran}: ${actionData.intent}`}</p>}
    </main>
  );
}
