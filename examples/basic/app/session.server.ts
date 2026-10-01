import type { Cookies } from "@phatjng/graft";

// The session is the user's name, in an encrypted cookie: the browser can
// neither read nor change it. A real app would store a user or session ID.

const COOKIE = "session";

export function getUser(cookies: Cookies): Promise<string | undefined> {
  return cookies.get(COOKIE, { encrypted: true });
}

export function signIn(cookies: Cookies, name: string): void {
  cookies.set(COOKIE, name, {
    encrypted: true,
    maxAge: 60 * 60 * 24 * 7,
    // HTTPS only once deployed. The dev server runs over plain http.
    secure: import.meta.env.PROD,
  });
}

export function signOut(cookies: Cookies): void {
  cookies.delete(COOKIE);
}
