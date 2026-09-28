import { useState } from "react";

export default function Home(_props: PageProps<"/">) {
  const [count, setCount] = useState(0);

  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      count: {count}
    </button>
  );
}
