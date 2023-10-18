import {
  FunctionComponent,
  h, useMemo
} from "../deps/preact.tsx";
import { Task } from "./useTaskCrawler.ts";
import { Copy } from "./Copy.tsx";
import { addMinutes, differenceInMinutes, isSameDay } from "../deps/date-fns.ts";
import { fromDate, isBefore, toDate } from "../howm/localDate.ts";
import {
  makeRepeat,
  parse
} from "../howm/parse.ts";
import { toKey } from "./key.ts";
import { toTitle } from "../diary.ts";
import { usePages } from "./usePages.ts";
import { parseLines } from "../task.ts";
import { isString } from "../utils.ts";
import { useMinutes } from "./useMinutes.ts";
import { Event, ScheduleSummary, EventItem } from "./scheduler.tsx";

export const DailySchedule: FunctionComponent<
  { date: Date; tasks: Task[]; project: string; onPageChanged: () => void; }
> = (
  { date, tasks, project, onPageChanged }
) => {
    /** 対応する日刊記録sheetのテキスト。なければ空になる */
    const lines = usePages(project, toTitle(date));

    const summary = useMemo(() => toKey(date), [date]);

    /** 表示する予定 */
    const events_: Event[] = useMemo(() => {
      // 日刊記録sheetから取得する
      // 実際に使った時間を優先して使う
      const events: Event[] = [];
      for(const task of parseLines(lines)) {
        if(isString(task)) continue;

        // []分を外して解析する
        // 解析できなかった場合は[]を外す前のを使うので問題ない
        const result = parse(task.title.slice(1, -1));
        const name = result?.ok ? result.value.name : task.title;
        // rawが空文字のものは自動生成されたタスクだというルールにする
        const raw = result?.ok ? result.value.raw : "";
        const done = result?.ok
          ? result.value.freshness?.status === "done"
          : task.record.end !== undefined;
        if(done) {
          if(!task.record.start) continue;
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
        if(!task.plan.start) continue;
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
      if(events.length > 0) return events;

      // 日刊記録sheetから一つも取得できなかった場合は、タスクリンクから生成する
      return tasks.flatMap((task) => {
        if(!("executed" in task)) return [];
        if(task.recurrence) {
          const generated = makeRepeat(task, date);
          if(!generated) return [];
          // rawが空文字のものは自動生成されたタスクだというルールにする
          generated.raw = "";
          return [{ ...generated, project: task.project }];
        }
        if(!isSameDay(toDate(task.executed.start), date)) return [];

        return [task];
      });
    }, [tasks, lines]);

    const now = useMinutes();
    /** タスクの完了状況を付与した予定
     *
     * 現在時刻で変化するので、別に計算する
     *
     * remainsはやることの総量 (min)
     */
    const [events, remains]: [
      (Event & { type: "done" | "expired" | ""; })[],
      number
    ] = useMemo(
      () => {
        let remains = 0;
        const events = events_.map((event) => {
          const end = fromDate(
            addMinutes(toDate(event.executed.start), event.executed.duration)
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

        return [
          events.sort((a, b) => isBefore(a.executed.start, b.executed.start) ? -1 : 0
          ),
          remains,
        ];
      },
      [events_, now]
    );

    /** 当日の折り畳みがあれば、defaultで開いておく */
    const open = useMemo(() => summary === toKey(new Date()), [summary]);

    const copyText = useMemo(() => [
      summary,
      ...events.map((event) => event.raw ? ` [${event.raw}]` : ` ${event.name}`
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
              onPageChanged={onPageChanged} />
          ))}
        </ul>
      </details>
    );
  };
