import { redirect } from "@phatjng/graft";

export function loader() {
  return redirect("/", 303);
}

export default function Page() {
  return <p>unreachable</p>;
}
