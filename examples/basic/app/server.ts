import { handle } from "@phatjng/graft/server";

// A real app reads its secret from the environment and refuses to start
// without one. The fallback only keeps this example running with no setup.
// Generate a secret with `openssl rand -base64 32`.
const cookieSecrets = [process.env.COOKIE_SECRET ?? "examples/basic: for development only"];

export default {
  fetch: (request: Request) => handle(request, { cookieSecrets }),
};
