import { secret } from "./secret.server";

// Mistake under test: the component (browser code) uses a server-only module.
export default function Page() {
  return <p>{secret}</p>;
}
