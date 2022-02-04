/// <reference lib="deno.unstable" />
import { generate } from "https://esm.sh/gas-entry-generator@2.1.0";
import { build, stop } from "https://deno.land/x/esbuild@v0.14.18/mod.js";

const bundled = await Deno.emit(new URL("./main.ts", import.meta.url), {
  bundle: "module",
  check: false,
});
const bundledCode = bundled.files["deno:///bundle.js"];

const { outputFiles } = await build({
  stdin: {
    contents: bundledCode,
    loader: "js",
  },
  // GASが対応していない記法を変換しておく
  target: "es2017",
  write: false,
});
stop();
const babeledCode = outputFiles[0].text;

const output = generate(babeledCode);
console.log(
  `const global=this;\n${output.entryPointFunctions}\n(() => {\n${babeledCode}\n})();`,
);
