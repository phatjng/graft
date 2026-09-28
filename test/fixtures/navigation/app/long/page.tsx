import { Link } from "@phatjng/graft";

export default function Long() {
  return (
    <main>
      <h1>long</h1>
      <Link href="/long#bottom">to the bottom</Link>
      <div style={{ height: 4000 }} />
      <p id="bottom">
        <Link href="/about">about, from the bottom</Link>
      </p>
      <div style={{ height: 1000 }} />
    </main>
  );
}
