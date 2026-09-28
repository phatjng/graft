import { vercel } from "@phatjng/graft/vercel";
import { graft } from "@phatjng/graft/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), graft({ adapter: vercel() })],
});
