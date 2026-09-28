import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  // Every package is "type": "module", so plain .js files are ESM.
  fixedExtension: false,
});
