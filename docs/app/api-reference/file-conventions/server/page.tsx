import { Link } from "@phatjng/graft";

import { Code } from "../../../components";

export default function ServerEntry() {
  return (
    <>
      <title>server.ts · Graft</title>
      <h1>server.ts</h1>
      <p>
        <code>app/server.ts</code> is the server entry. Every request to your app goes through it,
        in development and in production. It default-exports an object with a{" "}
        <code>fetch(request)</code> method, and hands requests to Graft with{" "}
        <Link href="/api-reference/functions/handle">
          <code>handle()</code>
        </Link>
        :
      </p>
      <Code file="app/server.ts">{`
import { handle } from "@phatjng/graft/server";

export default {
  fetch: (request: Request) => handle(request),
};
`}</Code>
      <p>
        The file is optional. Without it, Graft uses a built-in entry that does exactly this. It can
        be <code>server.ts</code>, <code>server.tsx</code>, <code>server.js</code> or{" "}
        <code>server.jsx</code>.
      </p>

      <h2>Handling requests before Graft</h2>
      <p>
        It's a plain <code>fetch</code> handler, so you can answer some requests yourself or change
        the response Graft returns:
      </p>
      <Code file="app/server.ts">{`
import { handle } from "@phatjng/graft/server";

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") return new Response("ok");

    const response = await handle(request);
    response.headers.set("x-frame-options", "DENY");
    return response;
  },
};
`}</Code>

      <h2>Request context</h2>
      <p>
        All the work for a request happens inside the call to <code>fetch</code>: routing, loaders,
        actions and rendering, including the parts of the page that finish streaming after the{" "}
        <code>Response</code> has been returned. So you can wrap <code>handle()</code> in{" "}
        <code>AsyncLocalStorage.run()</code> and read your context anywhere below it:
      </p>
      <Code file="app/server.ts">{`
import { AsyncLocalStorage } from "node:async_hooks";

import { handle } from "@phatjng/graft/server";

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export default {
  fetch(request: Request) {
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    return requestContext.run({ requestId }, () => handle(request));
  },
};
`}</Code>
      <p>
        A loader, or a <code>.server.ts</code> module it calls, can now read{" "}
        <code>requestContext.getStore()</code>.
      </p>

      <h2>In the build</h2>
      <p>
        <code>vite build</code> bundles this file into <code>dist/server/index.js</code>, which
        default-exports the same <code>{"{ fetch }"}</code> object. It never reaches the browser.
      </p>
    </>
  );
}
