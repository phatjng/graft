import { Form } from "@phatjng/graft";

import { counts } from "../counts.server";

export function loader() {
  return { ...counts };
}

export async function action({ request }: ActionProps<"/dashboard">) {
  const form = await request.formData();

  counts.layout += 1;
  return { ran: "layout", note: String(form.get("note")) };
}

export default function DashboardLayout({
  children,
  loaderData,
  actionData,
}: LayoutProps<"/dashboard">) {
  return (
    <div>
      <p id="counts">
        layout {loaderData.layout}, page {loaderData.page}
      </p>
      <Form method="post">
        <input type="hidden" name="note" value="from the layout" />
        <button type="submit">layout action</button>
      </Form>
      {actionData && <p id="layout-result">{`${actionData.ran}: ${actionData.note}`}</p>}
      {children}
    </div>
  );
}
