import { Form } from "@phatjng/graft";
import { useState } from "react";

import { secret } from "./secret.server";

export function loader({ request }: LoaderProps<"/">) {
  return { url: request.url, hasSecret: secret.length > 0 };
}

export async function action({ request }: ActionProps<"/">) {
  const form = await request.formData();

  return { said: String(form.get("message")) };
}

export default function Home({ loaderData, actionData }: PageProps<"/">) {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1>home</h1>
      <p id="url">{loaderData.url}</p>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
      {actionData && <p>you said {actionData.said}</p>}
      <Form method="post">
        <input name="message" aria-label="message" />
        <button>say</button>
      </Form>
    </>
  );
}
