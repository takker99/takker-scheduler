/** @jsxImportSource npm:preact@10 */
import { FunctionComponent, useMemo } from "../../deps/preact.tsx";
import { Event, getEventStatus, isLink } from "../scheduler/event.ts";
import { ScrapboxLink } from "../ScrapboxLink.tsx";
import { useMinutes } from "../useMinutes.ts";

export const EventItem: FunctionComponent<{ event: Event }> = ({ event }) => {
  const start = useMemo(
    () => event.plan.start.hours + event.plan.start.minutes / 60,
    [event.plan.start],
  );
  const style = useMemo(
    () => `--start: ${start}; --duration: ${event.plan.duration};`,
    [start, event.plan.duration],
  );

  const now = useMinutes();
  const type = useMemo(() => getEventStatus(event, now), [event, now]);

  return !isLink(event)
    ? (
      <div
        className="event"
        data-status={type}
        title={event.name}
        style={style}
      >
        {event.name}
      </div>
    )
    : (
      <ScrapboxLink
        className="event"
        data-status={type}
        style={style}
        title={event.title}
        project={event.project}
      >
        {event.name}
      </ScrapboxLink>
    );
};
