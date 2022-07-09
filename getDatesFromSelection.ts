import { isValid, parse } from "./deps/date-fns.ts";
import { caret } from "./deps/scrapbox-std-dom.ts";

export function* getDatesFromSelection() {
  const now = new Date();
  for (
    const [dateString] of caret().selectedText.matchAll(/\d{4}-\d{2}-\d{2}/g)
  ) {
    const date = parse(dateString, "yyyy-MM-dd", now);
    if (!isValid(date)) continue;
    yield date;
  }
}
