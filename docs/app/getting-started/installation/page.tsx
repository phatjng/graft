import { Link } from "@phatjng/graft";

import { Code, Note } from "../../components";

export default function Installation() {
  return (
    <>
      <title>Installation · Graft</title>
      <h1>Installation</h1>
      <p>
        Graft needs <strong>Node.js 24</strong> or newer, <strong>React 19</strong> and{" "}
        <strong>Vite 8</strong>.
      </p>
      <Note>
        Graft hasn't been published to npm yet, so these steps describe the first release. Until
        then, try it inside the Graft repository, where <code>examples/basic</code> and these docs
        are Graft apps.
      </Note>

      <h2>Install the packages</h2>
      <p>In a new folder, install Graft, React and Vite:</p>
      <Code lang="shell">{`
npm install @phatjng/graft react react-dom
npm install --save-dev vite typescript @types/react @types/react-dom
`}</Code>
      <p>
        <code>@phatjng/graft</code> is the only Graft package you install. Everything else is
        imported from its subpaths, like <code>@phatjng/graft/vite</code>.
      </p>

      <h2>Add the scripts</h2>
      <Code file="package.json">{`
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "graft start",
    "typecheck": "graft typegen && tsc --noEmit"
  }
}
`}</Code>
      <p>
        Graft uses Vite's own commands for development and builds. The <code>graft</code> command
        only adds what Vite doesn't have: <code>graft start</code> serves a production build, and{" "}
        <code>graft typegen</code> writes route types without starting Vite. See the{" "}
        <Link href="/api-reference/cli">CLI reference</Link>.
      </p>

      <h2>Configure Vite</h2>
      <p>
        Add the <code>graft()</code> plugin. It's the only configuration Graft needs, and it
        includes <code>@vitejs/plugin-react</code>, so don't add that yourself.
      </p>
      <Code file="vite.config.ts">{`
import { graft } from "@phatjng/graft/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [graft()],
});
`}</Code>

      <h2>Configure TypeScript</h2>
      <Code file="tsconfig.json">{`
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["app", "vite.config.ts", ".graft/types/**/*.ts"]
}
`}</Code>
      <p>
        Graft generates types for your routes into <code>.graft/types/</code>. The last{" "}
        <code>include</code> entry lets TypeScript see them. If you leave it out, Graft adds it the
        first time it runs (unless your <code>tsconfig.json</code> has comments, in which case it
        tells you what to add). Add <code>.graft</code> to your <code>.gitignore</code>.
      </p>

      <h2>Create the root layout and a page</h2>
      <p>
        The root layout renders the whole document, including <code>&lt;html&gt;</code> and{" "}
        <code>&lt;body&gt;</code>:
      </p>
      <Code file="app/layout.tsx">{`
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
`}</Code>
      <Code file="app/page.tsx">{`
export default function Home() {
  return <h1>Hello, Graft</h1>;
}
`}</Code>

      <h2>Run it</h2>
      <Code lang="shell">{`
npm run dev
`}</Code>
      <p>
        Open the URL Vite prints. Edit <code>app/page.tsx</code> and the page updates without losing
        its state.
      </p>
      <p>To try the production build:</p>
      <Code lang="shell">{`
npm run build
npm start
`}</Code>
    </>
  );
}
