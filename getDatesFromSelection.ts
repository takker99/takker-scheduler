import { isValid } from "./deps/date-fns.ts";
import { caret } from "./deps/scrapbox-std-dom.ts";

export function* getDatesFromSelection(): Generator<Date, void, unknown> {
  for (
    const [, year, month, date] of caret().selectedText.matchAll(
      /(\d{4})-(\d{2})-(\d{2})/g,
    )
  ) {
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(date));
    if (!isValid(d)) continue;
    yield d;
  }
}
