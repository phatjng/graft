import { useContext, type ComponentPropsWithRef, type SubmitEvent } from "react";

import { withBase } from "./base";
import { NavigatorContext, RouteFileContext } from "./context";
import { ACTION_PARAM } from "./data";

export interface FormProps extends Omit<ComponentPropsWithRef<"form">, "method" | "action"> {
  /** `"get"` (the HTML default) navigates with the fields in the URL; `"post"` runs an action. */
  method?: "get" | "post";
  /**
   * Where to send the form, as a path inside the app like `/search` (Vite's
   * `base` is added in front, as for `<Link>`). By default, a POST goes to the
   * action of the file (layout or page) that renders the `<Form>`, and a GET
   * to that file's URL.
   *
   * A POST with an explicit `action` runs the action of the page at that URL,
   * then shows that page, with or without JavaScript.
   */
  action?: string;
}

/**
 * A form that runs an action (with `method="post"`) or navigates (GET).
 *
 * It renders a real `<form>`, so it works before hydration and without
 * JavaScript: the browser submits it and the server responds with the page.
 * After hydration, it submits with `fetch` instead, and the page updates
 * in place with the action's result and fresh loader data. (With an explicit
 * `action`, the router moves to that URL instead, as the browser would.)
 */
export function Form({ method = "get", action, encType, onSubmit, ...props }: FormProps) {
  const navigator = useContext(NavigatorContext);
  const file = useContext(RouteFileContext);
  const url = formAction(method, action, file);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    onSubmit?.(event);
    if (event.defaultPrevented || !navigator) return;

    const form = event.currentTarget;
    const { submitter } = event;
    // A button can override the form's method, action or target: leave those to the browser.
    if (submitter?.hasAttribute("formmethod") || submitter?.hasAttribute("formaction")) return;

    const windowTarget = submitter?.getAttribute("formtarget") ?? form.target;
    if (windowTarget && windowTarget !== "_self") return;

    const target = new URL(url, window.location.href);
    if (target.origin !== window.location.origin) return;

    // Includes the clicked button's name and value, e.g. intent=delete.
    const formData = new FormData(form, submitter);
    event.preventDefault();

    if (method === "get") {
      target.search = new URLSearchParams(formData as unknown as Record<string, string>).toString();
      navigator.navigate(target);
      return;
    }

    navigator.submit({
      url: target,
      // With an explicit `action` and no marker, the page at that URL runs its action.
      routeId:
        target.searchParams.get(ACTION_PARAM) ?? (action === undefined ? (file?.id ?? null) : null),
      stay: action === undefined,
      // Send the same encoding the browser would.
      body:
        encType === "multipart/form-data"
          ? formData
          : new URLSearchParams(formData as unknown as Record<string, string>),
      form,
    });
  };

  return <form method={method} action={url} encType={encType} {...props} onSubmit={handleSubmit} />;
}

/** The URL a form submits to, the same on the server and in the browser. */
function formAction(
  method: "get" | "post",
  action: string | undefined,
  file: { id: string; pathname: string } | null,
): string {
  if (action !== undefined) return withBase(action);
  if (!file) return "";

  const pathname = withBase(file.pathname);
  if (method === "get") return pathname;

  // The marker names this file, since a layout shares its URL with the page in its folder.
  return `${pathname}?${new URLSearchParams({ [ACTION_PARAM]: file.id })}`;
}
