import "./styles.css";

export function loader() {
  return { builtBy: "Graft", year: new Date().getUTCFullYear() };
}

export default function RootLayout({ children, loaderData }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {children}
        <footer>
          Made with {loaderData.builtBy}, {loaderData.year}
        </footer>
      </body>
    </html>
  );
}
