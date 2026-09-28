export function loader() {
  return { callback: () => "functions can't be sent" };
}

export default function Page() {
  return <p>unreachable</p>;
}
