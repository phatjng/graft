import { defineConfig } from "tsdown";

export default defineConfig({
  // One entry per subpath export in package.json.
  entry: [
    "src/index.ts",
    "src/vite.ts",
    "src/server.ts",
    "src/client.ts",
    "src/node.ts",
    "src/vercel.ts",
    "src/cli.ts",
  ],
  dts: true,
  // Every package is "type": "module", so plain .js files are ESM.
  fixedExtension: false,
});
