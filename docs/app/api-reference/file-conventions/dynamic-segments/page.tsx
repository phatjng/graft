import { Code, Note } from "../../../components";

export default function DynamicSegments() {
  return (
    <>
      <title>Dynamic segments · Graft</title>
      <h1>Dynamic segments</h1>
      <p>
        A folder named in square brackets, like <code>[slug]</code>, matches any single URL segment.
        The matched value is passed to layouts, pages, loaders and actions as a param.
      </p>
      <Code file="app/blog/[slug]/page.tsx">{`
export default function Post({ params }: PageProps<"/blog/[slug]">) {
  return <h1>{params.slug}</h1>;
}
`}</Code>
      <table>
        <thead>
          <tr>
            <th>Route</th>
            <th>URL</th>
            <th>
              <code>params</code>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>app/blog/[slug]/page.tsx</code>
            </td>
            <td>
              <code>/blog/a</code>
            </td>
            <td>
              <code>{'{ slug: "a" }'}</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>app/shop/[category]/[item]/page.tsx</code>
            </td>
            <td>
              <code>/shop/shoes/boots</code>
            </td>
            <td>
              <code>{'{ category: "shoes", item: "boots" }'}</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>app/blog/[slug]/page.tsx</code>
            </td>
            <td>
              <code>/blog/hello%20world</code>
            </td>
            <td>
              <code>{'{ slug: "hello world" }'}</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Rules</h2>
      <ul>
        <li>
          The name between the brackets must be a JavaScript identifier, like <code>slug</code> or{" "}
          <code>postId</code>.
        </li>
        <li>A dynamic segment matches exactly one segment, never an empty one.</li>
        <li>Segments are percent-decoded before matching, so params arrive decoded.</li>
        <li>
          Two dynamic folders side by side (<code>[id]</code> and <code>[slug]</code>) are an error:
          a URL can't tell them apart.
        </li>
        <li>
          Catch-all (<code>[...slug]</code>) and optional (<code>[[...slug]]</code>) segments aren't
          supported yet, and are an error rather than a folder name.
        </li>
      </ul>

      <h2>Matching order</h2>
      <p>
        A static segment beats a dynamic one, whatever order the files are found in. With these two
        pages:
      </p>
      <Code>{`
app/blog/new/page.tsx       # /blog/new
app/blog/[slug]/page.tsx    # /blog/anything-else
`}</Code>
      <p>
        <code>/blog/new</code> renders <code>app/blog/new/page.tsx</code>, and every other{" "}
        <code>/blog/...</code> renders the dynamic page.
      </p>

      <h2>Matching details</h2>
      <ul>
        <li>
          URLs are case-sensitive: <code>/About</code> doesn't match <code>app/about/</code>.
        </li>
        <li>
          A single trailing slash is ignored: <code>/blog/</code> matches like <code>/blog</code>.
        </li>
      </ul>

      <Note>
        Moving from <code>/blog/a</code> to <code>/blog/b</code> renders the same page component
        with new props, so React keeps its state. Reset state that depends on the param with a{" "}
        <code>key</code>, for example <code>{"<Comments key={params.slug} />"}</code>.
      </Note>
    </>
  );
}
