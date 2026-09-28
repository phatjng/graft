import { redirect } from "@phatjng/graft";

export function loader(): never {
  throw redirect("/");
}

export default function Page() {
  return <p>unreachable</p>;
}
