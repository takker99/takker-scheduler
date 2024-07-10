/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */

import { FunctionComponent, h } from "../../deps/preact.tsx";
import { Task } from "../useTaskCrawler.ts";
import { getDate } from "../../deps/date-fns.ts";
import { TimeLine } from "./TimeLine.tsx";
import { zero } from "../../zero.ts";
import { toKey } from "../key.ts";

/** 特定の日付のタスクを一覧するComponent
 *
 * @param date 表示する日付
 * @param tasks その日のタスク
 * @param project その日のタスクが属するproject
 */
export const TimeGrid: FunctionComponent<
  { dateList: Date[]; tasks: Task[]; project: string; hasColumn?: boolean }
> = (
  { dateList, tasks, project, hasColumn },
) => (
  <div className="timeline-wrap" role="grid">
    {(hasColumn ?? true) && (
      <div className="column-header" role="row">
        {dateList.map((date) => (
          <div key={toKey(date)} className="cell" role="columnheader">
            <h2>{getDate(date)}</h2>
          </div>
        ))}
      </div>
    )}

    <div className="week-container" role="presentation">
      <div className="week" role="presentation">
        <div className="borders">
          {[...Array(24).keys()].map((i) => (
            <div key={i} className="border" data-time={`${zero(i)}:00`} />
          ))}
        </div>
        {dateList.map(
          (date) => (
            <TimeLine
              key={toKey(date)}
              project={project}
              date={date}
              tasks={tasks}
            />
          ),
        )}
      </div>
    </div>
  </div>
);
