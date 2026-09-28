import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { createRequest, sendResponse, type CreateRequestOptions } from "./bridge";

let server: Server | undefined;

afterEach(async () => {
  await new Promise((resolve) => server?.close(resolve));
  server = undefined;
});

/** Starts a Node server that runs `handler` through the bridge. */
async function serve(
  handler: (request: Request) => Response | Promise<Response>,
  options: CreateRequestOptions = {},
): Promise<string> {
  server = createServer(async (req, res) => {
    await sendResponse(res, await handler(createRequest(req, res, options)));
  });

  await new Promise<void>((resolve) => server!.listen(0, resolve));

  return `http://localhost:${(server!.address() as AddressInfo).port}`;
}

describe("createRequest", () => {
  it("carries the URL, method and headers", async () => {
    let seen: Request | undefined;
    const origin = await serve((request) => {
      seen = request;
      return new Response("ok");
    });

    await fetch(`${origin}/blog/hello?x=1`, { headers: { "x-test": "yes" } });

    expect(seen!.url).toBe(`${origin}/blog/hello?x=1`);
    expect(seen!.method).toBe("GET");
    expect(seen!.headers.get("x-test")).toBe("yes");
  });

  it("takes the protocol from x-forwarded-proto only behind a trusted proxy", async () => {
    const echo = (request: Request): Response => new Response(new URL(request.url).protocol);
    const headers = { "x-forwarded-proto": "https, http" };

    const trusting = await serve(echo, { trustProxy: true });
    expect(await (await fetch(trusting, { headers })).text()).toBe("https:");

    const bogus = { "x-forwarded-proto": "gopher" };
    expect(await (await fetch(trusting, { headers: bogus })).text()).toBe("http:");

    await new Promise((resolve) => server?.close(resolve));

    const plain = await serve(echo);
    expect(await (await fetch(plain, { headers })).text()).toBe("http:");
  });

  it("streams the body of a POST", async () => {
    const origin = await serve(async (request) => new Response(`got ${await request.text()}`));
    const response = await fetch(origin, { method: "POST", body: "name=graft" });

    expect(await response.text()).toBe("got name=graft");
  });

  it("aborts the signal when the client disconnects", async () => {
    let aborted!: Promise<boolean>;
    const origin = await serve((request) => {
      aborted = new Promise((resolve) =>
        request.signal.addEventListener("abort", () => resolve(true)),
      );
      // A body that never ends.
      return new Response(new ReadableStream({ pull: () => new Promise(() => {}) }));
    });

    const controller = new AbortController();
    const response = await fetch(origin, { signal: controller.signal });
    expect(response.status).toBe(200);
    controller.abort();

    await expect(aborted).resolves.toBe(true);
  });
});

describe("sendResponse", () => {
  it("sends status and headers, keeping each Set-Cookie separate", async () => {
    const origin = await serve(() => {
      const headers = new Headers({ "x-graft": "1" });
      headers.append("set-cookie", "a=1; Path=/");
      headers.append("set-cookie", "b=2; Path=/");

      return new Response("created", { status: 201, headers });
    });

    const response = await fetch(origin);
    expect(response.status).toBe(201);
    expect(response.headers.get("x-graft")).toBe("1");
    expect(response.headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
    expect(await response.text()).toBe("created");
  });

  it("streams the body chunk by chunk", async () => {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));

    const origin = await serve(() => {
      const encoder = new TextEncoder();

      return new Response(
        new ReadableStream({
          async start(controller) {
            controller.enqueue(encoder.encode("first "));
            await released;
            controller.enqueue(encoder.encode("second"));
            controller.close();
          },
        }),
      );
    });

    const response = await fetch(origin);
    const reader = response.body!.getReader();

    // The first chunk arrives before the stream has finished.
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("first ");

    release();

    expect(new TextDecoder().decode((await reader.read()).value)).toBe("second");
  });

  it("sends a response without a body", async () => {
    const origin = await serve(() => new Response(null, { status: 204 }));
    const response = await fetch(origin);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});
