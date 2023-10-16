import { LocalDate } from "../howm/localDate.ts";

export type Key = `${number}-${string}-${string}`;

/** 日付ごとに一意なkeyを生成する */
export const toKey = (date: Date): Key =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${
    `${date.getDate()}`.padStart(2, "0")
  }`;

export const toLocalDate = (key: Key): LocalDate => {
  const [year, month, date] = key.split("-").map((s) => parseInt(s, 10));
  return { year, month, date };
};
