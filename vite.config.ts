import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart({
      // Readable server function URLs, such as /_serverFn/aset, so tests can call them directly.
      serverFns: {
        generateFunctionId: ({ functionName }) =>
          functionName.replace(/_createServerFn_handler$/, ""),
      },
    }),
    react(),
    tailwindcss(),
  ],
});
