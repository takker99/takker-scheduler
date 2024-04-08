/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, h, render, useEffect, useMemo } from "../../deps/preact.tsx";
import { useTaskCrawler } from "../useTaskCrawler.ts";
import { useDialog } from "../useDialog.ts";
import { CSS } from "../viewer.min.css.ts";
import { addDays } from "../../deps/date-fns.ts";
import { toKey, toStartOfWeek } from "../key.ts";
import { ProgressBar } from "../ProgressBar.tsx";
import { DailySchedule } from "./DailySchedule.tsx";
import { useStopPropagation } from "../useStopPropagation.ts";
import { useUserScriptEvent } from "../useUserScriptEvent.ts";
import { useWeeklyNavigation } from "./useWeeklyNavigation.tsx";

/** schedulerのcontroller */
export interface Controller {
  /** schedulerを開く */
  open: () => void;
  /** schedulerを閉じる */
  close: () => void;
  /** schedulerの開閉を切り替える */
  toggle: () => void;
}

/** 時系列順にタスクを閲覧するviewerを起動する
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
  const { pageNo, next, prev } = useWeeklyNavigation();

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

  return (
    <>
      <style>{CSS}</style>
      <dialog ref={ref} onClick={close}>
        <div className="controller" onClick={stopPropagation}>
          <span>{pageNo}</span>
          <ProgressBar loading={loading} />
          <button className="navi left" onClick={prev}>{"\ue02c"}</button>
          <button className="navi right" onClick={next}>{"\ue02d"}</button>
          <button className="reload" onClick={load} disabled={loading}>
            request reload
          </button>
          <button className="close" onClick={close}>{"\uf00d"}</button>
        </div>
        <ul
          className="result scheduler"
          onClick={stopPropagation}
          data-page-no={pageNo}
        >
          {dateList.map((date) => (
            <li key={toKey(date)}>
              <DailySchedule
                date={date}
                tasks={tasks}
                project={mainProject}
              />
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
};