import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

export interface CreateRequestOptions {
  /**
   * Take the protocol from the `x-forwarded-proto` header. Only set this
   * behind a proxy that sets the header itself (like Vercel's), which
   * terminates HTTPS and forwards plain HTTP. Anywhere else, a client could
   * send the header and claim any protocol.
   */
  trustProxy?: boolean;
}

/**
 * Converts a Node request into a web `Request`.
 *
 * The request's `signal` aborts if the client disconnects before the response
 * finishes, so rendering can stop early.
 */
export function createRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: CreateRequestOptions = {},
): Request {
  const protocol =
    (options.trustProxy && forwardedProtocol(req)) ||
    ("encrypted" in req.socket && req.socket.encrypted ? "https" : "http");
  const url = new URL(req.url ?? "/", `${protocol}://${req.headers.host ?? "localhost"}`);

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined || name.startsWith(":")) continue; // skip HTTP/2 pseudo-headers
    for (const item of Array.isArray(value) ? value : [value]) headers.append(name, item);
  }

  const controller = new AbortController();
  res.once("close", () => {
    if (!res.writableFinished) controller.abort();
  });

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  return new Request(url, {
    method: req.method ?? "GET",
    headers,
    signal: controller.signal,
    ...(hasBody && {
      body: Readable.toWeb(req) as ReadableStream<Uint8Array>,
      duplex: "half",
    }),
  });
}

/**
 * Writes a web `Response` to a Node response, streaming the body and waiting
 * whenever the socket's buffer is full.
 */
export async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  if (response.statusText) res.statusMessage = response.statusText;

  for (const [name, value] of response.headers) {
    // `Headers` joins repeated headers with ", ", which breaks Set-Cookie.
    if (name === "set-cookie") continue;
    res.setHeader(name, value);
  }

  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) res.setHeader("set-cookie", cookies);

  if (!response.body) {
    res.end();
    return;
  }

  // Send the status and headers now rather than with the first chunk, so the
  // browser can start work (e.g. fetching CSS) while the body is produced.
  res.flushHeaders();

  const reader = response.body.getReader();
  // If the client goes away, stop pulling from the body (e.g. stop rendering).
  const onClose = (): void => void reader.cancel().catch(() => {});
  res.once("close", onClose);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (!res.write(value)) {
        await new Promise<void>((resolve) => {
          const settle = (): void => {
            res.off("drain", settle);
            res.off("close", settle);
            resolve();
          };
          res.once("drain", settle);
          res.once("close", settle);
        });
      }

      if (res.destroyed) return;
    }

    res.end();
  } catch (error) {
    // The status and headers are already sent, so the only way to signal a
    // failure partway through the body is to cut the connection.
    res.destroy(error as Error);
    throw error;
  } finally {
    res.off("close", onClose);
  }
}

/** The first protocol in `x-forwarded-proto`, if it's `http` or `https`. */
function forwardedProtocol(req: IncomingMessage): string | undefined {
  const header = req.headers["x-forwarded-proto"];
  const value = (Array.isArray(header) ? header[0] : header)?.split(",")[0]?.trim().toLowerCase();
  return value === "http" || value === "https" ? value : undefined;
}
