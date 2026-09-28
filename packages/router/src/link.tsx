import { useContext, type ComponentPropsWithRef, type MouseEvent } from "react";

import { withBase } from "./base";
import { NavigatorContext } from "./context";

export interface LinkProps extends Omit<ComponentPropsWithRef<"a">, "href"> {
  /**
   * A path inside the app, like `/blog`. When the app has a Vite `base`, it's
   * added in front. Full URLs and relative paths are used as they are.
   */
  href: string;
}

/**
 * A link to another page of the app. It renders a normal `<a>`, so it works
 * before hydration and without JavaScript. After hydration, clicking it
 * loads the next page's code and data and renders it without a full page load.
 *
 * Hovering or focusing it starts downloading the next page's code early.
 */
export function Link({
  href: path,
  onClick,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: LinkProps) {
  const navigator = useContext(NavigatorContext);
  const href = withBase(path);

  const prefetch = (): void => {
    const url = appUrl(href);
    if (navigator && url) navigator.prefetch(url);
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    onClick?.(event);
    if (!navigator || !isPlainClick(event, props.target, props.download)) return;

    const url = appUrl(href);
    if (!url) return;

    // A link to another part of the same page: let the browser scroll there.
    const current = window.location;
    if (url.hash && url.pathname === current.pathname && url.search === current.search) return;

    event.preventDefault();
    navigator.navigate(url);
  };

  return (
    <a
      href={href}
      {...props}
      onClick={handleClick}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        prefetch();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        prefetch();
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        prefetch();
      }}
    />
  );
}

/** A left click with no modifier keys, on a link that opens in the same tab. */
function isPlainClick(event: MouseEvent, target: string | undefined, download: unknown): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    (target === undefined || target === "_self") &&
    download === undefined
  );
}

/** The URL for `href` if it's on this site, otherwise `null`. */
function appUrl(href: string): URL | null {
  const url = new URL(href, window.location.href);
  return url.origin === window.location.origin ? url : null;
}
