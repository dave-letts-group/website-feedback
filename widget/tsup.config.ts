import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      react: "src/react.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ["react"],
  },
  {
    entry: { "widget.global": "src/index.ts" },
    format: ["iife"],
    globalName: "WebFeedback",
    outExtension: () => ({ js: ".js" }),
    minify: true,
  },
]);
