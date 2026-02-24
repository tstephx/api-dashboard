import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["components/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  treeshake: true,
});
