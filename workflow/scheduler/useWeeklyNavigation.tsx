import { useCallback, useState } from "../../deps/preact.tsx";
import { addWeeks, subWeeks } from "../../deps/date-fns.ts";
import { toStartOfWeek, toWeekKey, WeekKey } from "../key.ts";

export const useWeeklyNavigation = (
  defaultPageNo: WeekKey = toWeekKey(new Date()),
) => {
  /** 現在表示する週番号を格納する */
  const [pageNo, setPageNo] = useState<WeekKey>(defaultPageNo);

  const next = useCallback(() => {
    setPageNo((pageNo) => toWeekKey(addWeeks(toStartOfWeek(pageNo), 1)));
  }, []);
  const prev = useCallback(() => {
    setPageNo((pageNo) => toWeekKey(subWeeks(toStartOfWeek(pageNo), 1)));
  }, []);

  const jump = useCallback((date: Date) => setPageNo(toWeekKey(date)), []);
  return { pageNo, next, prev, jump };
};
