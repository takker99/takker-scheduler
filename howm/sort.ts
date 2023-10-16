import { Freshness } from "./freshness.ts";
import { isBefore } from "./localDate.ts";
import { Event, getStart, Reminder } from "./parse.ts";

export const compareFn = (
  a:
    & (
      | Reminder
      | (Omit<Event, "freshness"> & Required<Pick<Event, "freshness">>)
    )
    & { score: number },
  b:
    & (
      | Reminder
      | (Omit<Event, "freshness"> & Required<Pick<Event, "freshness">>)
    )
    & { score: number },
): number => {
  if (b.score !== a.score) return b.score - a.score;
  const sa = sortType(a.freshness);
  const sb = sortType(b.freshness);
  if (sa !== sb) return sb - sa;

  return isBefore(getStart(a), getStart(b)) ? -1 : 1;
};

const sortType = (freshness: Freshness): number => {
  switch (freshness.status) {
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
