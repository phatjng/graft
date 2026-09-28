import { markPageStarted } from "./sync";

export async function loader({ request }: LoaderProps<"/parallel">) {
  markPageStarted(request);
  return { page: "done" };
}

export default function ParallelPage({ loaderData }: PageProps<"/parallel">) {
  return <p>page: {loaderData.page}</p>;
}
