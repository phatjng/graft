import { redirect } from "@phatjng/graft";

export function loader() {
  throw redirect("/about?from=redirect");
}

export default function Redirect() {
  return <h1>unreachable</h1>;
}
