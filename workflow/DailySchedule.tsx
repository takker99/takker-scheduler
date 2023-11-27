/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, FunctionComponent, h, useMemo } from "../deps/preact.tsx";
import { Task } from "./useTaskCrawler.ts";
import { Copy } from "./Copy.tsx";
import {
  addDays,
  endOfDay,
  isSameDay,
  startOfDay,
  subDays,
} from "../deps/date-fns.ts";
import { isBefore, toDate } from "../howm/localDate.ts";
import { isReminder, makeRepeat, toString } from "../howm/parse.ts";
import { toKey } from "./key.ts";
import { toTitle } from "../diary.ts";
import { useLines } from "./useLines.ts";
import { parseLines } from "../task.ts";
import { isString } from "../utils.ts";
import { useMinutes } from "./useMinutes.ts";
import {
  Event,
  fromHowmEvent,
  fromTaskLine,
  getRemains,
  isLink,
} from "./event.ts";
import { split } from "../howm/Period.ts";
import { ScheduleSummary } from "./ScheduleSummary.tsx";
import { EventItem } from "./EventItem.tsx";

export const DailySchedule: FunctionComponent<
  { date: Date; tasks: Task[]; project: string; onPageChanged: () => void }
> = (
  { date, tasks, project, onPageChanged },
) => {
  // 日刊記録sheetから、前日・当日・翌日の予定を取得する
  // 日をまたぐ予定に対応するため、前後日の予定も取得する
  // 当日の予定個数判定を後でやるので、別々に予定を取り出しておく
  const ylines = useLines(project, toTitle(subDays(date, 1)));
  /** 前日の日刊記録sheetから取得したevents */
  const eventsFromyLine: Event[] = useMemo(
    () => getEventsFromLines(ylines, project),
    [
      ylines,
      project,
    ],
  );
  const plines = useLines(project, toTitle(date));
  /** 当日の日刊記録sheetから取得したevents */
  const eventsFrompLine: Event[] = useMemo(
    () => getEventsFromLines(plines, project),
    [
      plines,
      project,
    ],
  );
  const tlines = useLines(project, toTitle(addDays(date, 1)));
  /** 翌日の日刊記録sheetから取得したevents */
  const eventsFromtLine: Event[] = useMemo(
    () => getEventsFromLines(tlines, project),
    [
      tlines,
      project,
    ],
  );

  const summary = useMemo(() => toKey(date), [date]);

  const now = useMinutes();

  /**  リンクから生成したevents
   *
   * 当日の日刊記録sheetから一つも取得できなかった場合は、タスクリンクから生成する
   */
  const eventsFromLink: Event[] = useMemo(() => {
    if (eventsFrompLine.length > 0) return [];

    const yesterday = subDays(date, 1);
    const tomorrow = addDays(date, 1);
    return tasks.flatMap((task) => {
      if (task.freshness?.status === "done") return [];
      if (isReminder(task)) return [];
      if (task.recurrence) {
        return [yesterday, date, tomorrow].flatMap((d) => {
          const generated = makeRepeat(task, d);
          if (!generated) return [];
          return [
            fromHowmEvent({
              ...generated,
              project: task.project,
              title: toString(generated),
            }),
          ];
        });
      }
      const start = toDate(task.executed.start);
      if (
        !isSameDay(start, yesterday) && !isSameDay(start, date) &&
        !isSameDay(start, tomorrow)
      ) return [];
      return [fromHowmEvent(task)];
    });
  }, [tasks, eventsFrompLine, date]);

  /** 表示する予定
   *
   * 現在時刻で変化するので、別に計算する
   *
   * remainsはやることの総量 (min)
   */
  const [events, remains]: [Event[], number] = useMemo(() => {
    /** この日にやることの総量 (min) */
    let remains = 0;

    // 当日内の予定だけ切り出す
    /** この時刻以降の予定だけ表示する */
    const sPartition = startOfDay(date);
    /** この時刻以前の予定だけ表示する */
    const ePartition = endOfDay(date);
    const events: Event[] = [
      ...eventsFromyLine,
      ...eventsFrompLine,
      ...eventsFromtLine,
      ...eventsFromLink,
    ].flatMap(
      (event) => {
        const [, backward] = split(event.plan, sPartition);
        if (!backward) return [];
        const [forward] = split(backward, ePartition);
        if (!forward) return [];
        const { plan: _, ...rest } = event;
        const result = { plan: forward, ...rest };
        remains += getRemains(result, now);
        return [result];
      },
    ).sort((a, b) => isBefore(a.plan.start, b.plan.start) ? -1 : 0);

    return [events, remains];
  }, [
    eventsFromyLine,
    eventsFrompLine,
    eventsFromtLine,
    eventsFromLink,
    now,
    date,
    tasks,
  ]);

  /** 当日の折り畳みがあれば、defaultで開いておく */
  const open = useMemo(() => summary === toKey(new Date()), [summary]);

  const copyText = useMemo(() =>
    [
      summary,
      ...events.map((event) =>
        isLink(event) ? ` [${event.name}]` : ` ${event.name}`
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
            key={event.name}
            event={event}
            onPageChanged={onPageChanged}
          />
        ))}
      </ul>
    </details>
  );
};

/** 日刊記録sheetから、Eventsを生成する
 *
 * 予定開始日時があるもののみ対象とする。完了未完了は考慮しない
 */
const getEventsFromLines = (lines: string[], project: string): Event[] => {
  const events: Event[] = [];
  for (const task of parseLines(lines)) {
    if (isString(task)) continue;

    const event = fromTaskLine(task, project);
    if (!event) continue;

    events.push(event);
  }
  return events;
};
