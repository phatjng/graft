import { Form } from "@phatjng/graft";

export function action(): never {
  throw new Error("action exploded");
}

export default function Failing() {
  return (
    <Form method="post">
      <button type="submit">fail</button>
    </Form>
  );
}
