import { handle } from "@phatjng/graft/server";

export const SECRET = "the current secret, at least 32 characters long";
export const OLD_SECRET = "the previous secret, at least 32 characters long";

export default {
  fetch(request: Request) {
    // Lets a test issue cookies the way the app did before the secret was rotated.
    const rotated = request.headers.get("x-before-rotation") === null;
    const cookieSecrets = rotated ? [SECRET, OLD_SECRET] : [OLD_SECRET];

    return handle(request, { cookieSecrets });
  },
};
