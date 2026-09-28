import { Link, redirect } from "@phatjng/graft";

import { formatDate } from "../../format";
import { getPost } from "../../posts.server";

export async function loader({ params }: LoaderProps<"/blog/[slug]">) {
  // This post was renamed. A 301 tells browsers and search engines it moved for good.
  if (params.slug === "first-post") throw redirect("/blog/hello-world", 301);

  return { post: getPost(params.slug) ?? null };
}

export default function Post({ params, loaderData }: PageProps<"/blog/[slug]">) {
  const { post } = loaderData;
  if (!post) return <p>There's no post called “{params.slug}”.</p>;

  // A <title> anywhere in the tree ends up in <head>, and updates on client navigation.
  return (
    <article>
      <title>{`${post.title} · Graft`}</title>
      <h1>{post.title}</h1>
      <p>
        <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>
      </p>
      <p>{post.body}</p>
      <Link href="/">Back home</Link>
    </article>
  );
}
