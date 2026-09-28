import { Link, usePathname } from "@phatjng/graft";

import { isGroup, nav, pages, type NavGroup, type NavLink } from "./nav";

import "./styles.css";

export default function RootLayout({ children }: LayoutProps<"/">) {
  // A trailing slash matches the same page: /installation/ is /installation.
  const pathname = usePathname().replace(/(.)\/$/, "$1");
  const index = pages.findIndex((page) => page.href === pathname);
  const previous = index > 0 ? pages[index - 1] : undefined;
  const next = index >= 0 ? pages[index + 1] : undefined;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>
        <aside>
          <p>
            <Link href="/">
              <strong>Graft</strong>
            </Link>
          </p>
          <nav aria-label="Docs">
            <NavList items={nav} pathname={pathname} />
          </nav>
        </aside>
        <div>
          <main>{children}</main>
          {(previous || next) && (
            <nav aria-label="Previous and next pages">
              {previous ? (
                <Link href={previous.href} rel="prev">
                  ← {previous.title}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link href={next.href} rel="next">
                  {next.title} →
                </Link>
              )}
            </nav>
          )}
        </div>
      </body>
    </html>
  );
}

function NavList({ items, pathname }: { items: (NavLink | NavGroup)[]; pathname: string }) {
  return (
    <ul>
      {items.map((item) =>
        isGroup(item) ? (
          <li key={item.title}>
            <strong>{item.title}</strong>
            <NavList items={item.items} pathname={pathname} />
          </li>
        ) : (
          <li key={item.href}>
            <Link href={item.href} aria-current={item.href === pathname ? "page" : undefined}>
              {item.title}
            </Link>
          </li>
        ),
      )}
    </ul>
  );
}
