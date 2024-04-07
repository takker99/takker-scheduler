/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, FunctionComponent, h, useMemo } from "../../deps/preact.tsx";
import { Event, isLink } from "../scheduler/event.ts";
import { ScrapboxLink } from "../ScrapboxLink.tsx";

export const EventItem: FunctionComponent<{ event: Event }> = ({ event }) => {
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
