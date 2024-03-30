import {
  getWeek,
  getWeekYear,
  setWeek,
  startOfWeek,
} from "../deps/date-fns.ts";
import { LocalDate } from "../howm/localDate.ts";
import { zero } from "../zero.ts";

export type Key = `${number}-${string}-${string}`;
export type WeekKey = `${number}-w${string}`;

/** 日付ごとに一意なkeyを生成する */
export const toKey = (date: Date): Key =>
  `${date.getFullYear()}-${zero(date.getMonth() + 1)}-${zero(date.getDate())}`;
export const toLocalDate = (key: Key): LocalDate => {
  const [year, month, date] = key.split("-").map((s) => parseInt(s, 10));
  return { year, month, date };
};

/** 日付が属する週ごとに一意なkeyを生成する */
export const toWeekKey = (date: Date): WeekKey =>
  `${getWeekYear(date)}-w${zero(getWeek(date))}`;
export const toStartOfWeek = (key: WeekKey): Date => {
  const [year, week] = key.split("-w").map((s) => parseInt(s, 10));
  return startOfWeek(setWeek(new Date(year, 0, 1), week));
};
