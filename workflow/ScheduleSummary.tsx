/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, FunctionComponent, h } from "../deps/preact.tsx";
import { differenceInMinutes, isAfter } from "../deps/date-fns.ts";

export const ScheduleSummary: FunctionComponent<
  { date: Date; now: Date; remains: number }
> = (
  { date, now, remains },
) => {
  const used = isAfter(date, now)
    ? 0
    : Math.min(differenceInMinutes(now, date), 1440);
  const value = used + remains;
  const max = Math.max(value, 1440);
  const scale = Math.max(1, max / 1440);
  const legend = `${remains}min undone, ${1440 - used - remains}min remains`;

  return (
    <>
      <meter
        min={0}
        max={max}
        optimum={560}
        // 活動時間を16時間として計算。5時間20分がbuffer時間となる
        low={1120}
        high={1440}
        value={value}
        style={{
          width: `calc(${
            scale.toFixed(2)
          } * var(--takker-scheduler-summary-meter-width, 10em))`,
        }}
      />
      {legend}
    </>
  );
};
