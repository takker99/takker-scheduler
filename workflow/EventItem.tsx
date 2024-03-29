/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, FunctionComponent, h, useMemo } from "../deps/preact.tsx";
import { useMinutes } from "./useMinutes.ts";
import { Event, getEventStatus, isLink } from "./event.ts";
import { getEnd } from "../howm/Period.ts";
import type { Scrapbox } from "../deps/scrapbox-std-dom.ts";
import { makeLink } from "./path.ts";
declare const scrapbox: Scrapbox;

export const EventItem: FunctionComponent<
  { event: Event }
> = (
  { event },
) => {
  const EventName = useMemo(
    () =>
      isLink(event)
        ? (
          <a
            href={makeLink(event).href}
            {...(event.project === scrapbox.Project.name
              ? ({})
              : ({ rel: "noopener noreferrer", target: "_blank" }))}
          >
            {event.name}
          </a>
        )
        : <>{event.name}</>,
    [event],
  );

  const start = useMemo(
    () =>
      `${zero(event.plan.start.hours)}:${zero(event.plan.start.minutes)}` ||
      "     ",
    [event.plan.start],
  );
  const end = useMemo(
    () => {
      const end = getEnd(event.plan);
      return `${zero(end.hours)}:${zero(end.minutes)}` || "     ";
    },
    [event.plan.start, event.plan.duration],
  );

  const now = useMinutes();
  const type = useMemo(() => getEventStatus(event, now), [event, now]);

  return (
    <li data-status={type}>
      <time className="label start">{start}</time>
      <time className="label end">{end}</time>
      <time className="label duration">
        {`${event.plan.duration}`.padStart(4, "0")}
      </time>
      {EventName}
    </li>
  );
};

const zero = (n: number): string => `${n}`.padStart(2, "0");
