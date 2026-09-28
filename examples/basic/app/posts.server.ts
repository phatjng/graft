// A stand-in for a database. The .server suffix makes it server-only: importing
// it into code that runs in the browser fails the build.

export interface Post {
  slug: string;
  title: string;
  body: string;
  publishedAt: Date;
}

const posts: Post[] = [
  {
    slug: "hello-world",
    title: "Hello, world",
    body: "This post came from a loader, which only runs on the server.",
    publishedAt: new Date("2026-09-01T12:00:00Z"),
  },
  {
    slug: "dates-stay-dates",
    title: "Dates stay dates",
    body: "Loader data keeps its types on the way to the browser, so publishedAt is a real Date.",
    publishedAt: new Date("2026-09-20T12:00:00Z"),
  },
];

export function listPosts(): Post[] {
  return posts;
}

export function getPost(slug: string): Post | undefined {
  return posts.find((post) => post.slug === slug);
}
