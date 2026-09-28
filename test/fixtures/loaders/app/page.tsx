import { useState } from "react";

import { getSecret } from "./secret.server";

export async function loader() {
  // Marker strings: neither may appear in the browser build.
  if (!getSecret()) throw new Error("LOADER_ONLY_c91e");

  return {
    xss: "</script><script>window.pwned = true</script><!--",
    date: new Date("2026-01-02T03:04:05Z"),
    map: new Map([["answer", 42]]),
    set: new Set(["a", "b"]),
    big: 12345678901234567890n,
    missing: undefined,
    shared: { same: true },
  };
}

export async function action() {
  // Marker string: must not appear in the browser build.
  console.log("ACTION_ONLY_5d2b", getSecret());
  return null;
}

export default function Home({ loaderData }: PageProps<"/">) {
  const [hydrated, setHydrated] = useState(false);

  return (
    <main>
      <p id="xss">{loaderData.xss}</p>
      <p id="date">{loaderData.date.toISOString()}</p>
      <p id="map">{loaderData.map.get("answer")}</p>
      <p id="set">{[...loaderData.set].join(",")}</p>
      <p id="big">{(loaderData.big + 1n).toString()}</p>
      <p id="missing">{"missing" in loaderData ? typeof loaderData.missing : "absent"}</p>
      <button type="button" onClick={() => setHydrated(true)}>
        {hydrated ? "hydrated" : "not yet"}
      </button>
    </main>
  );
}
