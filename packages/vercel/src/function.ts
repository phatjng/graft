import type { IncomingMessage, ServerResponse } from "node:http";

import { createRequest, sendResponse } from "@phatjng/graft-node";
import app from "virtual:graft/server";

/**
 * The Vercel function. Vercel's Node runtime calls it with Node's `req` and
 * `res`, and it runs the app's `fetch`, like `graft start` does.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    // Vercel terminates HTTPS and sets x-forwarded-proto itself.
    const response = await app.fetch(createRequest(req, res, { trustProxy: true }));
    await sendResponse(res, response);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("Internal Server Error");
    }
  }
}
