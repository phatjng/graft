export default function RootLayout({ children, params }: LayoutProps<"/">) {
  // @ts-expect-error The root has no params.
  params.category;

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
