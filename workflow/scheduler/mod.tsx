/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, h, render, useMemo } from "../../deps/preact.tsx";
import { useTaskCrawler } from "../useTaskCrawler.ts";
import { useDialog } from "../useDialog.ts";
import { CSS } from "../viewer.min.css.ts";
import { addDays, addWeeks, subWeeks } from "../../deps/date-fns.ts";
import { toKey, toStartOfWeek, toWeekKey, WeekKey } from "../key.ts";
import { LoadButton } from "../LoadButton.tsx";
import { DailySchedule } from "./DailySchedule.tsx";
import { useUserScriptEvent } from "../useUserScriptEvent.ts";
import { useNavigation } from "./useNavigation.ts";
import { useExports } from "../useExports.ts";

/** schedulerのcontroller */
export interface ValidController {
  /** calendarを開く */
  open: () => void;
  /** calendarを閉じる */
  close: () => void;
}
export type InvalidController = Record<keyof ValidController, undefined>;
/** calenedarのcontroller
 *
 * methodsは{@link ValidController}を参照
 *
 * calendarがumountされた後は{@link InvalidController}(全てのmethodsが`undefined`)になる
 */
export type Controller = ValidController | InvalidController;

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
  const { pageNo, next, prev } = useNavigation(
    toWeekKey(new Date()),
    nextWeekKey,
    prevWeekKey,
  );

  /** 表示対象の日付
   *
   * 指定した週の日曜日から土曜日までの日付を格納する
   */
  const dateList = useMemo(() => {
    const start = toStartOfWeek(pageNo);
    return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(start, i));
  }, [pageNo]);

  // UIの開閉
  const { ref, open, close } = useDialog();
  useExports(getController, { open, close });

  // 同じタブで別のページに遷移したときはmodalを閉じる
  useUserScriptEvent("page:changed", close);

  return (
    <>
      <style>{CSS}</style>
      <dialog ref={ref}>
        <div className="controller">
          <span>{pageNo}</span>
          <button className="navi left" onClick={prev}>{"\ue02c"}</button>
          <button className="navi right" onClick={next}>{"\ue02d"}</button>
          <LoadButton loading={loading} onClick={load} />
          <button className="close" onClick={close}>{"\uf00d"}</button>
        </div>
        <ul
          className="result scheduler"
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

const nextWeekKey = (pageNo: WeekKey) =>
  toWeekKey(addWeeks(toStartOfWeek(pageNo), 1));
const prevWeekKey = (pageNo: WeekKey) =>
  toWeekKey(subWeeks(toStartOfWeek(pageNo), 1));
