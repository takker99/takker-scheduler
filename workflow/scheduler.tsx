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
import { encodeTitleURI, makeError } from "../deps/scrapbox-std.ts";
import type { Scrapbox } from "../deps/scrapbox-std-dom.ts";
import {
  addDays,
  addMinutes,
  addWeeks,
  differenceInMinutes,
  eachDayOfInterval,
  isAfter,
  isSameDay,
  lightFormat,
  subWeeks,
} from "../deps/date-fns.ts";
import { format, fromDate, isBefore, toDate } from "../howm/localDate.ts";
import { calcFreshness } from "../howm/freshness.ts";
import {
  Event as EventBase,
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
import { usePages } from "./usePages.ts";
import { endDate, parseLines } from "../task.ts";
import { isString } from "../utils.ts";
import { useMinutes } from "./useMinutes.ts";
declare const scrapbox: Scrapbox;

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

interface Event extends EventBase {
  project: string;
}

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

const DailySchedule: FunctionComponent<
  { date: Date; tasks: Task[]; project: string; onPageChanged: () => void }
> = (
  { date, tasks, project, onPageChanged },
) => {
  /** 対応する日刊記録sheetのテキスト。なければ空になる */
  const lines = usePages(project, toTitle(date));

  const summary = useMemo(() => toKey(date), [date]);

  /** 表示する予定 */
  const events_: Event[] = useMemo(() => {
    // 日刊記録sheetから取得する
    // 実際に使った時間を優先して使う
    const events: Event[] = [];
    for (const task of parseLines(lines)) {
      if (isString(task)) continue;

      // []分を外して解析する
      // 解析できなかった場合は[]を外す前のを使うので問題ない
      const result = parse(task.title.slice(1, -1));
      const name = result?.ok ? result.value.name : task.title;
      // rawが空文字のものは自動生成されたタスクだというルールにする
      const raw = result?.ok ? result.value.raw : "";
      const done = result?.ok
        ? result.value.freshness?.status === "done"
        : task.record.end !== undefined;
      if (done) {
        if (!task.record.start) continue;
        const executed = {
          start: fromDate(task.record.start),
          duration: differenceInMinutes(task.record.end, task.record.start),
        };
        events.push({
          project,
          name,
          freshness: {
            status: "done",
            refDate: executed.start,
          },
          executed,
          raw,
        });
        continue;
      }

      // 予定開始日時があるもののみ対象とする
      if (!task.plan.start) continue;
      events.push({
        project,
        name,
        executed: {
          start: fromDate(task.plan.start),
          duration: (task.plan.duration ?? 0) / 60,
        },
        raw,
      });
    }
    if (events.length > 0) return events;

    // 日刊記録sheetから一つも取得できなかった場合は、タスクリンクから生成する
    return tasks.flatMap((task) => {
      if (!("executed" in task)) return [];
      if (task.recurrence) {
        const generated = makeRepeat(task, date);
        if (!generated) return [];
        // rawが空文字のものは自動生成されたタスクだというルールにする
        generated.raw = "";
        return [{ ...generated, project: task.project }];
      }
      if (!isSameDay(toDate(task.executed.start), date)) return [];

      return [task];
    }).sort((a, b) => isBefore(a.executed.start, b.executed.start) ? -1 : 0);
  }, [tasks, lines]);

  const now = useMinutes();
  /** タスクの完了状況を付与した予定
   *
   * 現在時刻で変化するので、別に計算する
   *
   * remainsはやることの総量 (min)
   */
  const [events, remains]: [
    (Event & { type: "done" | "expired" | "" })[],
    number,
  ] = useMemo(
    () => {
      let remains = 0;
      const events = events_.map((event) => {
        const end = fromDate(
          addMinutes(toDate(event.executed.start), event.executed.duration),
        );
        const localNow = fromDate(now);
        const type: "done" | "expired" | "" = isBefore(end, localNow)
          // リンクなしタスクは、予定開始時刻が過ぎていたら実行したものとして扱う
          ? event.raw ? "expired" : "done"
          : event.freshness?.status === "done"
          ? "done"
          : "";
        remains += type === "expired"
          ? event.executed.duration
          : type === "done"
          ? 0
          : isBefore(localNow, event.executed.start)
          ? event.executed.duration
          : differenceInMinutes(now, toDate(event.executed.start));
        return { ...event, type };
      });

      return [events, remains];
    },
    [events_, now],
  );

  /** 当日の折り畳みがあれば、defaultで開いておく */
  const open = useMemo(() => summary === toKey(new Date()), [summary]);

  const copyText = useMemo(() =>
    [
      summary,
      ...events.map((event) =>
        event.raw ? ` [${event.raw}]` : ` ${event.name}`
      ),
    ].join("\n"), [summary, events]);

  return events.length === 0 ? <>{summary}</> : (
    <details open={open}>
      <summary>
        {summary}
        <Copy text={copyText} />
        <ScheduleSummary date={date} now={now} remains={remains} />
      </summary>
      <ul>
        {events.map((event, i) => (
          <EventItem
            key={event.raw ?? i}
            event={event}
            onPageChanged={onPageChanged}
          />
        ))}
      </ul>
    </details>
  );
};

const EventItem: FunctionComponent<
  { event: Event; onPageChanged: () => void }
> = (
  { event, onPageChanged },
) => {
  const href = useMemo(
    () =>
      event.raw
        ? `https://${location.hostname}/${event.project}/${
          encodeTitleURI(event.raw)
        }`
        : "",
    [event.project, event.raw],
  );

  // 同じタブで別のページに遷移したときはmodalを閉じる
  const handleClick = useCallback(() => {
    scrapbox.once("page:changed", onPageChanged);
    // 2秒以内に遷移しなかったら何もしない
    setTimeout(() => scrapbox.off("page:changed", onPageChanged), 2000);
  }, []);

  const localEnd = useMemo(
    () =>
      fromDate(
        addMinutes(toDate(event.executed.start), event.executed.duration),
      ),
    [event.executed.start, event.executed.duration],
  );
  const start = useMemo(
    () =>
      `${zero(event.executed.start.hours)}:${
        zero(event.executed.start.minutes)
      }` || "     ",
    [event.executed.start],
  );
  const end = useMemo(
    () => `${zero(localEnd.hours)}:${zero(localEnd.minutes)}` || "     ",
    [localEnd],
  );

  const now = useMinutes();
  const type = useMemo(
    () =>
      event.freshness?.status === "done"
        ? "done"
        : isBefore(localEnd, fromDate(now))
        // リンクなしタスクは、予定開始時刻が過ぎていたら実行したものとして扱う
        ? event.raw ? "expired" : "done"
        : "",
    [event.freshness?.status, event.raw, localEnd, now],
  );

  return (
    <li data-type={type}>
      <time className="label start">{start}</time>
      <time className="label end">{end}</time>
      {href
        ? (
          <a
            href={href}
            {...(event.project === scrapbox.Project.name ? ({}) : (
              {
                rel: "noopener noreferrer",
                target: "_blank",
              }
            ))}
            onClick={handleClick}
          >
            {event.name}
          </a>
        )
        : event.name}
    </li>
  );
};

const ScheduleSummary: FunctionComponent<
  { date: Date; now: Date; remains: number }
> = (
  { date, now, remains },
) => {
  const used = isAfter(date, now) ? 0 : differenceInMinutes(now, date);
  const value = used + remains;
  const max = Math.max(value, 1440);
  const scale = Math.max(1.0, max / 1440);
  const legend = `${remains}min undone, ${1440 - used - remains}min remains`;

  return (
    <>
      <meter
        min={0}
        max={max}
        optimum={560}
        // 活動時間を16時間として計算。5時間20分がbuffer時間となる
        low={1120}
        high={1440}
        value={value}
        style={{
          width: `calc(${
            scale.toFixed(2)
          } * var(--takker-scheduler-summary-meter-width, 10em))`,
        }}
      />
      {legend}
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

const zero = (n: number): string => `${n}`.padStart(2, "0");
