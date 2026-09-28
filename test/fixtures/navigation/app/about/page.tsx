export function loader({ request }: LoaderProps<"/about">) {
  return { url: request.url };
}

export default function About({ loaderData }: PageProps<"/about">) {
  return (
    <main>
      <h1>about</h1>
      <p id="loader-url">{loaderData.url}</p>
    </main>
  );
}
