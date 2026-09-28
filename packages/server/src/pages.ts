// Graft's built-in error pages: plain HTML with no JavaScript.

function page(status: number, title: string, message: string, headers?: HeadersInit): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${status}: ${title}</title>
    <style>
      body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; }
      h1 { font-weight: 500; }
    </style>
  </head>
  <body>
    <h1>${status}: ${message}</h1>
  </body>
</html>
`;

  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  });
}

export function notFound(): Response {
  return page(404, "Not Found", "This page could not be found.");
}

export function methodNotAllowed(): Response {
  return page(405, "Method Not Allowed", "This page has no action for that request.", {
    allow: "GET, HEAD",
  });
}

export function serverError(): Response {
  return page(500, "Internal Server Error", "Something went wrong.");
}

export function badRequest(): Response {
  return page(400, "Bad Request", "This form was sent to a page that doesn't have it.");
}

export function forbidden(): Response {
  return page(403, "Forbidden", "This request came from another site.");
}
