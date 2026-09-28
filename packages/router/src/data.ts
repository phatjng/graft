import * as devalue from "devalue";

// Loader data travels from the server to the browser inside the HTML, as a
// classic inline script that runs before the app's modules:
//
//   <script>self.__graftData="[{...devalue output...}]"</script>
//
// devalue keeps Date, Map, Set, BigInt, undefined and repeated references
// intact, and fails loudly on values it can't send (functions, class instances).

declare global {
  var __graftData: string | undefined;
}

/** The data a page is rendered with, keyed by route ID. */
export interface PageData {
  loaderData: Record<string, unknown>;
  /** Only set after a form submission without JavaScript. */
  actionData: Record<string, unknown>;
}

/**
 * Returns the script that hands a page's data to the browser. The data is
 * user-controlled, so every `<` is escaped: a value like
 * `</script><script>alert(1)` can't end the script tag early.
 */
export function serializePageData(data: PageData): string {
  let payload: string;
  try {
    payload = devalue.stringify(data);
  } catch (error) {
    const path = (error as { path?: string }).path ?? "";

    // The path starts with the route ID, e.g. `.loaderData["blog/[slug]/page"].post.author`.
    throw new Error(
      `Loader or action data can't be sent to the browser: ${(error as Error).message} (at ${path}). ` +
        `Loaders can return plain objects, arrays, strings, numbers, booleans, null, undefined, ` +
        `Date, Map, Set, BigInt, RegExp and URL.`,
      { cause: error },
    );
  }

  const literal = JSON.stringify(payload)
    .replaceAll("<", "\\u003c")
    .replaceAll(" ", "\\u2028")
    .replaceAll(" ", "\\u2029");

  return `self.__graftData=${literal}`;
}

/** Reads the data the server put in the page. */
export function readPageData(): PageData {
  const payload = globalThis.__graftData;
  return payload === undefined
    ? { loaderData: {}, actionData: {} }
    : (devalue.parse(payload) as PageData);
}

/**
 * The query parameter that turns a page URL into a data request:
 * `/blog/hello?_graft_data=1` returns the loader data for `/blog/hello`
 * instead of its HTML. Client navigation uses it to fetch the next page's data.
 */
export const DATA_PARAM = "_graft_data";

/**
 * The query parameter a `<Form>` adds to its URL to name the file whose
 * action should run: `/dashboard?_graft_action=dashboard/layout`. Without it,
 * a submission runs the page's action.
 */
export const ACTION_PARAM = "_graft_action";

/** The body of a data request's response. */
export type DataResponse =
  /** The loader data, keyed by route ID. */
  | { loaderData: Record<string, unknown> }
  /** What the targeted action returned. */
  | { actionData: unknown }
  /**
   * A loader redirected. A data request can't answer with a real 3xx:
   * `fetch` would follow it silently and the router would never learn the
   * new URL. So the server sends the location as data, and the router
   * navigates there itself.
   */
  | { redirect: string };

export function serializeDataResponse(response: DataResponse): string {
  return devalue.stringify(response);
}

export function parseDataResponse(text: string): DataResponse {
  return devalue.parse(text) as DataResponse;
}
