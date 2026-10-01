import type { CookieOptions, Cookies, DeleteCookieOptions } from "@phatjng/graft-router";
import { parseCookie, stringifySetCookie, type SetCookie } from "cookie";

/** A cookie set during the request, waiting to go on the response. */
interface Outgoing {
  cookie: SetCookie;
  encrypted: boolean;
  /** For an encrypted cookie: the time after which reads reject it, in ms. */
  expiresAt?: number | undefined;
}

// Browsers ignore a cookie whose name and value add up to more than this.
const MAX_COOKIE_SIZE = 4096;

const MIN_SECRET_LENGTH = 32;

/**
 * The `cookies` that loaders and actions receive. One jar lives for the whole
 * request, so a loader that runs after an action sees what the action set.
 */
export class CookieJar implements Cookies {
  #incoming: Record<string, string | undefined>;
  #outgoing = new Map<string, Outgoing>();
  #secrets: string[];

  constructor(request: Request, secrets: string[] = []) {
    for (const secret of secrets) {
      if (secret.length < MIN_SECRET_LENGTH) {
        throw new Error(
          `Each of cookieSecrets must be at least ${MIN_SECRET_LENGTH} characters. ` +
            "Generate one with `openssl rand -base64 32`.",
        );
      }
    }

    this.#incoming = parseCookie(request.headers.get("cookie") ?? "");
    this.#secrets = secrets;
  }

  get(name: string): string | undefined;
  get(name: string, options: { encrypted: true }): Promise<string | undefined>;
  get(
    name: string,
    options?: { encrypted?: boolean },
  ): string | undefined | Promise<string | undefined> {
    const encrypted = options?.encrypted === true;
    if (encrypted) this.#requireSecrets();

    // A cookie set earlier in this request reads back as it was set. Reading
    // it in the other mode gives `undefined`, like it would on the next request.
    const written = this.#lastWrite(name);
    if (written) {
      const readable = written.encrypted === encrypted && !isRemoval(written.cookie);
      const value = readable ? written.cookie.value : undefined;

      return encrypted ? Promise.resolve(value) : value;
    }

    const value = this.#incoming[name];
    if (!encrypted) return value;

    return value === undefined ? Promise.resolve(undefined) : decrypt(name, value, this.#secrets);
  }

  has(name: string): boolean {
    const written = this.#lastWrite(name);
    if (written) return !isRemoval(written.cookie);

    return this.#incoming[name] !== undefined;
  }

  set(name: string, value: string, options: CookieOptions = {}): void {
    const { encrypted = false, ...attributes } = options;
    const cookie: SetCookie = { name, value, ...attributes };
    cookie.path ??= "/";
    cookie.httpOnly ??= true;
    cookie.sameSite ??= "lax";

    if ((cookie.sameSite === "none" || cookie.partitioned) && !cookie.secure) {
      const option = cookie.partitioned ? "partitioned: true" : 'sameSite: "none"';
      throw new Error(`Cookie "${name}": browsers reject ${option} without secure: true.`);
    }

    // Serialize now, so a bad name or option throws where it was set. An
    // encrypted value's size is only known once it's encrypted.
    stringifySetCookie({ ...cookie, value: "" });

    let expiresAt: number | undefined;
    if (encrypted) {
      this.#requireSecrets();

      if (cookie.maxAge !== undefined) expiresAt = Date.now() + cookie.maxAge * 1000;
      else if (cookie.expires) expiresAt = cookie.expires.getTime();
    } else {
      checkSize(stringifySetCookie({ name, value }), name);
    }

    this.#outgoing.set(keyOf(cookie), { cookie, encrypted, expiresAt });
  }

  delete(name: string, options: DeleteCookieOptions = {}): void {
    const cookie: SetCookie = {
      name,
      value: "",
      path: options.path ?? "/",
      ...(options.domain !== undefined && { domain: options.domain }),
      maxAge: 0,
      expires: new Date(0),
    };

    this.#outgoing.set(keyOf(cookie), { cookie, encrypted: false });
  }

  /** The `Set-Cookie` header values for the response, one per cookie. */
  async setCookieHeaders(): Promise<string[]> {
    const headers = [...this.#outgoing.values()].map(async ({ cookie, encrypted, expiresAt }) => {
      if (!encrypted) return stringifySetCookie(cookie);

      const value = await encrypt(cookie.name, cookie.value ?? "", expiresAt, this.#secrets[0]!);
      const header = stringifySetCookie({ ...cookie, value });
      checkSize(stringifySetCookie({ name: cookie.name, value }), cookie.name);

      return header;
    });

    return Promise.all(headers);
  }

  /** The most recent `set` or `delete` of a name in this request, whatever its path. */
  #lastWrite(name: string): Outgoing | undefined {
    let last: Outgoing | undefined;
    for (const outgoing of this.#outgoing.values()) {
      if (outgoing.cookie.name === name) last = outgoing;
    }

    return last;
  }

  #requireSecrets(): void {
    if (this.#secrets.length > 0) return;

    throw new Error(
      "Encrypted cookies need a secret: pass `cookieSecrets` to handle() in app/server.ts.",
    );
  }
}

/** Browsers keep one cookie per name, domain and path, so a later set replaces an earlier one. */
function keyOf(cookie: SetCookie): string {
  return `${cookie.name};${cookie.domain ?? ""};${cookie.path ?? ""}`;
}

/** Whether a cookie tells the browser to remove it, like `delete()` does. */
function isRemoval(cookie: SetCookie): boolean {
  if (cookie.maxAge !== undefined) return cookie.maxAge <= 0;

  return cookie.expires !== undefined && cookie.expires.getTime() <= Date.now();
}

function checkSize(nameAndValue: string, name: string): void {
  if (nameAndValue.length <= MAX_COOKIE_SIZE) return;

  throw new Error(
    `Cookie "${name}" is ${nameAndValue.length} bytes, over the ${MAX_COOKIE_SIZE} browsers accept.`,
  );
}

// Encrypted values are `v1.` followed by base64url(iv + ciphertext + tag),
// from AES-256-GCM. The plaintext is JSON: the value, plus when it expires.
// The cookie's name is authenticated too, so a value can't be moved into
// another cookie. The version prefix lets the format change later without
// misreading cookies that are already out there.

const VERSION = "v1.";
const IV_LENGTH = 12;

interface Payload {
  value: string;
  expiresAt?: number | undefined;
}

async function encrypt(
  name: string,
  value: string,
  expiresAt: number | undefined,
  secret: string,
): Promise<string> {
  const payload: Payload = { value, expiresAt };
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(name) },
    await keyFor(secret),
    encoder.encode(JSON.stringify(payload)),
  );

  const bytes = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  bytes.set(iv);
  bytes.set(new Uint8Array(ciphertext), IV_LENGTH);

  return VERSION + toBase64Url(bytes);
}

/**
 * Tries each secret in order, so cookies encrypted with an older one still
 * read after a new secret is added in front. Anything that doesn't decrypt,
 * or has expired, is `undefined`: a bad cookie from the browser must never
 * turn into an error.
 */
async function decrypt(
  name: string,
  value: string,
  secrets: string[],
): Promise<string | undefined> {
  if (!value.startsWith(VERSION)) return undefined;

  const bytes = fromBase64Url(value.slice(VERSION.length));
  if (!bytes || bytes.length <= IV_LENGTH) return undefined;

  const iv = bytes.subarray(0, IV_LENGTH);
  const ciphertext = bytes.subarray(IV_LENGTH);

  for (const secret of secrets) {
    let plaintext: ArrayBuffer;
    try {
      plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, additionalData: encoder.encode(name) },
        await keyFor(secret),
        ciphertext,
      );
    } catch {
      continue;
    }

    const payload = JSON.parse(decoder.decode(plaintext)) as Payload;
    if (payload.expiresAt !== undefined && payload.expiresAt <= Date.now()) return undefined;

    return payload.value;
  }

  return undefined;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const keys = new Map<string, Promise<CryptoKey>>();

/** An AES key derived from a secret with HKDF, so any long enough string works as a secret. */
function keyFor(secret: string): Promise<CryptoKey> {
  let key = keys.get(secret);
  if (key) return key;

  key = crypto.subtle
    .importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"])
    .then((material) =>
      crypto.subtle.deriveKey(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: new Uint8Array(),
          info: encoder.encode("graft cookie v1"),
        },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      ),
    );

  keys.set(secret, key);
  return key;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | undefined {
  let binary: string;
  try {
    binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
  } catch {
    return undefined;
  }

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
