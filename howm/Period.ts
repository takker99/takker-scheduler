import { addMinutes } from "../deps/date-fns.ts";
import { fromDate, isBefore, LocalDateTime, toDate } from "./localDate.ts";

/* いずれ実装する
/** 曜日指定情報を加えたDate *
export interface ExDate {
  base: Date;
  startOfDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  weekNum: number;
}
*/

export interface Period {
  /** 開始日時 */
  start: LocalDateTime;

  /** 所要時間 (min) */
  duration: number;
}

export interface Log {
  /** 開始日時 */
  start: LocalDateTime;

  /** 消費時間 (min) */
  duration?: number;
}

export const getEnd = <T extends Log>(
  period: T,
): T extends { duration: number } ? LocalDateTime : LocalDateTime | undefined =>
  period.duration === undefined
    ? (undefined as T extends { duration: number } ? LocalDateTime : undefined)
    : fromDate(addMinutes(toDate(period.start), period.duration));

/** 特定日時で分割する */
export const split = (
  period: Period,
  date: Date,
): [Period, undefined] | [Period, Period] | [undefined, Period] => {
  const start = toDate(period.start);
  const partition = date.getTime();
  const forwordMin = partition - start.getTime();

  if (forwordMin <= 0) return [undefined, period];
  if (period.duration <= forwordMin) return [period, undefined];
  const forward = { start: period.start, duration: forwordMin };
  return [forward, {
    start: getEnd(forward),
    duration: period.duration - forwordMin,
  }];
};
