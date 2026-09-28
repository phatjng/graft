import { createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { modules, routes } from "virtual:graft/routes";

import { matchUrl, stripBase } from "./base";
import { readPageData } from "./data";
import { useBrowserNavigator } from "./navigation";
import { loadRoutes, Router } from "./render";

/**
 * Makes the server-rendered page interactive.
 *
 * The server already sent the page's HTML. Hydration renders the same React
 * tree in the browser and attaches it to that existing HTML (event handlers,
 * state, effects) instead of creating new DOM. To build the same tree, the
 * browser matches the URL itself, imports the same layouts and page, and
 * reads the loader data the server embedded in the HTML.
 *
 * The built-in client entry calls this. A custom `app/client.ts` should too.
 */
export async function hydrate(): Promise<void> {
  const match = matchUrl(routes, window.location.pathname);
  // Graft's built-in error pages are plain HTML with nothing to hydrate.
  if (!match) return;

  const loaded = await loadRoutes(match, modules);

  // In dev, the server links the page's CSS so it doesn't flash unstyled.
  // Importing the route files above has now loaded the same CSS through Vite
  // (which can hot-update it), so the server's copies can go.
  for (const link of document.querySelectorAll('link[data-precedence="graft-dev"]')) {
    link.remove();
  }

  const initial = {
    pathname: stripBase(window.location.pathname)!,
    match,
    routes: loaded,
    data: readPageData(),
  };

  hydrateRoot(document, createElement(Router, { initial, useNavigator: useBrowserNavigator }));
}
