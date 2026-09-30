# Graft

A React framework built on [Vite](https://vite.dev), with file-based routing, server rendering, and data loading.

> [!WARNING]
> Graft is experimental and not meant for production use.

## Install

Graft needs Node.js 24 or newer, React 19 and Vite 8.

```shell
npm install @phatjng/graft react react-dom
npm install --save-dev vite typescript @types/react @types/react-dom
```

Then add the plugin to `vite.config.ts`:

```ts
import { graft } from "@phatjng/graft/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [graft()],
});
```

See the [docs](https://github.com/phatjng/graft/tree/main/docs) to learn more.

## License

[MIT](https://github.com/phatjng/graft/blob/main/LICENSE)
