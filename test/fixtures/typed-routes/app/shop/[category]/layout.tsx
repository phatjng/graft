export function loader({ params }: LoaderProps<"/shop/[category]">) {
  // @ts-expect-error A layout's loader only gets the params from its own path.
  params.item;

  return { title: params.category.toUpperCase() };
}

export default function ShopLayout({
  children,
  params,
  loaderData,
}: LayoutProps<"/shop/[category]">) {
  const category: string = params.category;
  const title: string = loaderData.title;
  // @ts-expect-error A layout only gets the params from its own path.
  params.item;

  return <section title={`${category} ${title}`}>{children}</section>;
}
