import { build } from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

await build({
  entryPoints: [resolve(root, "api/handler/index.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: resolve(root, "api/dist/handler.js"),
  external: ["pg-native", "bufferutil", "utf-8-validate"],
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  logLevel: "info",
});
