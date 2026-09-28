import { Link } from "@phatjng/graft";

import { Counter } from "./counter";
import { formatDate } from "./format";
import { listPosts } from "./posts.server";

export async function loader() {
  return {
    posts: listPosts().map(({ slug, title, publishedAt }) => ({ slug, title, publishedAt })),
  };
}

export default function Home({ loaderData }: PageProps<"/">) {
  return (
    <main>
      <title>Graft</title>
      <h1>Graft</h1>
      <p>This page was rendered on the server, then hydrated in the browser.</p>
      <Counter />
      <h2>Posts</h2>
      <ul>
        {loaderData.posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`}>{post.title}</Link> ({formatDate(post.publishedAt)})
          </li>
        ))}
      </ul>
      <p>
        <Link href="/blog/first-post">An old link</Link> to a renamed post redirects to its new
        address.
      </p>
      <p>
        Sign the <Link href="/guestbook">guestbook</Link>.
      </p>
    </main>
  );
}
