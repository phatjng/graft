export async function loader() {
  throw new Error("fails because nobody is logged in");
}

export default function Page() {
  return <p>unreachable</p>;
}
