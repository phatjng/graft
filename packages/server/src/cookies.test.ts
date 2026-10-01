import { afterEach, describe, expect, it, vi } from "vitest";

import { CookieJar } from "./cookies";

const SECRET = "a".repeat(32);
const OLD_SECRET = "b".repeat(32);

function jar(cookie?: string, secrets?: string[]): CookieJar {
  const headers = new Headers();
  if (cookie !== undefined) headers.set("cookie", cookie);

  return new CookieJar(new Request("http://localhost/", { headers }), secrets);
}

/** The `name=value` part of each `Set-Cookie`, as the browser would send it back. */
async function sentBack(from: CookieJar): Promise<string> {
  const headers = await from.setCookieHeaders();
  return headers.map((header) => header.split(";")[0]).join("; ");
}

afterEach(() => {
  vi.useRealTimers();
});

describe("reading", () => {
  it("reads the request's cookies", () => {
    const cookies = jar("theme=dark; lang=en%20GB");

    expect(cookies.get("theme")).toBe("dark");
    expect(cookies.get("lang")).toBe("en GB");
    expect(cookies.get("missing")).toBeUndefined();
    expect(cookies.has("theme")).toBe(true);
    expect(cookies.has("missing")).toBe(false);
  });

  it("works without a Cookie header", () => {
    expect(jar().get("theme")).toBeUndefined();
  });

  it("sees values set and deleted earlier in the request", () => {
    const cookies = jar("theme=dark; lang=en");

    cookies.set("theme", "light");
    cookies.delete("lang");

    expect(cookies.get("theme")).toBe("light");
    expect(cookies.get("lang")).toBeUndefined();
    expect(cookies.has("lang")).toBe(false);
  });
});

describe("writing", () => {
  it("defaults to the whole site, HttpOnly and SameSite=Lax", async () => {
    const cookies = jar();
    cookies.set("theme", "dark");

    expect(await cookies.setCookieHeaders()).toEqual([
      "theme=dark; Path=/; HttpOnly; SameSite=Lax",
    ]);
  });

  it("never sets Secure unless asked", async () => {
    const cookies = jar();
    cookies.set("a", "1");
    cookies.set("b", "2", { secure: true });

    const [a, b] = await cookies.setCookieHeaders();
    expect(a).not.toContain("Secure");
    expect(b).toContain("Secure");
  });

  it("lets every default be overridden", async () => {
    const cookies = jar();
    cookies.set("theme", "dark", { path: "/blog", httpOnly: false, sameSite: "strict" });

    expect(await cookies.setCookieHeaders()).toEqual(["theme=dark; Path=/blog; SameSite=Strict"]);
  });

  it("encodes values", async () => {
    const cookies = jar();
    cookies.set("name", "Ada Lovelace; admin=1");

    expect(await sentBack(cookies)).toBe("name=Ada%20Lovelace%3B%20admin%3D1");
  });

  it("sends one header per cookie, with the last value set", async () => {
    const cookies = jar();
    cookies.set("theme", "dark");
    cookies.set("theme", "light");

    expect(await sentBack(cookies)).toBe("theme=light");
  });

  it("keeps cookies with the same name on different paths apart", async () => {
    const cookies = jar();
    cookies.set("theme", "dark");
    cookies.set("theme", "light", { path: "/blog" });

    expect(await cookies.setCookieHeaders()).toHaveLength(2);
  });

  it("deletes by expiring the cookie on the same path", async () => {
    const cookies = jar("theme=dark");
    cookies.delete("theme");

    const [header] = await cookies.setCookieHeaders();
    expect(header).toMatch(/^theme=; Max-Age=0; Path=\/; Expires=Thu, 01 Jan 1970/);
  });

  it("throws where an invalid cookie is set", () => {
    const cookies = jar();

    expect(() => cookies.set("bad name", "x")).toThrow();
    expect(() => cookies.set("big", "x".repeat(5000))).toThrow(/over the 4096/);
    expect(() => cookies.set("a", "x", { sameSite: "none" })).toThrow(/secure: true/);
    expect(() => cookies.set("a", "x", { partitioned: true })).toThrow(/secure: true/);
  });
});

describe("encrypted cookies", () => {
  it("round-trips a value the browser can't read", async () => {
    const writer = jar(undefined, [SECRET]);
    writer.set("session", "user-42", { encrypted: true });

    const cookie = await sentBack(writer);
    expect(cookie).toMatch(/^session=v1\./);
    expect(cookie).not.toContain("user-42");

    const reader = jar(cookie, [SECRET]);
    expect(await reader.get("session", { encrypted: true })).toBe("user-42");
  });

  it("reads back a value set earlier in the request", async () => {
    const cookies = jar(undefined, [SECRET]);
    cookies.set("session", "user-42", { encrypted: true });

    expect(await cookies.get("session", { encrypted: true })).toBe("user-42");
    expect(cookies.get("session")).toBeUndefined();
  });

  it("rejects a value that was changed", async () => {
    const writer = jar(undefined, [SECRET]);
    writer.set("session", "user-42", { encrypted: true });

    // Flip a character in the middle: the last one can carry unused padding bits.
    const cookie = await sentBack(writer);
    const middle = Math.floor(cookie.length / 2);
    const flipped = cookie[middle] === "A" ? "B" : "A";
    const tampered = cookie.slice(0, middle) + flipped + cookie.slice(middle + 1);

    expect(await jar(tampered, [SECRET]).get("session", { encrypted: true })).toBeUndefined();
  });

  it("rejects a value moved into another cookie", async () => {
    const writer = jar(undefined, [SECRET]);
    writer.set("role", "admin", { encrypted: true });

    const value = (await sentBack(writer)).slice("role=".length);
    const reader = jar(`session=${value}`, [SECRET]);

    expect(await reader.get("session", { encrypted: true })).toBeUndefined();
  });

  it("rejects values that aren't encrypted, or aren't base64", async () => {
    const cookies = jar("a=user-42; b=v1.%25%25%25; c=v1.", [SECRET]);

    expect(await cookies.get("a", { encrypted: true })).toBeUndefined();
    expect(await cookies.get("b", { encrypted: true })).toBeUndefined();
    expect(await cookies.get("c", { encrypted: true })).toBeUndefined();
    expect(await cookies.get("missing", { encrypted: true })).toBeUndefined();
  });

  it("encrypts with the first secret and reads with any of them", async () => {
    const old = jar(undefined, [OLD_SECRET]);
    old.set("session", "user-42", { encrypted: true });
    const oldCookie = await sentBack(old);

    // After rotation, cookies from before it still read.
    const rotated = jar(oldCookie, [SECRET, OLD_SECRET]);
    expect(await rotated.get("session", { encrypted: true })).toBe("user-42");

    // New cookies use the new secret, so they read once the old one is gone.
    rotated.set("session", "user-42", { encrypted: true });
    const newCookie = await sentBack(rotated);
    expect(await jar(newCookie, [SECRET]).get("session", { encrypted: true })).toBe("user-42");

    // And the old cookies stop reading.
    expect(await jar(oldCookie, [SECRET]).get("session", { encrypted: true })).toBeUndefined();
  });

  it("rejects the value once its maxAge has passed", async () => {
    vi.useFakeTimers();

    const writer = jar(undefined, [SECRET]);
    writer.set("session", "user-42", { encrypted: true, maxAge: 60 });
    const cookie = await sentBack(writer);

    vi.advanceTimersByTime(59_000);
    expect(await jar(cookie, [SECRET]).get("session", { encrypted: true })).toBe("user-42");

    vi.advanceTimersByTime(1_000);
    expect(await jar(cookie, [SECRET]).get("session", { encrypted: true })).toBeUndefined();
  });

  it("rejects the value once its expires date has passed", async () => {
    vi.useFakeTimers();

    const writer = jar(undefined, [SECRET]);
    writer.set("session", "user-42", { encrypted: true, expires: new Date(Date.now() + 60_000) });
    const cookie = await sentBack(writer);

    vi.advanceTimersByTime(60_000);
    expect(await jar(cookie, [SECRET]).get("session", { encrypted: true })).toBeUndefined();
  });

  it("needs cookieSecrets", () => {
    const cookies = jar("session=v1.abc");

    expect(() => cookies.set("session", "x", { encrypted: true })).toThrow(/cookieSecrets/);
    expect(() => cookies.get("session", { encrypted: true })).toThrow(/cookieSecrets/);
  });

  it("needs long secrets", () => {
    expect(() => jar(undefined, [SECRET, "short"])).toThrow(/at least 32 characters/);
  });

  it("checks the size of the encrypted value", async () => {
    const cookies = jar(undefined, [SECRET]);
    cookies.set("session", "x".repeat(3500), { encrypted: true });

    await expect(cookies.setCookieHeaders()).rejects.toThrow(/over the 4096/);
  });
});
