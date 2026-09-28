import { vercel } from "@phatjng/graft/vercel";
import { graft } from "@phatjng/graft/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [graft({ adapter: vercel() })],
});
