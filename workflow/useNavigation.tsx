import { useCallback, useState } from "../deps/preact.tsx";
import { toDate } from "../howm/localDate.ts";
import { Key, toKey, toLocalDate } from "./key.ts";

export type PageNo = Key | "expired" | "errors";

export const useNavigation = (
  defaultPageNo: PageNo = toKey(new Date())
) => {
  /** 日付の場合は現在表示しているタスクリストの基準点を表す
   * `expired`のときはやり残した予定を表示する
   * `error`のときはエラーを表示する
   */
  const [pageNo, setPageNo] = useState<PageNo>(defaultPageNo);

  const next = useCallback(() => {
    setPageNo((pageNo) => {
      switch(pageNo) {
        case "errors":
          return "expired";
        case "expired":
          return toKey(new Date());
        default: {
          const date = toDate(toLocalDate(pageNo));
          date.setDate(date.getDate() + 1);
          return toKey(date);
        }
      }
    });
  }, []);
  const prev = useCallback(() => {
    setPageNo((pageNo) => {
      const nowKey = toKey(new Date());
      switch(pageNo) {
        case "errors":
          return "errors";
        case "expired":
          return "errors";
        case nowKey:
          return "expired";
        default: {
          const date = toDate(toLocalDate(pageNo));
          date.setDate(date.getDate() - 1);
          return toKey(date);
        }
      }
    });
  }, []);

  return { pageNo, next, prev };
};
