export interface RequestStore {
  id: string;
  later: Promise<void>;
}

export function readStore(): RequestStore {
  const read = (globalThis as { readRequestStore?: () => RequestStore | undefined })
    .readRequestStore;

  const store = read?.();
  if (!store) throw new Error("The request context was lost.");

  return store;
}
