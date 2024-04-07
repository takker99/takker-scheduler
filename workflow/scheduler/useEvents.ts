import { useMemo } from "../../deps/preact.tsx";
import { Task } from "../useTaskCrawler.ts";
import { parseLines } from "../../task.ts";
import { isString } from "../../utils.ts";
import {
  addDays,
  endOfDay,
  isSameDay,
  startOfDay,
  subDays,
} from "../../deps/date-fns.ts";
import { isBefore, toDate } from "../../howm/localDate.ts";
import { isReminder, makeRepeat } from "../../howm/parse.ts";
import { toTitle } from "../../diary.ts";
import { useLines } from "../useLines.ts";
import { Event, fromHowmEvent, fromTaskLine } from "./event.ts";
import { split } from "../../howm/Period.ts";

/** 指定した日付の予定を取得する
 *
 * 日付をまたぐ予定は、指定した日付にかぶる長さに削って取得する
 */
export const useEvents = (
  project: string,
  date: Date,
  tasks: Task[],
): Event[] => {
  // 日刊記録sheetから、前日・当日・翌日の予定を取得する
  // 日をまたぐ予定に対応するため、前後日の予定も取得する
  // 当日の予定個数判定を後でやるので、別々に予定を取り出しておく
  const events_ = [
    useEvents_(project, subDays(date, 1), tasks),
    useEvents_(project, date, tasks),
    useEvents_(project, addDays(date, 1), tasks),
  ];
  const events = useMemo(() => events_.flat(), events_);

  // 日付をまたぐ予定は、指定した日付にかぶる長さに削って取得する
  return useMemo(() => {
    /** この時刻以降の予定だけ表示する */
    const sPartition = startOfDay(date);
    /** この時刻以前の予定だけ表示する */
    const ePartition = endOfDay(date);

    // 当日内の予定だけ切り出す
    return events.flatMap(
      (event) => {
        const [, backward] = split(event.plan, sPartition);
        if (!backward) return [];
        const [forward] = split(backward, ePartition);
        if (!forward) return [];
        const { plan: _, ...rest } = event;
        return [{ plan: forward, ...rest }];
      },
    ).sort((a, b) => isBefore(a.plan.start, b.plan.start) ? -1 : 0);
  }, [events, date]);
};

const useEvents_ = (project: string, date: Date, tasks: Task[]) => {
  const lines = useLines(project, toTitle(date));
  /** 日刊記録sheetから取り出したevents */
  const eventsFromLines = useMemo(() => getEventsFromLines(lines, project), [
    lines,
    project,
  ]);

  return useMemo(
    () =>
      eventsFromLines.length !== 0
        ? eventsFromLines
        //当日の日刊記録sheetから一つも取得できなかった場合は、タスクリンクから生成する
        : getEventsFromLinks(date, tasks),
    [eventsFromLines, date, tasks],
  );
};

/** タスクリンクから、Eventsを生成する
 *
 * 予定開始日時があって、まだ終わっていないタスクを対象とする。
 */
const getEventsFromLinks = (date: Date, tasks: Task[]) =>
  tasks.flatMap((task) => {
    if (task.freshness?.status === "done") return [];
    if (isReminder(task)) return [];
    if (task.recurrence) {
      const generated = makeRepeat(task, date);
      return generated ? [fromHowmEvent(generated, task.project)] : [];
    }
    const start = toDate(task.executed.start);
    return isSameDay(start, date) ? [fromHowmEvent(task, task.project)] : [];
  });

/** 日刊記録sheetから、Eventsを生成する
 *
 * 予定開始日時があるもののみ対象とする。完了/未完了は考慮しない
 */
const getEventsFromLines = (
  lines: string[],
  project: string,
): Event[] => {
  const events: Event[] = [];
  for (const task of parseLines(lines)) {
    if (isString(task)) continue;

    const event = fromTaskLine(task, project);
    if (!event) continue;

    events.push(event);
  }
  return events;
};
