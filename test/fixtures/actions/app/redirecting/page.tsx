import { Form, redirect } from "@phatjng/graft";

export function action() {
  return redirect("/dashboard", 303);
}

export default function Redirecting() {
  return (
    <Form method="post">
      <button type="submit">save and leave</button>
    </Form>
  );
}
