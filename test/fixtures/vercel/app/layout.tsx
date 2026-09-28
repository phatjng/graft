import { Link } from "@phatjng/graft";

import "./styles.css";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">home</Link> <Link href="/about">about</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
