import { Link, usePathname } from "@phatjng/graft";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">home</Link> <Link href="/about?from=nav">about</Link>{" "}
          <Link href="/long">long</Link> <Link href="/missing">missing</Link>{" "}
          <Link href="/broken">broken</Link> <Link href="/redirect">redirect</Link>
        </nav>
        <p id="pathname">{usePathname()}</p>
        {children}
      </body>
    </html>
  );
}
