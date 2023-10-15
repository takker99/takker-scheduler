import { isBefore } from "./localDate.ts";
import { Reminder } from "./parse.ts";

export const compareFn = (
  a: Reminder & { freshness: number },
  b: Reminder & { freshness: number },
): number => {
  if (b.freshness !== a.freshness) return b.freshness - a.freshness;
  const sa = sortType(a);
  const sb = sortType(b);
  if (sa !== sb) return sb - sa;

  return isBefore(a.start, b.start) ? -1 : 1;
};

const sortType = (action: Reminder): number => {
  switch (action.status) {
    case "todo":
      return 3;
    case "note":
      return 2;
    case "deadline":
      return 5;
    case "up-down":
      return 1;
    case "done":
      return 0;
  }
};
