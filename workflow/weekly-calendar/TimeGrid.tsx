/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */

import { FunctionComponent, h } from "../../deps/preact.tsx";
import { Task } from "../useTaskCrawler.ts";
import { getDate } from "../../deps/date-fns.ts";
import { TimeLine } from "./TimeLine.tsx";
import { zero } from "../../zero.ts";

/** 特定の日付のタスクを一覧するComponent
 *
 * @param date 表示する日付
 * @param tasks その日のタスク
 * @param project その日のタスクが属するproject
 */
export const TimeGrid: FunctionComponent<
  { dateList: Date[]; tasks: Task[]; project: string }
> = (
  { dateList, tasks, project },
) => (
  <div className="timeline-wrap" role="grid">
    <div className="column-header" role="row">
      <div className="corner" />
      {dateList.map(
        (date) => (
          <div className="cell" role="columnheader">
            <h2>{getDate(date)}</h2>
          </div>
        ),
      )}
    </div>
    <div className="body" role="presentation">
      <div className="header-container">
        <div className="header">
          {[...Array(23).keys()].map(
            (i) => (
              <div className="time">
                <span>{`${zero(i)}:00`}</span>
              </div>
            ),
          )}
        </div>
      </div>
      <div className="week-container">
        <div className="week">
          <div className="borders">
            {[...Array(23).keys()].map(() => <div className="border" />)}
          </div>
          {dateList.map(
            (date) => (
              <TimeLine
                project={project}
                date={date}
                tasks={tasks}
              />
            ),
          )}
        </div>
      </div>
    </div>
  </div>
);
