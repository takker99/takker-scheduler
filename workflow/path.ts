import { encodeTitleURI } from "../deps/scrapbox-std.ts";

/** Scrapboxのリンクを表す */
export interface Path {
  project: string;
  title: string;
}

/** PathからURLを作る */
export const makeLink = (path: Path, base?: string | URL): URL =>
  new URL(
    `/${path.project}/${encodeTitleURI(path.title)}`,
    base ?? location.href,
  );
