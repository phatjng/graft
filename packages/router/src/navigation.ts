import { startTransition, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { modules, routes } from "virtual:graft/routes";

import { matchUrl, stripBase } from "./base";
import type { Navigator, Submission } from "./context";
import { ACTION_PARAM, DATA_PARAM, parseDataResponse, type DataResponse } from "./data";
import { loadRoutes, type UseNavigator } from "./render";

/** Stops a chain of redirects that never settles. */
const MAX_REDIRECTS = 10;

type HistoryAction = "push" | "replace" | "pop";

/** An action's result, to show on the page a submission lands on. */
interface ActionResult {
  /** The file whose action ran, or `null` for the page at the URL. */
  routeId: string | null;
  data: unknown;
}

/** What to do with the scroll position once the next page is on screen. */
type ScrollIntent = { restore: string } | { hash: string };

/**
 * Navigation in the browser: fetches the next page's code and data, swaps it
 * in, and keeps history and scroll positions in step.
 *
 * Anything unexpected (no matching route, a failed data request, a network
 * error) falls back to a normal full page load, which always works.
 */
export const useBrowserNavigator: UseNavigator = (_state, setState) => {
  const pending = useRef<AbortController | null>(null);
  const scrollIntent = useRef<ScrollIntent | null>(null);
  /** Forms to reset once their submission's result is on screen. */
  const formsToReset = useRef<HTMLFormElement[]>([]);
  /** The history entry and URL that are on screen now. */
  const current = useRef({ key: "", url: "" });

  /** Replaces any navigation or submission that's still loading. */
  const start = (): AbortController => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;

    return controller;
  };

  const navigator = useMemo<
    Navigator & {
      go(url: URL, action: HistoryAction, redirects?: number, result?: ActionResult): Promise<void>;
    }
  >(
    () => ({
      navigate(url) {
        void this.go(url, "push");
      },

      submit(submission) {
        void submit(submission, start(), this);
      },

      prefetch(url) {
        const match = matchUrl(routes, url.pathname);
        if (!match) return;

        for (const { id } of [...match.layouts, match.page]) {
          // A failed prefetch doesn't matter: navigating will try again.
          modules[id]?.().catch(() => {});
        }
      },

      async go(url, action, redirects = 0, result) {
        const controller = start();

        const match = matchUrl(routes, url.pathname);
        if (!match) return fullPageLoad(url, action);

        let loaded: Awaited<ReturnType<typeof loadRoutes>>;
        let response: DataResponse;
        try {
          [loaded, response] = await Promise.all([
            loadRoutes(match, modules),
            fetchData(url, controller.signal),
          ]);
        } catch (error) {
          if (controller.signal.aborted) return;

          console.error(error);
          return fullPageLoad(url, action);
        }

        if (controller.signal.aborted) return;

        if ("redirect" in response) {
          const target = new URL(response.redirect, url);
          if (target.origin !== window.location.origin || redirects >= MAX_REDIRECTS) {
            return fullPageLoad(target, action);
          }

          // Going back to a page that now redirects replaces its history entry.
          // The action's result was meant for the page that redirected, so it's dropped.
          return this.go(target, action === "pop" ? "replace" : action, redirects + 1);
        }

        saveScrollPosition(current.current.key);
        if (action === "push") window.history.pushState({ key: newKey() }, "", url);
        if (action === "replace") window.history.replaceState({ key: newKey() }, "", url);
        scrollIntent.current = action === "pop" ? { restore: historyKey() } : { hash: url.hash };

        if (!("loaderData" in response)) return fullPageLoad(url, action);
        const { loaderData } = response;
        const actionData = result ? { [result.routeId ?? match.page.id]: result.data } : {};

        // A transition keeps the current page on screen until the next one is ready.
        startTransition(() =>
          setState({
            pathname: stripBase(url.pathname)!,
            match,
            routes: loaded,
            data: { loaderData, actionData },
          }),
        );
      },
    }),
    [setState],
  );

  // Once the new page is on screen, scroll to where it should be.
  useLayoutEffect(() => {
    // After the render, so inputs reset to any new defaultValue.
    for (const form of formsToReset.current.splice(0)) form.reset();

    current.current = { key: historyKey(), url: window.location.href };

    const intent = scrollIntent.current;
    if (!intent) return;
    scrollIntent.current = null;

    if ("restore" in intent) {
      window.scrollTo(0, scrollPositions.get(intent.restore) ?? 0);
    } else if (intent.hash) {
      const target = document.getElementById(decodeURIComponent(intent.hash.slice(1)));
      if (target) target.scrollIntoView();
      else window.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
  });

  useEffect(() => {
    // Within this document, Graft restores scroll positions itself: the
    // browser would do it too early, before the previous page's content is
    // back on screen. Loading a document (a reload, or Back to another one)
    // is left to the browser, which restores the position as the server's
    // HTML arrives, before anything is painted at the top. See onPageHide.
    window.history.scrollRestoration = "manual";

    if (typeof window.history.state?.key !== "string") {
      window.history.replaceState({ ...window.history.state, key: newKey() }, "");
    }

    current.current = { key: historyKey(), url: window.location.href };

    const onPopState = (): void => {
      const previous = new URL(current.current.url);
      const next = new URL(window.location.href);

      // Only the hash changed: the browser handles that on its own.
      if (previous.pathname === next.pathname && previous.search === next.search) {
        current.current = { key: historyKey(), url: next.href };
        return;
      }

      saveScrollPosition(current.current.key);
      void navigator.go(next, "pop");
    };

    const onPageHide = (): void => {
      saveScrollPosition(historyKey());
      persistScrollPositions();

      // The document is going away, so hand scroll restoration back to the
      // browser for when this entry is loaded again. Restoring it after
      // hydration instead would show the top of the page first.
      window.history.scrollRestoration = "auto";
    };

    // The page came back from the back/forward cache, without hydrating again.
    const onPageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) window.history.scrollRestoration = "manual";
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [navigator]);

  /**
   * Sends a form to its action. Afterwards, loaders run again (the action
   * probably changed what they return), and the file whose action ran gets
   * its result as `actionData`.
   *
   * A `<Form>` that posts to its own file stays on the current page. One with
   * an explicit `action` lands on that URL, as it would without JavaScript,
   * unless it's the current URL. Either way, a redirect from the action wins.
   */
  async function submit(
    { url, routeId, stay, body, form }: Submission,
    controller: AbortController,
    navigator: {
      go(url: URL, action: HistoryAction, redirects?: number, result?: ActionResult): Promise<void>;
    },
  ): Promise<void> {
    const here = new URL(window.location.href);

    try {
      const result = await fetchData(url, controller.signal, { method: "POST", body });
      if (controller.signal.aborted) return;
      if ("redirect" in result) return void navigator.go(new URL(result.redirect, url), "push");
      if (!("actionData" in result)) throw new Error("Graft expected the action's result.");

      const destination = new URL(url);
      destination.searchParams.delete(ACTION_PARAM);

      if (!stay && !isSameUrl(destination, here)) {
        formsToReset.current.push(form);
        return void navigator.go(destination, "push", 0, { routeId, data: result.actionData });
      }

      const match = matchUrl(routes, here.pathname)!;
      const [loaded, fresh] = await Promise.all([
        loadRoutes(match, modules),
        fetchData(here, controller.signal),
      ]);

      if (controller.signal.aborted) return;
      if ("redirect" in fresh) return void navigator.go(new URL(fresh.redirect, here), "replace");
      if (!("loaderData" in fresh)) throw new Error("Graft expected loader data.");

      const data = {
        loaderData: fresh.loaderData,
        actionData: { [routeId ?? match.page.id]: result.actionData },
      };
      formsToReset.current.push(form);
      startTransition(() =>
        setState({ pathname: stripBase(here.pathname)!, match, routes: loaded, data }),
      );
    } catch (error) {
      if (controller.signal.aborted) return;

      console.error(error);

      // In dev, Vite's overlay is showing the error on this page. Keep it there.
      if ((import.meta as { hot?: unknown }).hot) return;

      // The action may have run, so don't send it again. Reload the page to
      // show its current state instead.
      fullPageLoad(here, "replace");
    }
  }

  return navigator;
};

/** Makes a data request for `url`: its loader data, or with a POST, its action's result. Throws on anything unexpected. */
async function fetchData(
  url: URL,
  signal: AbortSignal,
  init: RequestInit = {},
): Promise<DataResponse> {
  const dataUrl = new URL(url);
  dataUrl.hash = "";
  dataUrl.searchParams.set(DATA_PARAM, "1");

  const response = await fetch(dataUrl, {
    ...init,
    signal,
    headers: { accept: "application/json" },
  });

  if (!response.ok || !response.headers.get("content-type")?.startsWith("application/json")) {
    throw new Error(
      `Graft couldn't load the data for ${url.pathname} (status ${response.status}).`,
    );
  }

  return parseDataResponse(await response.text());
}

/** Whether two URLs are the same page: same path and query, whatever the hash. */
function isSameUrl(a: URL, b: URL): boolean {
  return a.origin === b.origin && a.pathname === b.pathname && a.search === b.search;
}

/** Loads `url` the ordinary way, as if the router weren't there. */
function fullPageLoad(url: URL, action: HistoryAction): void {
  // The address bar already shows the URL after Back or Forward.
  if (action === "push") window.location.assign(url);
  else window.location.replace(url);
}

function historyKey(): string {
  return (window.history.state?.key as string | undefined) ?? "";
}

function newKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Scroll positions by history entry. They're kept in sessionStorage too, so
// they survive a reload of the page.
const STORAGE_KEY = "graft:scroll";
const scrollPositions = new Map<string, number>(readStoredPositions());

function saveScrollPosition(key: string): void {
  if (key) scrollPositions.set(key, window.scrollY);
}

function readStoredPositions(): [string, number][] {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as [string, number][];
  } catch {
    return [];
  }
}

function persistScrollPositions(): void {
  try {
    // Only keep recent entries, so this can't grow without bound.
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...scrollPositions].slice(-50)));
  } catch {
    // Storage can be full or disabled. Scroll restoration after a reload is a nicety.
  }
}
