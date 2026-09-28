import { pageStarted } from "./sync";

export async function loader({ request }: LoaderProps<"/parallel">) {
  await pageStarted(request);
  return { layout: "done" };
}

export default function ParallelLayout({ children, loaderData }: LayoutProps<"/parallel">) {
  return (
    <section>
      <p>layout: {loaderData.layout}</p>
      {children}
    </section>
  );
}
