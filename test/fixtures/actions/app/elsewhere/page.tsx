import { Form } from "@phatjng/graft";

// A form whose explicit `action` is another page: submitting it runs that
// page's action and lands there, with or without JavaScript.
export default function Elsewhere() {
  return (
    <main>
      <h1>elsewhere</h1>
      <Form method="post" action="/dashboard">
        <button type="submit" name="intent" value="from elsewhere">
          save on the dashboard
        </button>
      </Form>
    </main>
  );
}
