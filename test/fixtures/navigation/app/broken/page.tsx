export function loader() {
  throw new Error("broken loader");
}

export default function Broken() {
  return <h1>unreachable</h1>;
}
