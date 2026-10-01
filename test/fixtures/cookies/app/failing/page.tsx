export function action({ cookies }: ActionProps<"/failing">): never {
  cookies.set("half-done", "yes");
  throw new Error("action exploded after setting a cookie");
}

export default function Failing() {
  return null;
}
