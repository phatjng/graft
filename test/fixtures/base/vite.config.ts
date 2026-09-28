import { graft } from "@phatjng/graft/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/app/",
  plugins: [graft()],
});
