import { isValid, lightFormat, parse } from "./deps/date-fns.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

const baseTitle = "日刊記録sheet";
export function getDate(title?: string) {
  const pageTitle = title ?? scrapbox.Page.title;
  if (pageTitle === null) {
    throw Error("Could not get the page title.");
  }
  const date = parse(pageTitle, `'${baseTitle}' yyyy-MM-dd`, new Date(), {});
  return isValid(date) ? date : undefined;
}

export const getTitle = (date: Date) =>
  lightFormat(date, `'${baseTitle}' yyyy-MM-dd`);
