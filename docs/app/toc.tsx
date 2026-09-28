import { useLayoutEffect, useState, type RefObject } from "react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * The "On this page" list. Pages are plain TSX with bare `<h2>` and `<h3>`
 * elements, so this gives them ids from their text once the page is in the
 * browser, then lists them and highlights the one being read.
 */
export function OnThisPage({
  content,
  pathname,
}: {
  content: RefObject<HTMLElement | null>;
  pathname: string;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>();

  // A layout effect, so the ids exist before the router scrolls to a #hash.
  useLayoutEffect(() => {
    const elements = [...(content.current?.querySelectorAll<HTMLElement>("h2, h3") ?? [])];
    const used = new Set<string>();

    for (const element of elements) {
      if (!element.id) element.id = unique(slug(element.textContent ?? ""), used);
      used.add(element.id);
    }

    setHeadings(
      elements.map((element) => ({
        id: element.id,
        text: element.textContent ?? "",
        level: element.tagName === "H3" ? 3 : 2,
      })),
    );

    // On a first load with a #hash, the browser looked for the id before it existed.
    const target =
      window.location.hash &&
      document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (target && elements.includes(target)) target.scrollIntoView();

    // The heading being read is the last one scrolled past the top of the screen,
    // or the last one on the page once it's scrolled to the end.
    const onScroll = (): void => {
      const atEnd =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const passed = elements.filter((element) => element.getBoundingClientRect().top < 120);
      setActive((atEnd ? elements.at(-1) : (passed.at(-1) ?? elements[0]))?.id);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [content, pathname]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-3 font-medium text-gray-900 dark:text-gray-100">On this page</p>
      <ul className="space-y-2.5">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? "pl-3" : undefined}>
            <a
              href={`#${heading.id}`}
              aria-current={heading.id === active ? "location" : undefined}
              className="block text-gray-500 transition-colors hover:text-gray-900 aria-[current=location]:text-gray-900 aria-[current=location]:font-medium dark:text-gray-400 dark:hover:text-gray-100 dark:aria-[current=location]:text-gray-100"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function unique(id: string, used: Set<string>): string {
  let candidate = id || "section";
  for (let n = 2; used.has(candidate); n++) candidate = `${id}-${n}`;

  return candidate;
}
