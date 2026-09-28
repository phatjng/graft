import { Link, usePathname } from "@phatjng/graft";
import { useEffect, useRef, useState } from "react";

import { groupsOf, isGroup, nav, pages, type NavGroup, type NavLink } from "./nav";
import { OnThisPage } from "./toc";

import "./styles.css";

export default function RootLayout({ children }: LayoutProps<"/">) {
  // A trailing slash matches the same page: /installation/ is /installation.
  const pathname = usePathname().replace(/(.)\/$/, "$1");
  const index = pages.findIndex((page) => page.href === pathname);
  const page = index >= 0 ? pages[index] : undefined;
  const previous = index > 0 ? pages[index - 1] : undefined;
  const next = index >= 0 ? pages[index + 1] : undefined;

  const content = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Following a link in the phone menu closes it.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="bg-white text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
          <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-3 px-4 md:px-6">
            <Link href="/" className="text-base font-semibold tracking-tight">
              Graft
            </Link>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">Docs</span>
            <a
              href="https://github.com/phatjng/graft"
              className="ml-auto text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              GitHub
            </a>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="sidebar"
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-md border border-gray-200 px-2.5 py-1 text-sm font-medium md:hidden dark:border-gray-800"
            >
              Menu
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[90rem] md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:gap-10 md:px-6 xl:grid-cols-[15rem_minmax(0,48rem)_13rem] xl:justify-between">
          <aside
            id="sidebar"
            className={`${menuOpen ? "block" : "hidden"} fixed inset-x-0 top-14 bottom-0 z-10 overflow-y-auto bg-white px-4 py-6 md:sticky md:inset-x-auto md:bottom-auto md:z-auto md:block md:h-[calc(100vh-3.5rem)] md:bg-transparent md:px-0 md:py-10 dark:bg-gray-950 md:dark:bg-transparent`}
          >
            <nav aria-label="Docs">
              <ul className="space-y-8">
                {nav.map((group) => (
                  <li key={group.title}>
                    <p className="mb-2 px-2 text-sm font-semibold">{group.title}</p>
                    <NavList items={group.items} pathname={pathname} />
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="min-w-0 px-4 pt-8 pb-16 md:px-0 md:pt-10">
            {page && (
              <p className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                {groupsOf(page.href)?.map((group) => (
                  <span
                    key={group}
                    className="after:ml-1.5 after:text-gray-300 after:content-['/'] dark:after:text-gray-700"
                  >
                    {group}
                  </span>
                ))}
                <span className="text-gray-900 dark:text-gray-100">{page.title}</span>
              </p>
            )}

            <main ref={content} className="prose max-w-none prose-gray dark:prose-invert">
              {children}
            </main>

            {(previous || next) && (
              <nav aria-label="Previous and next pages" className="mt-16 grid grid-cols-2 gap-4">
                {previous ? <PageLink page={previous} label="Previous" rel="prev" /> : <span />}
                {next && <PageLink page={next} label="Next" rel="next" />}
              </nav>
            )}
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-10">
              <OnThisPage content={content} pathname={pathname} />
            </div>
          </aside>
        </div>
      </body>
    </html>
  );
}

function NavList({ items, pathname }: { items: (NavLink | NavGroup)[]; pathname: string }) {
  return (
    <ul className="space-y-0.5 text-sm">
      {items.map((item) =>
        isGroup(item) ? (
          <li key={item.title}>
            <p className="px-2 py-1.5 text-gray-900 dark:text-gray-100">{item.title}</p>
            <ul className="mb-1 ml-2 border-l border-gray-200 dark:border-gray-800">
              {item.items.map((child) =>
                isGroup(child) ? (
                  <li key={child.title} className="pl-2">
                    <NavList items={[child]} pathname={pathname} />
                  </li>
                ) : (
                  <li key={child.href}>
                    <NavItem link={child} pathname={pathname} nested />
                  </li>
                ),
              )}
            </ul>
          </li>
        ) : (
          <li key={item.href}>
            <NavItem link={item} pathname={pathname} />
          </li>
        ),
      )}
    </ul>
  );
}

function NavItem({
  link,
  pathname,
  nested = false,
}: {
  link: NavLink;
  pathname: string;
  nested?: boolean;
}) {
  // Nested links mark the current page on the group's line; top-level ones get a background.
  const current = nested
    ? "-ml-px border-l border-transparent pl-3.5 aria-[current=page]:border-gray-900 dark:aria-[current=page]:border-gray-100"
    : "rounded-md px-2 aria-[current=page]:bg-gray-100 dark:aria-[current=page]:bg-gray-800/60";

  return (
    <Link
      href={link.href}
      aria-current={link.href === pathname ? "page" : undefined}
      className={`${current} block py-1.5 text-gray-600 transition-colors hover:text-gray-900 aria-[current=page]:font-medium aria-[current=page]:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 dark:aria-[current=page]:text-gray-100`}
    >
      {link.title}
    </Link>
  );
}

function PageLink({ page, label, rel }: { page: NavLink; label: string; rel: "prev" | "next" }) {
  return (
    <Link
      href={page.href}
      rel={rel}
      className={`${rel === "next" ? "col-start-2 text-right" : ""} rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-600`}
    >
      <span className="block text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="block font-medium">{page.title}</span>
    </Link>
  );
}
