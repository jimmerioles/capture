import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview ? "/capture/" : "/",
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        caseStudy: fileURLToPath(
          new URL("./case-study/index.html", import.meta.url),
        ),
      },
    },
  },
}));
