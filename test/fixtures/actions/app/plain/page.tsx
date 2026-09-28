import { counts } from "../counts.server";

export function action() {
  counts.plain += 1;
  return { ran: "plain page" };
}

export default function Plain({ actionData }: PageProps<"/plain">) {
  return (
    <main>
      <form method="post">
        <button type="submit">plain form</button>
      </form>
      {actionData && <p id="plain-result">{actionData.ran}</p>}
    </main>
  );
}
