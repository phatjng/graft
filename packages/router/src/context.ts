import { createContext } from "react";

/** What `<Link>` and `<Form>` need from the router in the browser. */
export interface Navigator {
  navigate(url: URL): void;
  /** Starts downloading a URL's route code, so a navigation to it starts sooner. */
  prefetch(url: URL): void;
  /** Sends a form submission to an action, then shows its result. */
  submit(submission: Submission): void;
}

export interface Submission {
  /** The action's URL, including the `_graft_action` marker when there is one. */
  url: URL;
  /**
   * The route ID of the file whose action runs, to pass it `actionData`.
   * `null` when the URL has no marker: the page at `url` then runs it.
   */
  routeId: string | null;
  /**
   * Whether the result shows on the current page. True for a `<Form>` that
   * posts to its own file (the default), false for one with an explicit
   * `action`, which lands on that URL, as it would without JavaScript.
   */
  stay: boolean;
  body: FormData | URLSearchParams;
  /** Reset once the result is on screen, like after a submission without JavaScript. */
  form: HTMLFormElement;
}

/** The file (layout or page) a component belongs to. `<Form>` posts to it. */
export interface RouteFile {
  id: string;
  /** The file's URL, e.g. `/dashboard` for `dashboard/layout`. */
  pathname: string;
}

export const RouteFileContext = createContext<RouteFile | null>(null);

/** The current path inside the app, without Vite's `base`. See `usePathname()`. */
export const PathnameContext = createContext<string | null>(null);

/** `null` on the server and before hydration, where a Link is a plain link. */
export const NavigatorContext = createContext<Navigator | null>(null);
