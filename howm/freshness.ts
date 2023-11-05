import { LocalDate, LocalDateTime, toDate } from "./localDate.ts";
import { Status } from "./status.ts";

/** 1日をミリ秒単位で表したもの */
const oneday = 60 * 60 * 24 * 1000;

export interface Freshness {
  /** howm記号 */
  status: Status;

  /** hown記号のオプション */
  speed?: number;

  /** 旬度計算用の起点となる日時 */
  refDate: LocalDate | LocalDateTime;
}

/** タスクの旬度を計算する
 *
 *  自分(@takker)用にtuningしてある。他の計算アルゴリズムにしたいときは、各自で別途作ること
 *
 *  @param freshness task
 *  @param now 現在日時
 *  @return taskの旬度
 */
export const calcFreshness = (freshness: Freshness, now: Date): number => {
  const start = toDate(freshness.refDate);
  const priority = (now.getTime() - start.getTime()) / oneday;
  start.setHours(0);
  start.setMinutes(0);

  switch (freshness.status) {
    case "done":
      // 常に最低
      return -Infinity;
    case "deadline":
      // 当日0になるよう上昇
      return priority / (freshness.speed ?? 1);
    case "todo":
      // 当日まで上昇
      return Math.min(priority / (freshness.speed ?? 1), 0);
    case "note":
      // 当日から下降
      return now.getTime() < start.getTime()
        ? -Infinity
        : -priority / (freshness.speed ?? 1);
    case "up-down": {
      const period = freshness.speed ?? 30;
      // 当日から下降と上昇を繰り返す
      return period * (-1 + Math.cos(Math.PI * 2 * priority / period));
    }
  }
};
