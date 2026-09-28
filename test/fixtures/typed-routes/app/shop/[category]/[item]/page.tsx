import { redirect } from "@phatjng/graft";

export async function loader({ params, request }: LoaderProps<"/shop/[category]/[item]">) {
  const url: string = request.url;

  if (params.item === "old") return redirect("/shop/new");

  return { name: params.item, stock: 3, restocked: new Date(), url };
}

export async function action({ request, params }: ActionProps<"/shop/[category]/[item]">) {
  const form = await request.formData();

  if (form.get("intent") === "buy") return redirect(`/shop/${params.category}/cart`);

  return { saved: true as const, at: new Date() };
}

export default function Item({
  params,
  loaderData,
  actionData,
}: PageProps<"/shop/[category]/[item]">) {
  // actionData is undefined until the action has run, and never the redirect.
  // @ts-expect-error It may be undefined.
  actionData.saved;
  const saved: true | undefined = actionData?.saved;
  const savedAt: Date | undefined = actionData?.at;

  const { category, item }: { category: string; item: string } = params;
  // @ts-expect-error Params are strings.
  const count: number = params.item;
  // @ts-expect-error There's no "slug" param here.
  params.slug;

  // Loader data keeps its types, Date included, and never includes the redirect.
  const stock: number = loaderData.stock;
  const restocked: Date = loaderData.restocked;
  // @ts-expect-error The loader doesn't return "price".
  loaderData.price;
  // @ts-expect-error A redirect is never passed as data.
  loaderData.status;

  return (
    <p>
      {category}/{item}/{count}/{stock}/{restocked.getTime()}/{String(saved)}/{savedAt?.getTime()}
    </p>
  );
}
