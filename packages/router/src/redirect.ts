export type RedirectStatus = 301 | 302 | 303 | 307 | 308;

/**
 * Creates a redirect for a loader or an action to return or throw.
 *
 * `url` is a path inside the app, like `/login`, or a full URL. When the app
 * has a Vite `base`, Graft adds it in front of paths: `/app/login`.
 *
 * ```ts
 * export async function loader({ cookies }: LoaderProps<"/dashboard">) {
 *   if (!(await getUser(cookies))) throw redirect("/login");
 *   ...
 * }
 * ```
 */
export function redirect(url: string, status: RedirectStatus = 302): Response {
  // Not Response.redirect(): it requires an absolute URL in some runtimes.
  return new Response(null, { status, headers: { location: url } });
}

/** Whether a value is a redirect `Response`, from `redirect()` or built by hand. */
export function isRedirect(value: unknown): value is Response {
  return (
    value instanceof Response &&
    value.status >= 300 &&
    value.status < 400 &&
    value.headers.has("location")
  );
}
