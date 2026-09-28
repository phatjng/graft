import { Suspense, use } from "react";

import { readStore } from "../store";

// Only requested over HTTP in tests: it reads a server-only context.
export default function ContextPage(_props: PageProps<"/context">) {
  return (
    <main>
      <p>early: {readStore().id}</p>
      <Suspense fallback={<p>waiting</p>}>
        <Late />
      </Suspense>
    </main>
  );
}

function Late() {
  use(readStore().later);
  // Rendered after the promise resolves, which is after the shell was sent.
  return <p>late: {readStore().id}</p>;
}
