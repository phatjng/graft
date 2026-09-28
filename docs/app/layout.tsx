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
      <body className="bg-white text-gray-900 antialiased md:grid md:grid-cols-[16rem_minmax(0,48rem)] md:justify-center md:gap-12 dark:bg-gray-950 dark:text-gray-100">
        <aside className="border-b border-gray-200 p-4 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-b-0 md:pb-8 dark:border-gray-800">
          <p className="mb-6 text-lg font-semibold">
            <Link href="/">Graft</Link>
          </p>
          <nav aria-label="Docs">
            <NavList items={nav} pathname={pathname} />
          </nav>
        </aside>
        <div className="px-4 pt-4 pb-16">
          <main className="prose max-w-none prose-gray dark:prose-invert">{children}</main>
          {(previous || next) && (
            <nav
              aria-label="Previous and next pages"
              className="mt-12 flex justify-between border-t border-gray-200 pt-4 text-sm font-medium dark:border-gray-800"
            >
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

function NavList({
  items,
  pathname,
  nested = false,
}: {
  items: (NavLink | NavGroup)[];
  pathname: string;
  nested?: boolean;
}) {
  return (
    <ul className={nested ? "mt-1 space-y-1 pl-4" : "space-y-4 text-sm"}>
      {items.map((item) =>
        isGroup(item) ? (
          <li key={item.title}>
            <strong className="font-semibold">{item.title}</strong>
            <NavList items={item.items} pathname={pathname} nested />
          </li>
        ) : (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.href === pathname ? "page" : undefined}
              className="text-gray-600 hover:text-gray-900 aria-[current=page]:font-semibold aria-[current=page]:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 dark:aria-[current=page]:text-gray-100"
            >
              {item.title}
            </Link>
          </li>
        ),
      )}
    </ul>
  );
}
