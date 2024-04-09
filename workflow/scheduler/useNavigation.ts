import { useCallback, useState } from "../../deps/preact.tsx";

export const useNavigation = <PageNo, T = PageNo>(
  defaultPageNo: PageNo,
  nextFn: (pageNo: PageNo) => PageNo,
  prevFn: (pageNo: PageNo) => PageNo,
) => {
  /** 現在表示する週番号を格納する */
  const [pageNo, setPageNo] = useState<PageNo>(defaultPageNo);

  const next = useCallback(() => setPageNo(nextFn), [nextFn]);
  const prev = useCallback(() => setPageNo(prevFn), [nextFn]);

  const jump = useCallback((pageNo: PageNo) => setPageNo(pageNo), []);
  return { pageNo, next, prev, jump };
};
