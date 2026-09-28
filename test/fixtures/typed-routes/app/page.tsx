export default function Home({ loaderData, actionData }: PageProps<"/">) {
  // Without a loader or action, loaderData and actionData are undefined.
  const nothing: undefined = loaderData;
  const noAction: undefined = actionData;
  void noAction;

  return <p>{String(nothing)}</p>;
}

// @ts-expect-error "/missing" isn't a route.
export type Missing = PageProps<"/missing">;

// @ts-expect-error "/shop/[category]" has a layout but no page.
export type LayoutOnly = PageProps<"/shop/[category]">;

// @ts-expect-error LoaderProps only accepts route paths.
export type BadProps = LoaderProps<"/nope">;
