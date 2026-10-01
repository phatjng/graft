export function loader({ cookies }: LoaderProps<"/visit">) {
  const first = !cookies.has("visited");
  if (first) cookies.set("visited", "yes");

  return { first };
}

export default function Visit({ loaderData }: PageProps<"/visit">) {
  return <p id="visit">{loaderData.first ? "first visit" : "welcome back"}</p>;
}
