import type {
  Page,
  PageList,
  Scrapbox,
} from "https://raw.githubusercontent.com/scrapbox-jp/types/0.0.8/mod.ts";
export { getPage } from "https://raw.githubusercontent.com/takker99/scrapbox-userscript-std/0.8.4/rest/pages.ts";
export { joinPageRoom } from "https://raw.githubusercontent.com/takker99/scrapbox-headless-script/0.3.1/mod.ts";
export type Line = Page["lines"][0];
export type { PageList, Scrapbox };
