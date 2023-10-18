import {
  FunctionComponent,
  h, useCallback, useMemo
} from "../deps/preact.tsx";
import { encodeTitleURI } from "../deps/scrapbox-std.ts";
import { addMinutes } from "../deps/date-fns.ts";
import { fromDate, isBefore, toDate } from "../howm/localDate.ts";
import { useMinutes } from "./useMinutes.ts";
import { Event, scrapbox, zero } from "./scheduler.tsx";

const EventItem: FunctionComponent<
  { event: Event; onPageChanged: () => void; }
> = (
  { event, onPageChanged }
) => {
    const href = useMemo(
      () => event.raw
        ? `https://${location.hostname}/${event.project}/${encodeTitleURI(event.raw)}`
        : "",
      [event.project, event.raw]
    );

    // 同じタブで別のページに遷移したときはmodalを閉じる
    const handleClick = useCallback(() => {
      scrapbox.once("page:changed", onPageChanged);
      // 2秒以内に遷移しなかったら何もしない
      setTimeout(() => scrapbox.off("page:changed", onPageChanged), 2000);
    }, []);

    const localEnd = useMemo(
      () => fromDate(
        addMinutes(toDate(event.executed.start), event.executed.duration)
      ),
      [event.executed.start, event.executed.duration]
    );
    const start = useMemo(
      () => `${zero(event.executed.start.hours)}:${zero(event.executed.start.minutes)}` || "     ",
      [event.executed.start]
    );
    const end = useMemo(
      () => `${zero(localEnd.hours)}:${zero(localEnd.minutes)}` || "     ",
      [localEnd]
    );

    const now = useMinutes();
    const type = useMemo(
      () => event.freshness?.status === "done"
        ? "done"
        : isBefore(localEnd, fromDate(now))
          // リンクなしタスクは、予定開始時刻が過ぎていたら実行したものとして扱う
          ? event.raw ? "expired" : "done"
          : "",
      [event.freshness?.status, event.raw, localEnd, now]
    );

    return (
      <li data-type={type}>
        <time className="label start">{start}</time>
        <time className="label end">{end}</time>
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
