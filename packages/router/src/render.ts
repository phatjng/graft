import {
  createElement,
  useState,
  type ComponentType,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from "react";
import { preinit, preloadModule } from "react-dom";

import { NavigatorContext, PathnameContext, RouteFileContext, type Navigator } from "./context";
import type { Cookies } from "./cookies";
import type { PageData } from "./data";
import type { RouteMatch, RouteMatchEntry } from "./route-tree";

export type RouteModules = Record<string, () => Promise<Record<string, unknown>>>;

/** Everything Graft uses from a `page` or `layout` file. */
export interface RouteModule {
  component: ComponentType<any>;
  /** Only on the server: the browser build strips it out. */
  loader?: (args: LoaderProps) => unknown;
  /** Only on the server: the browser build strips it out. */
  action?: (args: LoaderProps) => unknown;
}

export type LoadedRoutes = Record<string, RouteModule>;

/** What a loader or action receives. */
export interface LoaderProps {
  request: Request;
  /** The params from this file's own path. */
  params: Record<string, string>;
  cookies: Cookies;
}

/** Files the browser should start fetching as soon as the HTML arrives. */
export interface RouteAssets {
  /** CSS URLs, added to `<head>` as stylesheets. */
  stylesheets: string[];
  /** JS module URLs, added to `<head>` as module preloads. */
  modules: string[];
  /** Precedence for the stylesheets. React groups and orders stylesheets by it. */
  precedence: string;
}

/**
 * Imports the files of a match, keyed by route ID. The server and the browser
 * both call this, so they end up rendering the same components.
 */
export async function loadRoutes(match: RouteMatch, modules: RouteModules): Promise<LoadedRoutes> {
  const ids = [...match.layouts.map((layout) => layout.id), match.page.id];
  const loaded = await Promise.all(
    ids.map(async (id) => {
      const load = modules[id];
      if (!load) throw new Error(`Graft has no module for the route "${id}".`);

      const { default: component, loader, action } = await load();
      if (typeof component !== "function" && !isExoticComponent(component)) {
        throw new Error(`app/${id} must default-export a React component.`);
      }

      const route: RouteModule = { component: component as ComponentType<any> };
      for (const [name, value] of [
        ["loader", loader],
        ["action", action],
      ] as const) {
        if (value === undefined) continue;
        if (typeof value !== "function")
          throw new Error(`app/${id}: "${name}" must be a function.`);
        route[name] = value as (args: LoaderProps) => unknown;
      }

      return [id, route] as const;
    }),
  );

  return Object.fromEntries(loaded);
}

/**
 * Builds `<RootLayout><BlogLayout><Page /></BlogLayout></RootLayout>` for a
 * match, passing each file its params and loader data. The server and the
 * browser must build exactly the same tree, or hydration fails.
 *
 * The server passes the route's `assets`, which React hoists into `<head>`.
 * The browser passes none, but still renders the same wrapper component so
 * the two trees keep the same shape.
 */
export function createRouteElement(
  match: RouteMatch,
  routes: LoadedRoutes,
  data: PageData,
  assets?: RouteAssets,
): ReactElement {
  // Each file's component is wrapped in a context naming the file, so a
  // <Form> inside it knows which action to post to.
  const render = (entry: RouteMatchEntry, children?: ReactElement): ReactElement =>
    createElement(
      RouteFileContext.Provider,
      { value: { id: entry.id, pathname: entry.pathname } },
      createElement(
        routes[entry.id]!.component,
        {
          params: entry.params,
          loaderData: data.loaderData[entry.id],
          actionData: data.actionData[entry.id],
        },
        children,
      ),
    );

  let element = render(match.page);
  for (const layout of [...match.layouts].reverse()) element = render(layout, element);

  return createElement(Assets, { assets, children: element });
}

function Assets({
  assets,
  children,
}: {
  assets: RouteAssets | undefined;
  children: ReactNode;
}): ReactNode {
  // These calls don't render anything. They tell React to put <link> tags in
  // <head>, which works even though <head> belongs to the user's root layout.
  if (assets) {
    for (const href of assets.stylesheets)
      preinit(href, { as: "style", precedence: assets.precedence });
    for (const href of assets.modules) preloadModule(href, { as: "script" });
  }

  return children;
}

/** `memo()`, `forwardRef()` and `lazy()` return objects, not functions. */
function isExoticComponent(value: unknown): boolean {
  return typeof value === "object" && value !== null && "$$typeof" in value;
}

/** What's on screen: the matched route, its files and their data. */
export interface RouterState {
  /** The path inside the app, without Vite's `base`, as it appears in the URL. */
  pathname: string;
  match: RouteMatch;
  routes: LoadedRoutes;
  data: PageData;
}

/**
 * Provides navigation for the page. The browser passes one that talks to
 * history and fetches data. The server passes none, so Links render as
 * plain links there.
 */
export type UseNavigator = (
  state: RouterState,
  setState: Dispatch<SetStateAction<RouterState>>,
) => Navigator | null;

const noNavigator: UseNavigator = () => null;

/**
 * The root of every Graft page, on the server and in the browser. It holds
 * the current route in state, so client navigation can swap it.
 *
 * Both sides render this same component with the same initial state, so
 * the trees match for hydration.
 */
export function Router({
  initial,
  assets,
  useNavigator = noNavigator,
}: {
  initial: RouterState;
  assets?: RouteAssets;
  useNavigator?: UseNavigator;
}): ReactNode {
  const [state, setState] = useState(initial);
  const navigator = useNavigator(state, setState);

  return createElement(
    NavigatorContext.Provider,
    { value: navigator },
    createElement(
      PathnameContext.Provider,
      { value: state.pathname },
      createRouteElement(state.match, state.routes, state.data, assets),
    ),
  );
}
