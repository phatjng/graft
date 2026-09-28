import { redirect } from "@phatjng/graft";

export async function loader() {
  throw redirect("/login");
}

export default function GuardedLayout({ children }: LayoutProps<"/guarded">) {
  return <section>{children}</section>;
}
