// Types only: the server implements them (CookieJar in graft-server), and
// loaders and actions receive them.

/** Options for `cookies.set()`. */
export interface CookieOptions {
  /** Seconds until the cookie expires. Takes precedence over `expires`. */
  maxAge?: number;
  /** When the cookie expires. Without `maxAge` or `expires`, it lasts until the browser closes. */
  expires?: Date;
  /** Defaults to `"/"`, so the cookie is sent to every page. */
  path?: string;
  domain?: string;
  /** Defaults to `true`, so JavaScript in the browser can't read the cookie. */
  httpOnly?: boolean;
  /** Only send the cookie over HTTPS. Never set by default. */
  secure?: boolean;
  /** Defaults to `"lax"`. `"none"` needs `secure: true`. */
  sameSite?: "lax" | "strict" | "none";
  /** Needs `secure: true`. */
  partitioned?: boolean;
  /**
   * Encrypt the value with the `cookieSecrets` passed to `handle()`. The
   * browser can't read or change it, and it's only readable with
   * `await cookies.get(name, { encrypted: true })`.
   */
  encrypted?: boolean;
}

/** Options for `cookies.delete()`. They must match the ones the cookie was set with. */
export interface DeleteCookieOptions {
  path?: string;
  domain?: string;
}

/** The cookies of a request, and the ones to set on its response. */
export interface Cookies {
  /** The cookie's value, or `undefined` if the request doesn't have it. */
  get(name: string): string | undefined;
  /**
   * The decrypted value of a cookie set with `encrypted: true`, or
   * `undefined` if it's missing, expired or was tampered with.
   */
  get(name: string, options: { encrypted: true }): Promise<string | undefined>;
  has(name: string): boolean;
  set(name: string, value: string, options?: CookieOptions): void;
  delete(name: string, options?: DeleteCookieOptions): void;
}
