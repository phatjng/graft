import { Link, usePathname } from "@phatjng/graft";

import "./styles.css";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">home</Link> <Link href="/about">about</Link>{" "}
          <Link href="/private">private</Link>
        </nav>
        <p id="pathname">{usePathname()}</p>
        {children}
      </body>
    </html>
  );
}
