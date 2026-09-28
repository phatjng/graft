export default function Page({ loaderData }: PageProps<"/no-loader">) {
  return <p>{typeof loaderData}</p>;
}
