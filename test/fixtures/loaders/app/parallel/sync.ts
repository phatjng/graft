// Lets the page's loader unblock the layout's. If loaders ran one after
// another (layout first), the layout would wait forever.
const started = new WeakMap<Request, () => void>();
const promises = new WeakMap<Request, Promise<void>>();

export function pageStarted(request: Request): Promise<void> {
  let promise = promises.get(request);
  if (!promise) {
    promise = new Promise((resolve) => started.set(request, resolve));
    promises.set(request, promise);
  }

  return promise;
}

export function markPageStarted(request: Request): void {
  void pageStarted(request);
  started.get(request)!();
}
