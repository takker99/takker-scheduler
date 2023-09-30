import { isBefore } from "./localDate.ts";
import { Task } from "./parse.ts";

export const compareFn = (
  a: Task & { freshness: number },
  b: Task & { freshness: number },
): number => {
  if (b.freshness !== a.freshness) return b.freshness - a.freshness;
  const sa = sortType(a);
  const sb = sortType(b);
  if (sa !== sb) return sb - sa;

  return isBefore(a.start, b.start) ? -1 : 1;
};

const sortType = (action: Task): number => {
  switch (action.status) {
    case "schedule":
      return 4;
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