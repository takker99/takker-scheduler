import type { Task } from "./parse.ts";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  getMonth,
  getYear,
  isBefore,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isSameYear,
  setWeek,
  startOfWeek,
} from "../deps/date-fns.ts";

/** 分類カテゴリ */
export type Category =
  | "missed" // すでに締め切り過ぎてる
  | "today" // 今日やる
  | "tomorrow" // 明日やる
  | "in week" // 今週やる
  | "in next week" // 来週やる
  | "in month" // 今月やる
  | "in next month" // 来月やる
  | "in year" // 今年やる
  | "in next year" // 来年やる
  | "someday" // それ以外
  | "no startAt"; // いつ頃やるか決めてない

export const classify = (
  { due, startAt }: Pick<Task, "startAt" | "due">,
  now: Date,
): Category => {
  if (due && isBefore(due, now)) return "missed";
  if (!startAt) return "no startAt";

  const year = getYear(now);
  if (startAt.year > year + 1) return "someday";
  if (startAt.year < year) return "missed";
  if (startAt.type === "year") {
    return startAt.year === year ? "in year" : "in next year";
  }

  const month = getMonth(now);
  if (startAt.type === "week") {
    const sunday = startOfWeek(now);
    // 時差で2022-01-01が2021-12-31で処理されてしまう場合があるので、一月わざとずらしてある
    const target = startOfWeek(
      setWeek(new Date(startAt.year, 1, 0), startAt.week),
    );
    if (isBefore(target, sunday)) return "missed";
    if (isSameWeek(sunday, target)) return "in week";
    if (isSameWeek(addWeeks(sunday, 1), target)) return "in next week";
    if (isSameMonth(sunday, target)) return "in month";
    if (isSameMonth(addMonths(sunday, 1), target)) return "in next month";
    if (isSameYear(sunday, target)) return "in year";
    if (isSameYear(addYears(sunday, 1), target)) return "in next year";
    return "someday";
  }

  if (startAt.type === "month") {
    const first = new Date(year, month, 0);
    const target = new Date(startAt.year, startAt.month, 0);
    if (isBefore(target, first)) return "missed";
    if (isSameMonth(first, target)) return "in month";
    if (isSameMonth(addMonths(first, 1), target)) return "in next month";
    return startAt.year === year ? "in year" : "in next year";
  }

  // 時刻つきの場合は、時刻も比較する
  if (startAt.hours !== undefined) {
    const target = new Date(
      startAt.year,
      startAt.month,
      startAt.date,
      startAt.hours ?? 0,
      startAt.minutes ?? 0,
    );
    if (isBefore(target, now)) return "missed";
  }
  const target = new Date(startAt.year, startAt.month, startAt.date);
  if (isSameDay(target, now)) return "today";
  if (isBefore(target, now)) return "missed";
  if (isSameDay(target, addDays(now, 1))) return "tomorrow";
  if (isSameWeek(target, now)) return "in week";
  if (isSameWeek(target, addWeeks(now, 1))) return "in next week";
  if (isSameMonth(target, now)) return "in month";
  if (isSameMonth(target, addMonths(now, 1))) return "in next month";
  return startAt.year === year ? "in year" : "in next year";
};
