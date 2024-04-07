/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, FunctionComponent, h, useMemo } from "../deps/preact.tsx";
import { Task } from "./useTaskCrawler.ts";
import { Event, isLink } from "./event.ts";
import { useEvents } from "./useEvents.ts";
import { ScrapboxLink } from "./ScrapboxLink.tsx";
import { getDate, isSameDay } from "../deps/date-fns.ts";
import { useMinutes } from "./useMinutes.ts";
import { getHours } from "../deps/date-fns.ts";
import { getMinutes } from "../deps/date-fns.ts";

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
                <span>{`${`${i + 1}`.padStart(2, "0")}:00`}</span>
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

const TimeLine: FunctionComponent<
  { project: string; date: Date; tasks: Task[] }
> = ({ project, date, tasks }) => {
  const events = useEvents(project, date, tasks);
  const now = useMinutes();
  const indicator = useMemo(
    () =>
      isSameDay(now, date)
        ? (
          <div
            className="indicator"
            style={`--start: ${getHours(now) + getMinutes(now) / 60}`}
          />
        )
        : <></>,
    [now, date],
  );

  return (
    <div className="timeline" role="gridcell">
      {indicator}
      {events.map((event) => <TimeBlock event={event} />)}
    </div>
  );
};

const TimeBlock: FunctionComponent<{ event: Event }> = ({ event }) => {
  const EventName = useMemo(
    () =>
      isLink(event)
        ? <ScrapboxLink {...event}>{event.name}</ScrapboxLink>
        : <>{event.name}</>,
    [event],
  );

  const start = useMemo(
    () => event.plan.start.hours + event.plan.start.minutes / 60,
    [event.plan.start],
  );
  const style = useMemo(
    () => `--start: ${start}; --duration: ${event.plan.duration};`,
    [start, event.plan.duration],
  );

  return (
    <div className="event" title={event.name} style={style}>{event.name}</div>
  );
};
