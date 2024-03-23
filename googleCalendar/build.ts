/// <reference lib="deno.ns" />
/// <reference lib="dom.iterable" />
import { generate } from "../deps/gas-entry-generator.ts";
import { build, denoPlugins, stop } from "../deps/esbuild.ts";

const { outputFiles } = await build({
  entryPoints: [new URL("./main.ts", import.meta.url).href],
  // GASが対応していない記法を変換しておく
  target: "es2017",
  bundle: true,
  minify: true,
  write: false,
  plugins: [...denoPlugins()],
});
await stop();
const code = outputFiles[0].text;

const output = generate(code);
console.log(
  `const global=this;\n${output.entryPointFunctions}\n(() => {\n${code}\n})();`,
);
