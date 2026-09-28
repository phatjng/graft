export function loader() {
  throw new Error("loader exploded");
}

export default function Page() {
  return <p>unreachable</p>;
}
