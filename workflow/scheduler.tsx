/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */
/** @jsxFrag Fragment */

import {
  Fragment,
  FunctionComponent,
  h,
  render,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "../deps/preact.tsx";
import { Task, useTaskCrawler } from "./useTaskCrawler.ts";
import { useDialog } from "./useDialog.ts";
import { CSS } from "./viewer.min.css.ts";
import { Copy } from "./Copy.tsx";
import { makeError } from "../deps/scrapbox-std.ts";
import type { Scrapbox } from "../deps/scrapbox-std-dom.ts";
import {
  addDays,
  addWeeks,
  differenceInMinutes,
  eachDayOfInterval,
  isAfter,
  isSameDay,
  lightFormat,
  subWeeks,
} from "../deps/date-fns.ts";
import { format } from "../howm/localDate.ts";
import { calcFreshness } from "../howm/freshness.ts";
import {
  getDuration,
  getEnd,
  getStart,
  makeRepeat,
  parse,
} from "../howm/parse.ts";
import { compareFn } from "../howm/sort.ts";
import { Status } from "../howm/status.ts";
import {
  Key,
  toKey,
  toLocalDate,
  toStartOfWeek,
  toWeekKey,
  WeekKey,
} from "./key.ts";
import { ProgressBar } from "./ProgressBar.tsx";
import { toTitle } from "../diary.ts";
import { useLines } from "./useLines.ts";
import { endDate, parseLines } from "../task.ts";
import { isString } from "../utils.ts";
import { DailySchedule } from "./DailySchedule.tsx";
export declare const scrapbox: Scrapbox;

export interface Controller {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const setup = (projects: string[]): Promise<Controller> => {
  const app = document.createElement("div");
  app.dataset.userscriptName = "takker-scheduler/scheduler";
  const shadowRoot = app.attachShadow({ mode: "open" });
  document.body.append(app);
  return new Promise(
    (resolve) =>
      render(
        <App
          getController={(controller) => resolve(controller)}
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
  const { tasks, errors, load, loading } = useTaskCrawler(projects);
  const { pageNo, next, prev } = useNavigation();

  /** 表示対象の日付 */
  const dateList = useMemo(() => {
    const start = toStartOfWeek(pageNo);
    return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(start, i));
  }, [pageNo]);

  // UIの開閉
  const { ref, open, close, toggle } = useDialog();
  useEffect(() => getController({ open, close, toggle }), [getController]);

  /** dialogクリックではmodalを閉じないようにする */
  const stopPropagation = useCallback(
    (e: globalThis.Event) => e.stopPropagation(),
    [],
  );

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
                onPageChanged={close}
              />
            </li>
          ))}
        </ul>
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

  return { pageNo, next, prev };
};

export const zero = (n: number): string => `${n}`.padStart(2, "0");
