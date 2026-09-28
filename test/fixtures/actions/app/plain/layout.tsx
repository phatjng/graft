import { counts } from "../counts.server";

// Must not run for an unmarked POST to /plain: that goes to the page.
export function action() {
  counts.plainLayout += 1;
  return { ran: "plain layout" };
}

export default function PlainLayout({ children }: LayoutProps<"/plain">) {
  return <section>{children}</section>;
}
