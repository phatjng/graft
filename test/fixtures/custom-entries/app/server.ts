import { AsyncLocalStorage } from "node:async_hooks";

import { handle } from "@phatjng/graft/server";

import type { RequestStore } from "./store";

const storage = new AsyncLocalStorage<RequestStore>();

// Pages read the store through a global so they don't import node:async_hooks.
(globalThis as { readRequestStore?: () => RequestStore | undefined }).readRequestStore = () =>
  storage.getStore();

export default {
  fetch(request: Request) {
    const store: RequestStore = {
      id: request.headers.get("x-request-id") ?? "none",
      // Resolves after the shell has been sent, so part of the page renders late.
      later: new Promise((resolve) => setTimeout(resolve, 100)),
    };

    return storage.run(store, () => handle(request));
  },
};
