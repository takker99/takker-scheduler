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
  useRef,
} from "../../deps/preact.tsx";
import { useTaskCrawler } from "../useTaskCrawler.ts";
import { useDialog } from "../useDialog.ts";
import { CSS } from "../viewer.min.css.ts";
import { addDays, addWeeks, subDays, subWeeks } from "../../deps/date-fns.ts";
import { toKey, toStartOfWeek, toWeekKey, WeekKey } from "../key.ts";
import { LoadButton } from "../LoadButton.tsx";
import { useStopPropagation } from "../useStopPropagation.ts";
import { useUserScriptEvent } from "../useUserScriptEvent.ts";
import { TimeGrid } from "./TimeGrid.tsx";
import { useNavigation } from "../scheduler/useNavigation.ts";
import { useOpen } from "../useOpen.ts";

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
  app.dataset.userscriptName = "takker-scheduler/weekly-scheduler";
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

/** 当日のtimelineを左隅に表示する
 *
 * @param projects タスクの取得先projectのリスト
 * @return viewerのcontroller
 */
export const setupWedget = (
  projects: string[],
  open: boolean,
): Promise<Controller> => {
  const app = document.createElement("div");
  app.dataset.userscriptName = "takker-scheduler/timeline-wedget";
  const shadowRoot = app.attachShadow({ mode: "open" });
  document.body.append(app);
  return new Promise(
    (resolve) =>
      render(
        <Wedget
          getController={resolve}
          projects={projects}
          mainProject={projects[0]}
          open={open}
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

const App: FunctionComponent<Props> = (
  { getController, projects, mainProject },
) => {
  const { tasks, load, loading } = useTaskCrawler(projects);
  const { pageNo, next, prev, jump } = useNavigation(
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
  const { ref, open, close, toggle, onOpen } = useDialog();
  useEffect(() => getController({ open, close, toggle }), [getController]);

  /** dialogクリックではmodalを閉じないようにする */
  const stopPropagation = useStopPropagation();

  // 同じタブで別のページに遷移したときはmodalを閉じる
  useUserScriptEvent("page:changed", close);

  const goToday = useCallback(() => jump(toWeekKey(new Date())), [jump]);

  // 初回renderingのみ、.indicatorを中央にスクロールする
  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const remover = onOpen(() => {
      if (!divRef.current) return;
      const el = divRef.current.getElementsByClassName("indicator")[0];
      if (!el) return;
      const scrollY = globalThis.scrollY;
      el.scrollIntoView({ block: "center" });
      globalThis.scroll(0, scrollY);
      remover();
    });
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <dialog ref={ref} onClick={close}>
        <div className="controller" onClick={stopPropagation}>
          <span>{pageNo}</span>
          <button className="navi left" onClick={prev}>{"\ue02c"}</button>
          <button className="navi right" onClick={next}>{"\ue02d"}</button>
          <button className="today" onClick={goToday}>{"\uf783"}</button>
          <LoadButton loading={loading} onClick={load} />
          <button className="close" onClick={close}>{"\uf00d"}</button>
        </div>

        <div
          ref={divRef}
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

const Wedget: FunctionComponent<Props & { open: boolean }> = (
  { projects, mainProject, getController, open: open_ },
) => {
  /** dialogクリックではmodalを閉じないようにする */
  const stopPropagation = useStopPropagation();

  const { tasks, load, loading } = useTaskCrawler(projects);

  const { pageNo, next, prev, jump } = useNavigation(
    new Date(),
    nextDate,
    prevDate,
  );
  const dates = useMemo(() => [pageNo], [pageNo]);

  const goToday = useCallback(() => jump(new Date()), [jump]);

  // UIの開閉
  const { isOpen, open, close, toggle, onOpen } = useOpen(open_);
  useEffect(() => getController({ open, close, toggle }), [getController]);
  // 初回renderingのみ、.indicatorを中央にスクロールする
  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scroll = () => {
      if (!divRef.current) return false;
      const el = divRef.current.getElementsByClassName("indicator")[0];
      if (!el) return false;
      // renderingより先にscrollIntoViewするとscrollされないので、renderingを待ってからscrollする
      requestAnimationFrame(() => {
        const scrollY = globalThis.scrollY;
        el.scrollIntoView({ block: "center" });
        globalThis.scroll(0, scrollY);
      });
      return true;
    };
    // 最初から開いているときは、すぐスクロールさせる。
    if (open_) {
      scroll();
      return;
    }
    const remover = onOpen(() => {
      if (scroll()) remover();
    });
  }, [open_]);

  return (
    <>
      <style>{CSS}</style>
      <div className={`wedget${isOpen ? " open" : ""}`} ref={divRef}>
        <div
          className="controller"
          onClick={stopPropagation}
        >
          <span>{toKey(pageNo)}</span>
          <button className="navi left" onClick={prev}>{"\ue02c"}</button>
          <button className="navi right" onClick={next}>{"\ue02d"}</button>
          <button className="today" onClick={goToday}>{"\uf783"}</button>
          <LoadButton loading={loading} onClick={load} />
        </div>
        <TimeGrid
          dateList={dates}
          tasks={tasks}
          project={mainProject}
          hasColumn={false}
        />
      </div>
    </>
  );
};

const nextWeekKey = (pageNo: WeekKey) =>
  toWeekKey(addWeeks(toStartOfWeek(pageNo), 1));
const prevWeekKey = (pageNo: WeekKey) =>
  toWeekKey(subWeeks(toStartOfWeek(pageNo), 1));

const nextDate = (date: Date) => addDays(date, 1);
const prevDate = (date: Date) => subDays(date, 1);
