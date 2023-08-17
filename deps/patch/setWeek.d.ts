import type { Locale } from "https://deno.land/x/date_fns@v2.22.1/locale/types.ts";

export default function (
  date: Date | number,
  week: number,
  options?: {
    locale?: Locale;
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    firstWeekContainsDate?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  },
): Date;
