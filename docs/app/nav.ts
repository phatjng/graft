// The sidebar, in reading order. Previous/Next links at the bottom of each page
// follow the same order, so adding a page means adding it here too.

export interface NavLink {
  title: string;
  href: string;
}

export interface NavGroup {
  title: string;
  items: (NavLink | NavGroup)[];
}

export const nav: NavGroup[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/" },
      { title: "Installation", href: "/getting-started/installation" },
      { title: "Project structure", href: "/getting-started/project-structure" },
      { title: "Layouts and pages", href: "/getting-started/layouts-and-pages" },
      { title: "Linking and navigating", href: "/getting-started/linking-and-navigating" },
      { title: "Fetching data", href: "/getting-started/fetching-data" },
      { title: "Updating data", href: "/getting-started/updating-data" },
      { title: "Cookies", href: "/getting-started/cookies" },
      { title: "Server and client code", href: "/getting-started/server-and-client-code" },
      { title: "CSS and metadata", href: "/getting-started/css-and-metadata" },
      { title: "Deploying", href: "/getting-started/deploying" },
    ],
  },
  {
    title: "API Reference",
    items: [
      {
        title: "File conventions",
        items: [
          { title: "layout", href: "/api-reference/file-conventions/layout" },
          { title: "page", href: "/api-reference/file-conventions/page" },
          { title: "Dynamic segments", href: "/api-reference/file-conventions/dynamic-segments" },
          { title: "server.ts", href: "/api-reference/file-conventions/server" },
          { title: "client.ts", href: "/api-reference/file-conventions/client" },
          { title: "*.server.ts", href: "/api-reference/file-conventions/server-only-modules" },
        ],
      },
      {
        title: "Route exports",
        items: [
          { title: "loader", href: "/api-reference/route-exports/loader" },
          { title: "action", href: "/api-reference/route-exports/action" },
        ],
      },
      {
        title: "Components",
        items: [
          { title: "<Link>", href: "/api-reference/components/link" },
          { title: "<Form>", href: "/api-reference/components/form" },
        ],
      },
      {
        title: "Hooks",
        items: [{ title: "usePathname", href: "/api-reference/hooks/use-pathname" }],
      },
      {
        title: "Functions",
        items: [
          { title: "redirect", href: "/api-reference/functions/redirect" },
          { title: "handle", href: "/api-reference/functions/handle" },
          { title: "hydrate", href: "/api-reference/functions/hydrate" },
          { title: "serve", href: "/api-reference/functions/serve" },
        ],
      },
      { title: "cookies", href: "/api-reference/cookies" },
      { title: "Route types", href: "/api-reference/route-types" },
      { title: "Vite plugin", href: "/api-reference/vite-plugin" },
      { title: "CLI", href: "/api-reference/cli" },
    ],
  },
];

export function isGroup(item: NavLink | NavGroup): item is NavGroup {
  return "items" in item;
}

/** The titles of the groups that contain a page, outermost first, for its breadcrumbs. */
export function groupsOf(href: string, items: (NavLink | NavGroup)[] = nav): string[] | undefined {
  for (const item of items) {
    if (!isGroup(item)) {
      if (item.href === href) return [];
      continue;
    }

    const inner = groupsOf(href, item.items);
    if (inner) return [item.title, ...inner];
  }
}

/** Every page in sidebar order. */
export const pages: NavLink[] = nav.flatMap(function flatten(item: NavLink | NavGroup): NavLink[] {
  return isGroup(item) ? item.items.flatMap(flatten) : [item];
});
