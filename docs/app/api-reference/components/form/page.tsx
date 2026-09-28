import { Link } from "@phatjng/graft";

import { Code } from "../../../components";

export default function FormReference() {
  return (
    <>
      <title>&lt;Form&gt; · Graft</title>
      <h1>&lt;Form&gt;</h1>
      <p>
        <code>&lt;Form&gt;</code> renders a <code>&lt;form&gt;</code> that submits to an{" "}
        <Link href="/api-reference/route-exports/action">action</Link> (with{" "}
        <code>method="post"</code>) or navigates (<code>GET</code>). It works without JavaScript,
        and without a full page load when JavaScript is available.
      </p>
      <Code file="app/guestbook/page.tsx">{`
import { Form } from "@phatjng/graft";

export default function Guestbook() {
  return (
    <Form method="post">
      <input name="name" />
      <button type="submit" name="intent" value="sign">Sign</button>
    </Form>
  );
}
`}</Code>

      <h2>Props</h2>
      <h3>
        <code>method</code>
      </h3>
      <p>
        <code>"get"</code> (the default, as in HTML) or <code>"post"</code>.
      </p>
      <h3>
        <code>action</code>
      </h3>
      <p>Where to submit, as a path inside the app. By default:</p>
      <ul>
        <li>
          a POST goes to the action of the file that renders the <code>&lt;Form&gt;</code>: its URL
          plus <code>?_graft_action=&lt;route id&gt;</code>,
        </li>
        <li>a GET goes to that file's URL.</li>
      </ul>
      <p>
        Vite's <code>base</code> is added in front, as for <code>&lt;Link&gt;</code>.
      </p>
      <p>
        With an explicit <code>action</code>, a POST runs the action of the <strong>page</strong> at
        that URL, then shows that page with its result, with or without JavaScript:
      </p>
      <Code file="app/page.tsx">{`
// On the home page: subscribes through app/newsletter/page.tsx's action,
// then shows /newsletter with its actionData.
<Form method="post" action="/newsletter">
  <input type="email" name="email" />
  <button type="submit">Subscribe</button>
</Form>
`}</Code>
      <h3>
        <code>encType</code>
      </h3>
      <p>
        Set <code>encType="multipart/form-data"</code> to upload files. Otherwise the body is
        URL-encoded, as the browser would send it.
      </p>
      <h3>Everything else</h3>
      <p>
        <code>&lt;Form&gt;</code> accepts every <code>&lt;form&gt;</code> prop. Your{" "}
        <code>onSubmit</code> runs first; call <code>event.preventDefault()</code> in it to cancel
        the submission (to validate on the client, for example).
      </p>

      <h2>POST forms</h2>
      <p>With JavaScript, submitting a POST form:</p>
      <ol>
        <li>
          sends the form with <code>fetch</code>, including the clicked button's <code>name</code>{" "}
          and <code>value</code>,
        </li>
        <li>runs the action on the server,</li>
        <li>runs the current page's loaders again,</li>
        <li>
          renders the page with the fresh data and <code>actionData</code>,
        </li>
        <li>and resets the form, as a full page load would.</li>
      </ol>
      <p>
        Where the result shows depends on <code>action</code>. Without it, the form posts to its own
        file and the current page updates in place: the URL doesn't change. With an explicit{" "}
        <code>action</code> for another URL, the router moves to that URL (adding a history entry)
        and renders its page with the result.
      </p>
      <p>
        If the action redirects, the router navigates there. Without JavaScript, the browser submits
        the form and shows the page the server sends back.
      </p>

      <h2>GET forms</h2>
      <p>
        With JavaScript, a GET form becomes a client navigation to its URL, with the fields in the
        query string. It's the usual way to build a search box:
      </p>
      <Code file="app/search/page.tsx">{`
<Form action="/search">
  <input type="search" name="q" />
  <button type="submit">Search</button>
</Form>
`}</Code>

      <h2>Left to the browser</h2>
      <p>
        A submission is handled by the browser as usual when the clicked button has a{" "}
        <code>formMethod</code> or <code>formAction</code>, when the form or button targets another
        window, or when the form's URL is on another origin.
      </p>
    </>
  );
}
