/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, FunctionComponent, h, useMemo } from "../deps/preact.tsx";
import { Task } from "./useTaskCrawler.ts";
import { Copy } from "./Copy.tsx";
import { toKey } from "./key.ts";
import { useMinutes } from "./useMinutes.ts";
import { getRemains, isLink } from "./event.ts";
import { ScheduleSummary } from "./ScheduleSummary.tsx";
import { EventItem } from "./EventItem.tsx";
import { useEvents } from "./useEvents.ts";
import { sumOf } from "../deps/collections.ts";

/** 特定の日付のタスクを一覧するComponent
 *
 * @param date 表示する日付
 * @param tasks その日のタスク
 * @param project その日のタスクが属するproject
 */
export const DailySchedule: FunctionComponent<
  { date: Date; tasks: Task[]; project: string }
> = (
  { date, tasks, project },
) => {
  const summary = useMemo(() => toKey(date), [date]);

  /** 表示する予定 */
  const events = useEvents(project, date, tasks);
  const now = useMinutes();

  /** やることの総量 (min) */
  const remains = useMemo(
    () => sumOf(events, (event) => getRemains(event, now)),
    [events, now],
  );

  /** 当日の折り畳みがあれば、defaultで開いておく */
  const open = useMemo(() => summary === toKey(new Date()), [summary]);

  const copyText = useMemo(() =>
    [
      summary,
      ...events.map((event) =>
        isLink(event) ? ` [${event.title}]` : ` ${event.name}`
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
        {events.map((event, i) => <EventItem key={event.name} event={event} />)}
      </ul>
    </details>
  );
};
