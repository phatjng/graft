export async function loader({ cookies }: LoaderProps<"/">) {
  return {
    theme: cookies.get("theme") ?? "none",
    session: (await cookies.get("session", { encrypted: true })) ?? "none",
  };
}

export default function Home({ loaderData }: PageProps<"/">) {
  return (
    <p id="cookies">
      theme {loaderData.theme}, session {loaderData.session}
    </p>
  );
}
