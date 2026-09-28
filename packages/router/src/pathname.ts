import { useContext } from "react";

import { PathnameContext } from "./context";

/**
 * The current path inside the app, like `/blog/hello-world`: without Vite's
 * `base` (the same kind of path `<Link href>` takes) and without the query
 * string or hash. It's percent-encoded, as in the URL.
 *
 * It's the same on the server and in the browser, so it's safe to render
 * during hydration, and it changes in the same render as the page after a
 * client navigation.
 *
 * ```tsx
 * const pathname = usePathname();
 * <Link href="/blog" aria-current={pathname === "/blog" ? "page" : undefined}>Blog</Link>
 * ```
 */
export function usePathname(): string {
  const pathname = useContext(PathnameContext);
  if (pathname === null) {
    throw new Error("usePathname() only works in components that Graft renders.");
  }

  return pathname;
}
