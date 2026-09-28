import { Form } from "@phatjng/graft";

export function loader({ request }: LoaderProps<"/search">) {
  return { query: new URL(request.url).searchParams.get("q") ?? "" };
}

export default function Search({ loaderData }: PageProps<"/search">) {
  return (
    <main>
      <Form>
        <input name="q" aria-label="query" />
        <button type="submit">search</button>
      </Form>
      <p id="query">query: {loaderData.query}</p>
    </main>
  );
}
