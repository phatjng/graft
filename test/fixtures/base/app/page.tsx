import { useState } from "react";

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1>home</h1>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
    </>
  );
}
