import { build } from "../../deps/esbuild.ts";

// bundle & minify app.css
const name = "file-loader";
const { outputFiles: [css] } = await build({
  stdin: {
    loader: "css",
    contents: '@import "../viewer.css";',
  },
  bundle: true,
  minify: true,
  write: false,
  plugins: [{
    name,
    setup: ({ onLoad, onResolve }) => {
      onResolve({ filter: /.*/ }, ({ path, importer }) => {
        importer = importer === "<stdin>" ? import.meta.url : importer;
        return {
          path: new URL(path, importer).href,
          namespace: name,
        };
      });
      onLoad({ filter: /.*/, namespace: name }, async ({ path }) => ({
        contents: await Deno.readTextFile(new URL(path)),
        loader: "css",
      }));
    },
  }],
});

// create app.min.css.ts
await Deno.writeTextFile(
  new URL("../viewer.min.css.ts", import.meta.url),
  `// deno-fmt-ignore-file\nexport const CSS = String.raw\`${css.text}\`;`,
);
