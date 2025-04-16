/** @jsxRuntime automatic */
/** @jsxImportSource npm:preact@10 */
import { FunctionComponent, useMemo } from "../../deps/preact.tsx";
import { Task } from "../useTaskCrawler.ts";
import { useEvents } from "../scheduler/useEvents.ts";
import { isSameDay } from "../../deps/date-fns.ts";
import { useMinutes } from "../useMinutes.ts";
import { getHours } from "../../deps/date-fns.ts";
import { getMinutes } from "../../deps/date-fns.ts";
import { EventItem } from "./EventItem.tsx";
import { isLink } from "../scheduler/event.ts";
import { Copy } from "../Copy.tsx";

export const TimeLine: FunctionComponent<
  { project: string; date: Date; tasks: Task[] }
> = ({ project, date, tasks }) => {
  const events = useEvents(project, date, tasks);
  const linkList = useMemo(
    () =>
      events.flatMap((event) => isLink(event) ? [`[${event.title}]`] : []).join(
        "\n",
      ),
    [events],
  );
  const now = useMinutes();
  const indicator = useMemo(
    () => (isSameDay(now, date) &&
      (
        <div
          className="indicator"
          style={`--start: ${getHours(now) + getMinutes(now) / 60}`}
        />
      )),
    [now, date],
  );

  return (
    <div className="timeline" role="gridcell">
      {events.map((event) => <EventItem key={event.name} event={event} />)}
      {indicator}
      <Copy text={linkList} />
    </div>
  );
};
