export function loader() {
  return { site: "fixture" };
}

export default function RootLayout({ children, loaderData }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body data-site={loaderData.site}>{children}</body>
    </html>
  );
}
