import { selection } from "./lib/selection.js";
import { isValid, parse } from "./deps/date-fns.ts";

export function getDatesFromSelection() {
  const text = selection.text;
  const now = new Date();
  return [...text.matchAll(/\d{4}-\d{2}-\d{2}/g)]
    .flatMap(([dateString]) => {
      console.log(dateString);
      const date = parse(dateString, "yyyy-MM-dd", now);
      return isValid(date) ? [date] : [];
    });
}
