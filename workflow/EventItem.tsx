/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */
/** @jsxFrag Fragment */

import { FunctionComponent, h, useCallback, useMemo } from "../deps/preact.tsx";
import { encodeTitleURI } from "../deps/scrapbox-std.ts";
import { useMinutes } from "./useMinutes.ts";
import { scrapbox } from "./scheduler.tsx";
import { Event, getEventStatus, getRemains, isLink } from "./Event.ts";
import { getEnd } from "../howm/Period.ts";

export const EventItem: FunctionComponent<
  { event: Event; onPageChanged: () => void }
> = (
  { event, onPageChanged },
) => {
  const href = useMemo(
    () =>
      isLink(event)
        ? `https://${location.hostname}/${event.project}/${
          encodeTitleURI(event.name)
        }`
        : "",
    [event.project, isLink(event), event.name],
  );

  // 同じタブで別のページに遷移したときはmodalを閉じる
  const handleClick = useCallback(() => {
    scrapbox.once("page:changed", onPageChanged);
    // 2秒以内に遷移しなかったら何もしない
    setTimeout(() => scrapbox.off("page:changed", onPageChanged), 2000);
  }, []);

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
    <li data-type={type}>
      <time className="label start">{start}</time>
      <time className="label end">{end}</time>
      <time className="label">{`${getRemains(event,now)}`.padStart(4, "0")}</time>
      {href
        ? (
          <a
            href={href}
            {...(event.project === scrapbox.Project.name ? ({}) : (
              {
                rel: "noopener noreferrer",
                target: "_blank",
              }
            ))}
            onClick={handleClick}
          >
            {event.name}
          </a>
        )
        : event.name}
    </li>
  );
};


const zero = (n: number): string => `${n}`.padStart(2, "0");