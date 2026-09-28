import { redirect } from "@phatjng/graft";

export function loader() {
  throw redirect("/about");
}

export default function Private() {
  return <h1>unreachable</h1>;
}
