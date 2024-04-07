/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */
/** @jsxFrag Fragment */

import {
  Fragment,
  h,
  render,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "../deps/preact.tsx";
import { useTaskCrawler } from "./useTaskCrawler.ts";
import { useDialog } from "./useDialog.ts";
import { CSS } from "./viewer.min.css.ts";
import { addDays, addWeeks, subWeeks } from "../deps/date-fns.ts";
import { toStartOfWeek, toWeekKey, WeekKey } from "./key.ts";
import { ProgressBar } from "./ProgressBar.tsx";
import { useStopPropagation } from "./useStopPropagation.ts";
import { useUserScriptEvent } from "./useUserScriptEvent.ts";
import { TimeGrid } from "./TimeGrid.tsx";

/** calnedarのcontroller */
export interface Controller {
  /** calendarを開く */
  open: () => void;
  /** calendarを閉じる */
  close: () => void;
  /** calendarの開閉を切り替える */
  toggle: () => void;
}

/** 週単位のカレンダーを起動する
 *
 * @param projects タスクの取得先projectのリスト
 * @return viewerのcontroller
 */
export const setup = (projects: string[]): Promise<Controller> => {
  const app = document.createElement("div");
  app.dataset.userscriptName = "takker-scheduler/scheduler";
  const shadowRoot = app.attachShadow({ mode: "open" });
  document.body.append(app);
  return new Promise(
    (resolve) =>
      render(
        <App
          getController={resolve}
          projects={projects}
          mainProject={projects[0]}
        />,
        shadowRoot,
      ),
  );
};

interface Props {
  getController: (controller: Controller) => void;
  projects: string[];

  /** 日刊記録sheetが置いてあるproject */
  mainProject: string;
}
const App = ({ getController, projects, mainProject }: Props) => {
  const { tasks, load, loading } = useTaskCrawler(projects);
  const { pageNo, next, prev, jump } = useNavigation();

  /** 表示対象の日付
   *
   * 指定した週の日曜日から土曜日までの日付を格納する
   */
  const dateList = useMemo(() => {
    const start = toStartOfWeek(pageNo);
    return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(start, i));
  }, [pageNo]);

  // UIの開閉
  const { ref, open, close, toggle } = useDialog();
  useEffect(() => getController({ open, close, toggle }), [getController]);

  /** dialogクリックではmodalを閉じないようにする */
  const stopPropagation = useStopPropagation();

  // 同じタブで別のページに遷移したときはmodalを閉じる
  useUserScriptEvent("page:changed", close);

  const goToday = useCallback(() => jump(new Date()), [jump]);

  return (
    <>
      <style>{CSS}</style>
      <dialog ref={ref} onClick={close}>
        <div className="controller" onClick={stopPropagation}>
          <span>{pageNo}</span>
          <ProgressBar loading={loading} />
          <button className="navi left" onClick={prev}>{"\ue02c"}</button>
          <button className="navi right" onClick={next}>{"\ue02d"}</button>
          <button className="today" onClick={goToday}>today</button>
          <button className="reload" onClick={load} disabled={loading}>
            request reload
          </button>
          <button className="close" onClick={close}>{"\uf00d"}</button>
        </div>

        <div
          className="result scheduler"
          onClick={stopPropagation}
          data-page-no={pageNo}
        >
          <TimeGrid dateList={dateList} tasks={tasks} project={mainProject} />
        </div>
      </dialog>
    </>
  );
};

const useNavigation = (
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
